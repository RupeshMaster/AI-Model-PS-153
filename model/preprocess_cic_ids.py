import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import torch
from torch.utils.data import Dataset, DataLoader
import time

class CICIDSDataset(Dataset):
    def __init__(self, X, y, seq_length=10):
        self.X = torch.tensor(X, dtype=torch.float32)
        
        # Convert string labels to integers (Sorted so the mapping is identical every time!)
        unique_labels = sorted(list(set(y)))
        self.label_map = {label: idx for idx, label in enumerate(unique_labels)}
        print(f"Label Mapping: {self.label_map}")
        
        y_int = [self.label_map[label] for label in y]
        self.y = torch.tensor(y_int, dtype=torch.long)
        
        self.seq_length = seq_length

    def __len__(self):
        # The number of available sequences
        return len(self.X) - self.seq_length

    def __getitem__(self, idx):
        # Return a sequence of states [S_t, S_{t+1}, ..., S_{t+seq_len-1}]
        seq_x = self.X[idx : idx + self.seq_length]
        # And the label of the *next* state, or just the label for the sequence
        # For predicting infiltration, we look at the label at the end of the sequence
        seq_y = self.y[idx + self.seq_length] 
        return seq_x, seq_y

def process_data(file_path, sample_size=10000, seq_length=10):
    print(f"--- Starting Processing for {file_path} ---")
    start_time = time.time()
    
    # 1. Load data (Using a sample size to keep this fast for demonstration)
    print(f"Loading {sample_size} rows...")
    df = pd.read_csv(file_path, nrows=sample_size)
    
    # Clean Column Names
    df.columns = df.columns.str.strip()
    
    # 2. Drop unnecessary columns
    cols_to_drop = ['Flow ID', 'Src IP', 'Dst IP', 'Timestamp']
    df = df.drop(columns=[col for col in cols_to_drop if col in df.columns], errors='ignore')
    
    # 3. Handle Infinity and NaN
    print("Cleaning Infinity and NaN values...")
    df = df.replace([np.inf, -np.inf], np.nan)
    df = df.dropna()
    
    # 4. Separate Features and Labels
    # CIC-IDS-2018 typically has 'Label' as the target
    if 'Label' not in df.columns:
        raise ValueError("Label column not found! Check dataset headers.")
        
    y = df['Label'].values
    X = df.drop(columns=['Label'])
    
    # Convert everything to numeric, which will turn 'Infinity' strings into np.inf
    X = X.apply(pd.to_numeric, errors='coerce')
    # Replace the newly created np.inf with NaN, then fill with 0
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0).values
    
    # 5. Normalize
    print("Normalizing features...")
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 6. Create PyTorch Dataset
    print(f"Creating Time Sequences (Length: {seq_length})...")
    dataset = CICIDSDataset(X_scaled, y, seq_length=seq_length)
    
    # 7. Create DataLoader
    dataloader = DataLoader(dataset, batch_size=32, shuffle=False)
    
    # Get one batch to verify
    for batch_x, batch_y in dataloader:
        print(f"\n--- Output Verification ---")
        print(f"Batch X (Inputs) shape: {batch_x.shape} -> (Batch Size, Sequence Length, Features)")
        print(f"Batch y (Labels) shape: {batch_y.shape} -> (Batch Size,)")
        print(f"Example sequence label: {batch_y[0].item()}")
        break
        
    print(f"Processing complete in {time.time() - start_time:.2f} seconds.")
    return dataloader

if __name__ == "__main__":
    # Test on one of the files in your directory
    TARGET_FILE = "c:/AI Model Training/CIC-IDS-2018/03-01-2018.csv"
    process_data(TARGET_FILE, sample_size=5000, seq_length=10)
