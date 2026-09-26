# AI World Model Pipeline Architecture

To ensure perfect reproducibility and transparency for the hackathon judges, this document outlines the exact end-to-end data pipeline from raw network captures to real-time LSTM sequence forecasting.

## 1. Data Ingestion (Raw CSVs)
The CIC-IDS-2018 dataset arrives as massive tabular CSV files containing network flows extracted from PCAPs.
- **Problem**: These files are too large for standard RAM (up to 10GB per file) and contain dirty data, Infinity values, and missing values.
- **Solution**: We implemented `clean_dataset_to_disk.py` which processes the raw CSVs in safe memory chunks (250,000 rows at a time). 

## 2. Feature Extraction & Alignment
To feed data into an AI, the feature dimensions must be perfectly locked.
- We standardized the input vector to exactly **78 network features** (e.g., `Flow Duration`, `Fwd Pkt Len Max`, `SYN Flag Cnt`).
- Any anomalous files missing columns (e.g., the `02-20-2018.csv` file which dropped a column mid-capture) are mathematically padded with zeros to ensure the strict `(78,)` shape requirement is met.
- **Sanitization**: All string `Infinity` values are mapped to numerical NaNs, which are subsequently filled with `0` to prevent gradient explosion during training.

## 3. Data Normalization
A neural network cannot process raw bytes when some features are in the billions and others are boolean `0/1`.
- We utilize `sklearn.preprocessing.MinMaxScaler` to compress all 78 dimensions into a strictly bounded `[0.0, 1.0]` tensor space.

## 4. Sequence Generation (The World Model Core)
Basic machine learning (like Logistic Regression) analyzes a single packet at $T=0$. It has no memory.
Our system builds a World Model by teaching the AI the concept of *Time*.
- We implemented a custom PyTorch `Dataset` (`CICIDSDataset`) which slides a window across the network traffic.
- Instead of returning a vector of shape `(78,)`, it returns a matrix of shape `(10, 78)`.
- This means the AI looks at the *state-transition* of the last 10 network events before making a decision, allowing it to understand the context of an anomaly.

## 5. Model Architecture & Training
- **Hardware**: Trained aggressively on a local NVIDIA RTX 4050 (GPU).
- **Architecture**: A 2-Layer Deep Long Short-Term Memory (LSTM) Recurrent Neural Network.
- **Capacity**: 128 Hidden State dimensions, terminating in a 16-class Linear Classifier.
- **Optimization**: Adam Optimizer running at `lr=0.001` minimizing `CrossEntropyLoss`.

## 6. Real-Time Inference & Forecasting
In the `app.py` Streamlit Dashboard:
1. The model ingests a 10-packet window dynamically.
2. It generates a probability distribution across 16 different MITRE ATT&CK stages.
3. **K-Step Simulation**: It analyzes the current rate of change in the hidden state and projects the threat probabilities for $T+1, T+2, T+3, T+4$.
4. **Explainability**: Using PyTorch auto-differentiation (Saliency Gradients), we calculate the exact derivative of the prediction with respect to the 78 input features to explain *why* the AI flagged the traffic in real-time.
