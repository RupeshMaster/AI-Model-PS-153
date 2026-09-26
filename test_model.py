import torch
from world_model import NetworkWorldModel
from preprocess_cic_ids import process_data
import numpy as np

def test_trained_model():
    print("--- Testing the Trained World Model ---")
    
    # 1. Setup the Model Architecture exactly as we trained it
    input_size = 78
    hidden_size = 64
    num_layers = 1
    num_classes = 15 # Because we mapped the unique labels dynamically
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = NetworkWorldModel(input_size, hidden_size, num_layers, num_classes).to(device)
    
    # 2. Load the trained brain (the .pth file)
    try:
        model.load_state_dict(torch.load("c:/AI Model Training/trained_world_model.pth", weights_only=True))
        print("Successfully loaded 'trained_world_model.pth'!")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Put the model into Evaluation Mode (turns off training mechanics)
    model.eval()
    
    # 3. Load some test data
    # We will use a small slice of a different file (or the same one) just to see what it predicts
    TEST_FILE = "c:/AI Model Training/Cleaned_Data/clean_03-01-2018.csv"
    print(f"\nLoading test data from: {TEST_FILE}")
    test_loader = process_data(TEST_FILE, sample_size=500, seq_length=10)
    
    # 4. Make Predictions!
    print("\n--- Inference Results ---")
    
    # We don't need to calculate gradients for testing (saves memory & time)
    with torch.no_grad():
        # Get just one batch of data to test
        for sequences, labels in test_loader:
            sequences = sequences.to(device)
            labels = labels.to(device)
            
            # Ask the model to predict
            raw_outputs = model(sequences)
            
            # The raw outputs are logits. We use Softmax to turn them into Probabilities (0% to 100%)
            probabilities = torch.nn.functional.softmax(raw_outputs, dim=1)
            
            # Get the highest probability class
            _, predicted_classes = torch.max(probabilities, 1)
            
            # Let's print out the first 5 predictions in this batch
            for i in range(5):
                actual_label = labels[i].item()
                predicted_label = predicted_classes[i].item()
                
                # Get the confidence percentage of the prediction
                confidence = probabilities[i][predicted_label].item() * 100
                
                print(f"Sequence {i+1}:")
                print(f"  -> True Label: {actual_label}")
                print(f"  -> AI Prediction: {predicted_label} (Confidence: {confidence:.2f}%)")
                
                if actual_label == predicted_label:
                    print("  -> Result: CORRECT")
                else:
                    print("  -> Result: INCORRECT")
            
            break # We just want to test one batch for this demonstration

if __name__ == "__main__":
    test_trained_model()
