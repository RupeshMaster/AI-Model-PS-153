import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import Dataset, DataLoader
import glob
import os
import time

# --- 1. The Dataset Class ---
class CICIDSDataset(Dataset):
    def __init__(self, X, y, seq_length=10):
        self.X = torch.tensor(X, dtype=torch.float32)
        
        # In the full dataset, we want to map strings to integers.
        # We use a fixed map to ensure consistency across all chunks!
        self.label_map = {
            'Benign': 0, 'FTP-BruteForce': 1, 'SSH-Bruteforce': 2,
            'DoS attacks-GoldenEye': 3, 'DoS attacks-Slowloris': 4,
            'DoS attacks-SlowHTTPTest': 5, 'DoS attacks-Hulk': 6,
            'Brute Force -Web': 7, 'Brute Force -XSS': 8, 'SQL Injection': 9,
            'Infiltration': 10, 'Bot': 11, 'DDOS attack-LOIC-UDP': 12,
            'DDOS attack-HOIC': 13, 'DDoS attacks-LOIC-HTTP': 14,
            'Label': 15 # Catch-all for repeated headers
        }
        
        y_int = []
        for label in y:
            if label in self.label_map:
                y_int.append(self.label_map[label])
            else:
                y_int.append(0) # Default to Benign if unknown
                
        self.y = torch.tensor(y_int, dtype=torch.long)
        self.seq_length = seq_length

    def __len__(self):
        return len(self.X) - self.seq_length

    def __getitem__(self, idx):
        seq_x = self.X[idx : idx + self.seq_length]
        seq_y = self.y[idx + self.seq_length] 
        return seq_x, seq_y

# --- 2. The Model Architecture ---
class NetworkWorldModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(NetworkWorldModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.classifier = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        final_state = out[:, -1, :]
        return self.classifier(final_state)

# --- 3. The RAM-Safe Training Loop ---
def train_full_dataset():
    # Setup Device (Will use your RTX 4050!)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"--- 🚀 Starting FULL Training on: {device} ---")
    
    # Model Setup
    input_size = 78       
    hidden_size = 128     # Increased capacity for the full dataset
    num_layers = 2        # Deep LSTM
    num_classes = 16      # Total unique attacks + benign
    
    model = NetworkWorldModel(input_size, hidden_size, num_layers, num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # Get all cleaned files
    data_dir = "c:/AI Model Training/Cleaned_Data"
    all_files = glob.glob(os.path.join(data_dir, "*.csv"))
    
    CHUNK_SIZE = 250000 # Read 250k rows at a time to save RAM (16GB Safe)
    
    # Train for 1 global Epoch over all data
    print(f"Found {len(all_files)} files to process.")
    
    # Grab the exact 78 features from the first file to lock the input shape
    expected_features = list(pd.read_csv(all_files[0], nrows=0).columns)
    expected_features.remove('Label')
    
    for file_idx, file_path in enumerate(all_files):
        print(f"\n==========================================")
        print(f"📁 Opening File [{file_idx+1}/{len(all_files)}]: {os.path.basename(file_path)}")
        print(f"==========================================")
        
        chunk_iterator = pd.read_csv(file_path, chunksize=CHUNK_SIZE, low_memory=False)
        
        for chunk_idx, chunk in enumerate(chunk_iterator):
            start_time = time.time()
            
            # 1. Clean missing/broken data in this chunk
            if 'Label' not in chunk.columns:
                continue
            
            y = chunk['Label'].values
            
            # Force exact columns so weird files like '02-20' don't crash it
            missing_cols = [col for col in expected_features if col not in chunk.columns]
            for col in missing_cols:
                chunk[col] = 0 # Fill missing features with 0 if any
                
            X = chunk[expected_features].copy()
            X = X.apply(pd.to_numeric, errors='coerce').replace([np.inf, -np.inf], np.nan).fillna(0).values
            
            # 2. Normalize
            scaler = MinMaxScaler()
            X_scaled = scaler.fit_transform(X)
            
            # 3. Create Sequences
            dataset = CICIDSDataset(X_scaled, y, seq_length=10)
            
            # Skip if chunk is too small
            if len(dataset) <= 0:
                continue
                
            dataloader = DataLoader(dataset, batch_size=256, shuffle=False) # Large batch size for GPU
            
            # 4. Train the chunk
            model.train()
            chunk_loss = 0.0
            
            for sequences, labels in dataloader:
                sequences, labels = sequences.to(device), labels.to(device)
                
                optimizer.zero_grad()
                outputs = model(sequences)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
                chunk_loss += loss.item()
                
            avg_loss = chunk_loss / len(dataloader)
            print(f"  -> Processed Chunk {chunk_idx+1} ({len(chunk)} rows) | Loss: {avg_loss:.4f} | Time: {time.time()-start_time:.1f}s")
        
        # Save model progress after every file just in case!
        torch.save(model.state_dict(), "c:/AI Model Training/trained_world_model_FULL.pth")
        print(f"💾 Checkpoint saved after {os.path.basename(file_path)}")

    print("\n✅ FULL DATASET TRAINING COMPLETE!")
    print("Final model saved to 'trained_world_model_FULL.pth'")

if __name__ == "__main__":
    train_full_dataset()
