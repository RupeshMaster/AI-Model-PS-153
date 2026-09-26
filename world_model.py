import torch
import torch.nn as nn
import torch.optim as optim
from preprocess_cic_ids import process_data  # Importing our data loader!
import time

class NetworkWorldModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(NetworkWorldModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # 1. The Dynamics Learner (LSTM)
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        
        # 2. Infiltration Predictor
        self.classifier = nn.Linear(hidden_size, num_classes)
        
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm(x, (h0, c0))
        final_state = out[:, -1, :]
        prediction = self.classifier(final_state)
        return prediction

def train_model():
    # 1. Set Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"--- Starting Training on: {device} ---")
    
    # 2. Load the Dataset
    # We are using a sample of 10,000 rows to test the pipeline quickly
    # Now pointing directly to our beautifully cleaned dataset!
    TEST_FILE = "c:/AI Model Training/Cleaned_Data/clean_03-01-2018.csv"
    print("\nLoading data and creating sequences...")
    train_loader = process_data(TEST_FILE, sample_size=10000, seq_length=10)
    
    # 3. Model Hyperparameters
    input_size = 78       # Number of network features
    hidden_size = 64      # LSTM capacity
    num_layers = 1        # LSTM depth
    num_classes = 15      # We set this high enough to capture all unique string labels in CIC-IDS
    
    # 4. Initialize Model, Loss, and Optimizer
    model = NetworkWorldModel(input_size, hidden_size, num_layers, num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # 5. ACTUAL TRAINING LOOP
    num_epochs = 3
    print("\n--- Starting the Training Loop ---")
    for epoch in range(num_epochs):
        epoch_loss = 0.0
        start_time = time.time()
        
        model.train()
        for batch_idx, (sequences, labels) in enumerate(train_loader):
            # Move data to GPU or CPU
            sequences = sequences.to(device)
            labels = labels.to(device)
            
            # Forward pass (ask the model to predict)
            outputs = model(sequences)
            loss = criterion(outputs, labels)
            
            # Backward and optimize (learn from mistakes)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
            # Print progress every 50 batches
            if (batch_idx + 1) % 50 == 0:
                print(f"Epoch [{epoch+1}/{num_epochs}], Batch [{batch_idx+1}/{len(train_loader)}], Loss: {loss.item():.4f}")
                
        print(f"End of Epoch {epoch+1} | Total Epoch Loss: {epoch_loss:.4f} | Time: {time.time() - start_time:.2f}s")
        
    print("\nTraining Complete! Model has learned state dynamics.")
    
    # Save the trained model to disk
    torch.save(model.state_dict(), "c:/AI Model Training/trained_world_model.pth")
    print("Model saved to trained_world_model.pth")

if __name__ == "__main__":
    train_model()
