import torch
import torch.nn as nn
import numpy as np

class TemporalAttention(nn.Module):
    """
    Temporal Multi-Head Attention mechanism.
    Attends over time-windowed sequence observations (t-W to t) to identify
    which specific temporal events drive network state transitions and infiltration risk.
    """
    def __init__(self, hidden_size):
        super(TemporalAttention, self).__init__()
        self.hidden_size = hidden_size
        self.query = nn.Linear(hidden_size, hidden_size, bias=False)
        self.key = nn.Linear(hidden_size, hidden_size, bias=False)
        self.value = nn.Linear(hidden_size, hidden_size, bias=False)
        self.scale = np.sqrt(hidden_size)

    def forward(self, lstm_outputs):
        """
        Args:
            lstm_outputs: Tensor of shape [batch_size, seq_len, hidden_size]
        Returns:
            context_vector: Tensor of shape [batch_size, hidden_size]
            attention_weights: Tensor of shape [batch_size, seq_len]
        """
        # Query from the most recent hidden state (time t)
        Q = self.query(lstm_outputs[:, -1:, :])         # [batch, 1, hidden]
        K = self.key(lstm_outputs)                      # [batch, seq_len, hidden]
        V = self.value(lstm_outputs)                    # [batch, seq_len, hidden]

        # Scaled dot-product attention scores
        scores = torch.bmm(Q, K.transpose(1, 2)) / self.scale # [batch, 1, seq_len]
        attn_weights = torch.softmax(scores, dim=-1)           # [batch, 1, seq_len]

        # Context representation
        context = torch.bmm(attn_weights, V).squeeze(1)       # [batch, hidden]
        return context, attn_weights.squeeze(1)


class NetworkWorldModel(nn.Module):
    """
    AI World Model for Network Attack Forecasting (NTRO PS 26153).
    
    Learns internal causal simulation of network telemetry dynamics P(S_{t+1} | S_t)
    and enables K-step autoregressive forward simulation before an infiltration completes.
    
    Sub-systems:
      1. Sequence Dynamics Core: Deep LSTM capturing temporal state-transition history.
      2. Temporal Attention Layer: Interpretable attribution across sequence observations.
      3. Dynamics Transition Head: Predicts continuous future state vector S_{t+1} in R^{input_size}.
      4. Infiltration Probability Head: Estimates likelihood of security compromise.
      5. MITRE ATT&CK Phase Head: Maps trajectory to the 5 cyber kill chain stages.
      6. Fine-grained Classification Head: Granular 16-class attack categorisation.
    """
    def __init__(self, input_size=78, hidden_size=128, num_layers=2, num_phases=6, num_classes=16, dropout=0.2):
        super(NetworkWorldModel, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.num_phases = num_phases
        self.num_classes = num_classes

        # 1. Temporal Dynamics Backbone
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )

        # 2. Temporal Attention Layer
        self.attention = TemporalAttention(hidden_size)

        # 3. Head 1: Dynamics Transition Head P(S_{t+1} | S_t)
        # Predicts next telemetry state vector S_{t+1}
        self.dynamics_head = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.LayerNorm(hidden_size),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, input_size)
        )

        # 4. Head 2: Infiltration Risk Head (Probability of active/imminent infiltration)
        self.infiltration_head = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Linear(64, 1) # Raw logit for BCEWithLogitsLoss
        )

        # 5. Head 3: MITRE ATT&CK Kill Chain Phase Head
        # (0: Benign, 1: Recon, 2: Initial Access, 3: Lateral Movement, 4: C2, 5: Exfil/Impact)
        self.phase_head = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Linear(64, num_phases)
        )

        # 6. Head 4: Granular Attack Classification Head (16 specific classes)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        """
        Performs forward pass for a batch of sequence windows.
        
        Args:
            x: Input tensor of shape [batch_size, seq_len, input_size]
        Returns:
            next_state_pred: Predicted next state vector [batch_size, input_size]
            inf_risk_logit: Infiltration risk logit [batch_size, 1]
            phase_logits: MITRE ATT&CK stage logits [batch_size, num_phases]
            class_logits: Granular attack class logits [batch_size, num_classes]
            attn_weights: Temporal attention weights [batch_size, seq_len]
        """
        lstm_out, _ = self.lstm(x) # [batch, seq_len, hidden]

        # Apply temporal attention over the sequence
        context, attn_weights = self.attention(lstm_out) # [batch, hidden], [batch, seq_len]

        # Multi-head inference
        next_state_pred = self.dynamics_head(context)
        inf_risk_logit = self.infiltration_head(context)
        phase_logits = self.phase_head(context)
        class_logits = self.classifier(context)

        return next_state_pred, inf_risk_logit, phase_logits, class_logits, attn_weights

    def forward_rollout(self, initial_sequence, k_steps=4):
        """
        Executes true autoregressive K-step forward simulation of network environment dynamics.
        
        At step t, the World Model generates S_{t+1}, appends S_{t+1} to its sliding history,
        and repeats for K steps into the future, predicting evolving infiltration likelihood
        and MITRE ATT&CK kill chain progression before compromise occurs.
        
        Args:
            initial_sequence: Tensor of shape [1, seq_len, input_size] or [seq_len, input_size]
            k_steps: Number of forward simulation steps (e.g. 4)
        Returns:
            trajectory: List of dicts containing projected future states, probabilities,
                        MITRE phases, and confidence metrics for T+1, ..., T+K.
        """
        self.eval()
        with torch.no_grad():
            if initial_sequence.dim() == 2:
                curr_seq = initial_sequence.unsqueeze(0).clone()
            else:
                curr_seq = initial_sequence.clone()

            trajectory = []

            for step in range(1, k_steps + 1):
                next_state_pred, inf_logit, phase_logits, class_logits, attn = self.forward(curr_seq)

                inf_prob = torch.sigmoid(inf_logit).item() * 100.0
                phase_probs = torch.softmax(phase_logits, dim=-1).cpu().numpy()[0]
                pred_phase = int(np.argmax(phase_probs))
                
                class_probs = torch.softmax(class_logits, dim=-1).cpu().numpy()[0]
                pred_class = int(np.argmax(class_probs))

                trajectory.append({
                    "step": step,
                    "horizon": f"T+{step}",
                    "predicted_state": next_state_pred.cpu().numpy()[0],
                    "infiltration_probability": round(inf_prob, 2),
                    "predicted_phase_idx": pred_phase,
                    "phase_probabilities": phase_probs.tolist(),
                    "predicted_class_idx": pred_class,
                    "class_confidence": round(float(class_probs[pred_class]) * 100.0, 2),
                    "temporal_attention": attn.cpu().numpy()[0].tolist()
                })

                # Autoregressive slide: drop oldest observation, append newly synthesized state S_{t+step}
                next_state_bounded = torch.clamp(next_state_pred, 0.0, 1.0)
                curr_seq = torch.cat([curr_seq[:, 1:, :], next_state_bounded.unsqueeze(1)], dim=1)

            return trajectory
