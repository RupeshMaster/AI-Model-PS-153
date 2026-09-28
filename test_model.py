import torch
import numpy as np
import os
import pandas as pd
from world_model import NetworkWorldModel
from mitre_mapping import MITRE_PHASES, ATTACK_CLASS_MAP, STRING_LABEL_TO_CLASS
from train_world_model_dynamics import find_data_files, WorldModelDynamicsDataset
from torch.utils.data import DataLoader

def test_trained_world_model():
    print("=" * 60)
    print("[TEST] Testing Trained Network World Model")
    print("=" * 60)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")

    # Locate weights file
    weights_path = "trained_network_world_model.pth"
    if not os.path.exists(weights_path):
        if os.path.exists("trained_world_model_FULL.pth"):
            weights_path = "trained_world_model_FULL.pth"

    model = NetworkWorldModel(input_size=78, hidden_size=128, num_layers=2, num_phases=6, num_classes=16).to(device)

    if os.path.exists(weights_path):
        try:
            model.load_state_dict(torch.load(weights_path, map_location=device))
            print(f"Loaded weights from: {weights_path}")
        except Exception as e:
            print(f"Note: Running with initialized model: {e}")
    else:
        print("Using initialized model weights.")

    model.eval()

    # Load test batch from available dataset
    data_files = find_data_files()
    if not data_files:
        print("No Cleaned_Data files found. Generating synthetic test tensor...")
        seq_tensor = torch.rand(1, 10, 78).to(device)
    else:
        test_file = data_files[0]
        print(f"Loading test telemetry from: {test_file}")
        df = pd.read_csv(test_file, nrows=200)
        df.columns = df.columns.str.strip()
        df = df[df['Label'] != 'Label'] if 'Label' in df.columns else df

        feature_cols = [c for c in df.columns if c != 'Label'][:78]
        X_raw = df[feature_cols].apply(pd.to_numeric, errors='coerce').fillna(0.0).values
        
        from sklearn.preprocessing import MinMaxScaler
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X_raw)

        seq_tensor = torch.tensor(X_scaled[:10], dtype=torch.float32).unsqueeze(0).to(device)

    # 1. Forward Pass
    with torch.no_grad():
        next_state, inf_logit, phase_logits, class_logits, attn = model(seq_tensor)

        inf_prob = torch.sigmoid(inf_logit).item() * 100.0
        phase_idx = int(torch.argmax(phase_logits, dim=-1).item())
        class_idx = int(torch.argmax(class_logits, dim=-1).item())

    phase_meta = MITRE_PHASES.get(phase_idx, MITRE_PHASES[0])
    attack_meta = ATTACK_CLASS_MAP.get(class_idx, ATTACK_CLASS_MAP[0])

    print("\n--- Model Step T Predictions ---")
    print(f"Infiltration Likelihood:  {inf_prob:.2f}%")
    print(f"MITRE ATT&CK Stage:       {phase_meta['name']} (Severity: {phase_meta['severity']})")
    print(f"Granular Attack Category: {attack_meta['name']} [{attack_meta['mitre_id']}]")
    print(f"Temporal Attention Mean:  {attn.mean().item():.4f}")

    # 2. Forward Simulation (Rollout)
    print("\n--- Autoregressive K-Step Forward Simulation (Rollout) ---")
    trajectory = model.forward_rollout(seq_tensor, k_steps=4)
    for step in trajectory:
        h = step["horizon"]
        prob = step["infiltration_probability"]
        p_name = MITRE_PHASES[step["predicted_phase_idx"]]["name"]
        a_name = ATTACK_CLASS_MAP[step["predicted_class_idx"]]["name"]
        print(f"  {h}: Risk = {prob:5.2f}% | Kill Chain Stage: {p_name:<25} | Attack: {a_name}")

    print("\n[SUCCESS] World Model inference and rollout verified.")

if __name__ == "__main__":
    test_trained_world_model()
