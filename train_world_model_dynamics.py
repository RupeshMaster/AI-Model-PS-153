import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import os
import glob
import time
import json

from world_model import NetworkWorldModel
from mitre_mapping import ATTACK_CLASS_MAP, STRING_LABEL_TO_CLASS

class WorldModelDynamicsDataset(Dataset):
    """
    Supervised Dynamics Dataset for Network World Models.
    Each item yields:
      - seq_x: Window of past 10 network telemetry states [S_{t-9}, ..., S_t]
      - target_next_state: Ground-truth next state vector S_{t+1} (R^78)
      - target_inf: Binary infiltration label (0=Benign, 1=Infiltration/Attack)
      - target_phase: MITRE ATT&CK kill chain stage index (0 to 5)
      - target_class: Specific attack class index (0 to 15)
    """
    def __init__(self, X, y_strings, seq_length=10):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.seq_length = seq_length

        y_inf = []
        y_phase = []
        y_class = []

        for label in y_strings:
            cls_idx = STRING_LABEL_TO_CLASS.get(str(label).strip(), 0)
            meta = ATTACK_CLASS_MAP[cls_idx]
            y_class.append(cls_idx)
            y_phase.append(meta["phase_idx"])
            y_inf.append(0.0 if cls_idx == 0 else 1.0)

        self.y_class = torch.tensor(y_class, dtype=torch.long)
        self.y_phase = torch.tensor(y_phase, dtype=torch.long)
        self.y_inf = torch.tensor(y_inf, dtype=torch.float32)

    def __len__(self):
        return max(0, len(self.X) - self.seq_length)

    def __getitem__(self, idx):
        seq_x = self.X[idx : idx + self.seq_length]
        target_next_state = self.X[idx + self.seq_length]
        target_inf = self.y_inf[idx + self.seq_length]
        target_phase = self.y_phase[idx + self.seq_length]
        target_class = self.y_class[idx + self.seq_length]

        return seq_x, target_next_state, target_inf, target_phase, target_class


def find_data_files():
    possible_dirs = [
        "Cleaned_Data/Cleaned_Data",
        "Cleaned_Data",
        "../Cleaned_Data",
        "c:/AI Model Training/Cleaned_Data"
    ]
    for d in possible_dirs:
        files = glob.glob(os.path.join(d, "*.csv"))
        if files:
            print(f"Found {len(files)} CSV files in: {d}")
            return files
    return []


def train_world_model(sample_per_file=10000, num_epochs=3, batch_size=256, lr=0.001):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("=" * 60)
    print(f"[START] Training Balanced AI Network World Model on: {device}")
    print("=" * 60)

    data_files = find_data_files()
    if not data_files:
        raise FileNotFoundError("Could not find any Cleaned_Data CSV files!")

    sample_df = pd.read_csv(data_files[0], nrows=5)
    feature_cols = [c.strip() for c in sample_df.columns if c.strip() != 'Label']
    input_size = len(feature_cols)
    print(f"Locked telemetry state feature vector size: {input_size}")

    # Build a unified multi-attack dataset sampled across all attack files
    print("\nAssembling balanced multi-attack telemetry stream across all files...")
    all_dfs = []
    for f in data_files:
        fname = os.path.basename(f)
        try:
            chunk = pd.read_csv(f, nrows=sample_per_file, low_memory=False)
            chunk.columns = chunk.columns.str.strip()
            if 'Label' in chunk.columns:
                chunk = chunk[chunk['Label'] != 'Label']
                for col in feature_cols:
                    if col not in chunk.columns:
                        chunk[col] = 0.0
                all_dfs.append(chunk)
                print(f"  + Ingested {len(chunk)} rows from {fname} (Classes: {list(chunk['Label'].unique())[:3]})")
        except Exception as e:
            print(f"  Warning reading {fname}: {e}")

    full_df = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal unified training events: {len(full_df)} across {full_df['Label'].nunique()} attack profiles.")

    X_raw = full_df[feature_cols].apply(pd.to_numeric, errors='coerce').replace([np.inf, -np.inf], np.nan).fillna(0.0).values
    y_raw = full_df['Label'].values

    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X_raw)

    dataset = WorldModelDynamicsDataset(X_scaled, y_raw, seq_length=10)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, drop_last=True)
    print(f"Total batches per epoch: {len(dataloader)}")

    # Instantiate model
    model = NetworkWorldModel(
        input_size=input_size,
        hidden_size=128,
        num_layers=2,
        num_phases=6,
        num_classes=16,
        dropout=0.2
    ).to(device)

    criterion_dynamics = nn.MSELoss()
    criterion_infiltration = nn.BCEWithLogitsLoss()
    criterion_phase = nn.CrossEntropyLoss()
    criterion_class = nn.CrossEntropyLoss()

    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=1)

    total_training_start = time.time()

    for epoch in range(num_epochs):
        epoch_start = time.time()
        running_dyn_loss = 0.0
        running_inf_loss = 0.0
        running_phase_loss = 0.0
        running_class_loss = 0.0
        correct_inf = 0
        total_samples = 0

        model.train()

        for batch_idx, (seq_x, tgt_next, tgt_inf, tgt_phase, tgt_class) in enumerate(dataloader):
            seq_x = seq_x.to(device)
            tgt_next = tgt_next.to(device)
            tgt_inf = tgt_inf.to(device)
            tgt_phase = tgt_phase.to(device)
            tgt_class = tgt_class.to(device)

            optimizer.zero_grad()

            pred_next, pred_inf_logit, pred_phase_logits, pred_class_logits, _ = model(seq_x)

            # 1. State Transition Dynamics Loss P(S_{t+1} | S_t)
            loss_dyn = criterion_dynamics(pred_next, tgt_next)

            # 2. Infiltration Risk Loss
            loss_inf = criterion_infiltration(pred_inf_logit, tgt_inf.unsqueeze(1))

            # 3. MITRE ATT&CK Phase Loss
            loss_phase = criterion_phase(pred_phase_logits, tgt_phase)

            # 4. Attack Class Loss
            loss_class = criterion_class(pred_class_logits, tgt_class)

            # Composite Loss
            total_loss = (1.5 * loss_dyn) + (2.0 * loss_inf) + (1.0 * loss_phase) + (1.0 * loss_class)

            total_loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            running_dyn_loss += loss_dyn.item()
            running_inf_loss += loss_inf.item()
            running_phase_loss += loss_phase.item()
            running_class_loss += loss_class.item()

            # Track accuracy
            inf_preds = (torch.sigmoid(pred_inf_logit).squeeze(1) >= 0.5).float()
            correct_inf += (inf_preds == tgt_inf).sum().item()
            total_samples += len(tgt_inf)

            if (batch_idx + 1) % 50 == 0 or (batch_idx + 1) == len(dataloader):
                print(f"  [Epoch {epoch+1}/{num_epochs}] Batch [{batch_idx+1}/{len(dataloader)}] | "
                      f"Dyn MSE: {loss_dyn.item():.4f} | "
                      f"Inf BCE: {loss_inf.item():.4f} | "
                      f"Inf Acc: {100.0 * correct_inf / total_samples:.2f}% | "
                      f"Phase CE: {loss_phase.item():.4f} | "
                      f"Class CE: {loss_class.item():.4f}")

        avg_dyn = running_dyn_loss / len(dataloader)
        avg_inf = running_inf_loss / len(dataloader)
        avg_phase = running_phase_loss / len(dataloader)
        avg_class = running_class_loss / len(dataloader)
        acc_inf = 100.0 * correct_inf / total_samples

        scheduler.step(avg_dyn + avg_inf)
        print(f"\n[DONE] Epoch {epoch+1} in {time.time() - epoch_start:.1f}s | "
              f"Dyn MSE: {avg_dyn:.4f} | Inf Acc: {acc_inf:.2f}% | Phase CE: {avg_phase:.4f}")

    print("=" * 60)
    print(f"[COMPLETE] World Model Training Finished in {time.time() - total_training_start:.1f}s")
    print("=" * 60)

    save_path = "trained_network_world_model.pth"
    torch.save(model.state_dict(), save_path)
    print(f"Saved complete World Model checkpoint to: {save_path}")

    metadata = {
        "model_type": "NetworkWorldModel",
        "input_features": input_size,
        "hidden_size": 128,
        "num_layers": 2,
        "num_mitre_phases": 6,
        "num_classes": 16,
        "seq_length": 10,
        "forward_simulation_supported": True,
        "features": feature_cols,
        "training_date": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open("world_model_meta.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
    print("Saved 'world_model_meta.json'")

    return model

if __name__ == "__main__":
    train_world_model()
