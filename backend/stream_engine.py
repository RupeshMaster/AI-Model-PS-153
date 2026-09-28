import os
import sys
import time
import json
import torch
import numpy as np
import pandas as pd
from typing import Optional, Dict, Any, List

# Add parent directory and model directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
for p in [BASE_DIR, MODEL_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

# pyrefly: ignore [missing-import]
from world_model import NetworkWorldModel
# pyrefly: ignore [missing-import]
from mitre_mapping import MITRE_PHASES, ATTACK_CLASS_MAP

class TelemetryStreamEngine:
    """
    Real-time streaming and inference engine for the AI Network World Model.
    Maintains telemetry stream state, sliding sequence windows, forward rollouts,
    and gradient-based feature attribution.
    """
    def __init__(self, weights_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.input_size = 78
        self.seq_length = 10
        self.k_steps = 4
        self.is_playing = False
        self.speed = 1.0  # Multiplier: 0.5x, 1x, 2x, 5x
        self.current_index = 0
        self.step_delay = 0.08  # Base delay in seconds
        
        # Load Model
        self.model = NetworkWorldModel(
            input_size=self.input_size,
            hidden_size=128,
            num_layers=2,
            num_phases=6,
            num_classes=16
        ).to(self.device)

        # Locate weights file
        if not weights_path:
            candidates = [
                os.path.join(MODEL_DIR, "trained_network_world_model.pth"),
                os.path.join(BASE_DIR, "trained_network_world_model.pth"),
                os.path.join(BASE_DIR, "trained_world_model_FULL.pth")
            ]
            for c in candidates:
                if os.path.exists(c):
                    weights_path = c
                    break

        self.weights_loaded = False
        if weights_path and os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.weights_loaded = True
                self.loaded_weights_path = weights_path
                print(f"[STREAM ENGINE] Loaded weights from: {weights_path}")
            except Exception as e:
                print(f"[STREAM ENGINE] Failed loading weights: {e}")
        
        self.model.eval()

        # Telemetry Data State
        self.df: Optional[pd.DataFrame] = None
        self.feature_cols: List[str] = []
        self.X_scaled: Optional[np.ndarray] = None
        self.labels: Optional[np.ndarray] = None
        self.total_events = 0
        self.flagged_flows: List[Dict[str, Any]] = []
        self.history_risks: List[float] = []

        # Auto-load default dataset if available
        self._load_default_telemetry()

    def _load_default_telemetry(self):
        """Attempts to load a default evaluation file from Cleaned_Data."""
        possible_dirs = [
            os.path.join(BASE_DIR, "Cleaned_Data", "Cleaned_Data"),
            os.path.join(BASE_DIR, "Cleaned_Data")
        ]
        for d in possible_dirs:
            if os.path.exists(d):
                files = [f for f in os.listdir(d) if f.endswith(".csv")]
                if files:
                    default_path = os.path.join(d, files[0])
                    self.load_dataset(default_path, nrows=5000)
                    break

    def load_dataset(self, file_path_or_buffer, nrows: int = 5000, source_name: str = "telemetry.csv") -> Dict[str, Any]:
        """
        Loads and sanitizes network flow dataset for real-time simulation.
        Standardizes features to 78 dimensions and bounds into [0, 1].
        """
        try:
            self.df = pd.read_csv(file_path_or_buffer, nrows=nrows, low_memory=False)
            self.df.columns = self.df.columns.str.strip()
            
            if 'Label' in self.df.columns:
                self.df = self.df[self.df['Label'] != 'Label']
                self.labels = self.df['Label'].values
            else:
                self.labels = np.array(["Benign"] * len(self.df))

            # 78 Features alignment
            self.feature_cols = [c for c in self.df.columns if c != 'Label']
            if len(self.feature_cols) < self.input_size:
                for i in range(len(self.feature_cols), self.input_size):
                    col_name = f"Feature_Pad_{i}"
                    self.df[col_name] = 0.0
                    self.feature_cols.append(col_name)
            elif len(self.feature_cols) > self.input_size:
                self.feature_cols = self.feature_cols[:self.input_size]

            X_raw = self.df[self.feature_cols].apply(pd.to_numeric, errors='coerce').replace([np.inf, -np.inf], np.nan).fillna(0.0).values
            
            # Simple MinMax scaling [0, 1]
            denom = (X_raw.max(axis=0) - X_raw.min(axis=0))
            denom[denom == 0] = 1.0
            self.X_scaled = (X_raw - X_raw.min(axis=0)) / denom

            self.total_events = len(self.X_scaled)
            self.source_name = source_name
            self.current_index = 0
            self.flagged_flows = []
            self.history_risks = []
            self.is_playing = False

            print(f"[STREAM ENGINE] Ingested {self.total_events} events with {len(self.feature_cols)} features from {source_name}")
            return {
                "status": "success",
                "total_events": self.total_events,
                "features_count": len(self.feature_cols),
                "source": source_name
            }
        except Exception as e:
            print(f"[STREAM ENGINE] Error loading dataset: {e}")
            return {"status": "error", "message": str(e)}

    def peek_frame(self) -> Optional[Dict[str, Any]]:
        """Computes current frame without advancing index (useful on connect)."""
        return self._compute_frame(advance=False)

    def next_frame(self) -> Optional[Dict[str, Any]]:
        """Advances the simulation stream by 1 step and computes frame."""
        return self._compute_frame(advance=True)

    def _compute_frame(self, advance: bool = True) -> Optional[Dict[str, Any]]:
        """
        Executes:
          1. Step T inference (Infiltration, MITRE Stage, Attention)
          2. Top 5 gradient attribution (Explainability)
          3. K-Step Autoregressive Forward Rollout (Future Predictions)
        """
        if self.X_scaled is None or self.total_events < self.seq_length:
            return None

        is_completed = False
        if self.current_index + self.seq_length >= self.total_events:
            self.current_index = max(0, self.total_events - self.seq_length)
            self.is_playing = False
            is_completed = True

        idx = self.current_index
        seq = self.X_scaled[idx : idx + self.seq_length]
        
        # Prepare tensor with gradient tracking for explainability
        seq_tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(self.device)
        seq_tensor.requires_grad_(True)

        start_time = time.time()

        # 1. Forward Pass
        next_state_pred, inf_logit, phase_logits, class_logits, attn_weights = self.model(seq_tensor)
        inference_latency_ms = (time.time() - start_time) * 1000.0

        inf_prob = torch.sigmoid(inf_logit).item() * 100.0
        phase_probs = torch.softmax(phase_logits, dim=-1).detach().cpu().numpy()[0]
        class_probs = torch.softmax(class_logits, dim=-1).detach().cpu().numpy()[0]

        pred_phase_idx = int(np.argmax(phase_probs))
        pred_class_idx = int(np.argmax(class_probs))

        # 2. XAI Saliency Gradients (Top 5 Features)
        try:
            self.model.zero_grad()
            inf_logit.backward(retain_graph=True)
            if seq_tensor.grad is not None:
                saliency = seq_tensor.grad.abs().sum(dim=1).squeeze(0).cpu().numpy()
                top_indices = np.argsort(saliency)[-5:][::-1]
                top_features = [
                    {"feature": self.feature_cols[i], "importance": round(float(saliency[i]), 4)}
                    for i in top_indices
                ]
            else:
                top_features = []
        except Exception:
            top_features = []

        # 3. Autoregressive K-Step Forward Rollout
        trajectory = self.model.forward_rollout(seq_tensor.detach(), k_steps=self.k_steps)

        # 4. Formulate Threat Context & Flagging
        phase_meta = MITRE_PHASES.get(pred_phase_idx, MITRE_PHASES[0])
        attack_meta = ATTACK_CLASS_MAP.get(pred_class_idx, ATTACK_CLASS_MAP[0])

        current_label = self.labels[idx + self.seq_length - 1] if self.labels is not None else "Unknown"

        stride = max(1, int(self.speed))

        if advance:
            self.history_risks.append(round(inf_prob, 2))
            if len(self.history_risks) > 100:
                self.history_risks.pop(0)

            # Track flagged anomaly flow
            if inf_prob >= 35.0 or pred_phase_idx > 0:
                flagged_item = {
                    "id": f"FL-{min(self.total_events, idx + self.seq_length)}",
                    "event_index": min(self.total_events, idx + self.seq_length),
                    "timestamp": time.strftime("%H:%M:%S"),
                    "ground_truth_label": str(current_label),
                    "predicted_attack": attack_meta["name"],
                    "mitre_id": attack_meta["mitre_id"],
                    "mitre_phase": phase_meta["name"],
                    "severity": phase_meta["severity"],
                    "infiltration_risk": round(inf_prob, 2),
                    "key_anomaly": top_features[0]["feature"] if top_features else "Anomalous Flow"
                }
                self.flagged_flows.insert(0, flagged_item)
                if len(self.flagged_flows) > 50:
                    self.flagged_flows.pop()

            # Advance stream pointer by stride according to selected stream speed
            if self.current_index + self.seq_length + stride >= self.total_events:
                self.current_index = max(0, self.total_events - self.seq_length)
                self.is_playing = False
                is_completed = True
            else:
                self.current_index += stride

        # DEFCON Status Calculation
        if inf_prob >= 75.0 or pred_phase_idx in [3, 4, 5]:
            defcon_level = 1
            defcon_status = "CRITICAL: IMMINENT INFILTRATION / IMPACT"
            defcon_color = "#FF0055"
        elif inf_prob >= 40.0 or pred_phase_idx in [1, 2]:
            defcon_level = 3
            defcon_status = "ELEVATED: ACTIVE PROBING / INITIAL ACCESS"
            defcon_color = "#FFB800"
        else:
            defcon_level = 5
            defcon_status = "NORMAL: BENIGN TELEMETRY BASELINE"
            defcon_color = "#00FF66"

        frame = {
            "source_name": getattr(self, "source_name", "telemetry.csv"),
            "is_playing": self.is_playing,
            "is_completed": is_completed,
            "speed": self.speed,
            "stride": stride,
            "k_steps": self.k_steps,
            "event_index": min(self.total_events, idx + self.seq_length),
            "total_events": self.total_events,
            "timestamp": time.strftime("%H:%M:%S"),
            "inference_latency_ms": round(inference_latency_ms, 2),
            "defcon": {
                "level": defcon_level,
                "status": defcon_status,
                "color": defcon_color
            },
            "step_t": {
                "infiltration_probability": round(inf_prob, 2),
                "predicted_phase_idx": pred_phase_idx,
                "phase_name": phase_meta["name"],
                "phase_severity": phase_meta["severity"],
                "predicted_class_idx": pred_class_idx,
                "attack_name": attack_meta["name"],
                "mitre_id": attack_meta["mitre_id"],
                "mitre_tactic": attack_meta["mitre_tactic"],
                "mitre_technique": attack_meta["mitre_technique"],
                "recommended_action": attack_meta["recommended_action"],
                "ground_truth_label": str(current_label)
            },
            "trajectory": trajectory,
            "history_risks": list(self.history_risks) if self.history_risks else [round(inf_prob, 2)],
            "temporal_attention": [round(float(w), 4) for w in attn_weights.detach().cpu().numpy()[0]],
            "top_features": top_features,
            "latest_flagged_flow": self.flagged_flows[0] if self.flagged_flows else None
        }

        def to_serializable(val):
            if isinstance(val, np.ndarray):
                return val.tolist()
            if isinstance(val, (np.floating, float)):
                return float(val)
            if isinstance(val, (np.integer, int)):
                return int(val)
            if isinstance(val, dict):
                return {k: to_serializable(v) for k, v in val.items()}
            if isinstance(val, (list, tuple)):
                return [to_serializable(v) for v in val]
            return val

        return to_serializable(frame)

    def set_playback(self, is_playing: bool):
        self.is_playing = is_playing

    def set_speed(self, speed: float):
        self.speed = max(0.5, min(20.0, float(speed)))

    def set_horizon(self, k_steps: int):
        self.k_steps = max(2, min(8, k_steps))

    def reset_stream(self):
        self.current_index = 0
        self.history_risks = []
        self.flagged_flows = []
        self.is_playing = False
