# 🛡️ AI World Model for Advanced Threat Detection

An advanced, real-time Intrusion Detection System (IDS) powered by a Deep Long Short-Term Memory (LSTM) Recurrent Neural Network. 

Unlike traditional Machine Learning classifiers (like Random Forests or Logistic Regression) that evaluate isolated packets without context, this **AI World Model** analyzes continuous *temporal sequences* of network traffic. By understanding state-transitions over time, it can accurately forecast threats and drastically reduce false positives.

---

## ✨ Detailed Features

### 1. Temporal Sequence Modeling (The "World Model")
Traditional models look at packet $T=0$ and guess the threat. Our LSTM groups network traffic into **sliding windows of 10 events**. By passing a matrix of `[10 packets × 78 features]` into the neural network, the AI acts as a true "World Model" that understands the *state* of the network and how traffic is evolving over time.

### 2. K-Step Future Forecasting
Rather than just reporting that an attack is happening *now*, the system mathematically projects the LSTM's hidden state trajectory. When anomalous traffic begins, the UI forecasts the infiltration risk at **T+1, T+2, T+3, and T+4**, allowing network administrators to act *before* a breach fully materializes.

### 3. Explainable AI (XAI) via Saliency Gradients
"Black box" AI is dangerous in cybersecurity. We integrated **PyTorch Auto-Differentiation (Saliency Gradients)**. When the AI detects an attack, it instantly runs a backward pass to calculate the derivative of its decision against the 78 input features. It plots a real-time bar chart showing the exact Top 5 features (e.g., `Flow Duration`, `SYN Flag Cnt`) that triggered the alarm.

### 4. Automated MITRE ATT&CK Mapping
The model doesn't just say "Attack Detected". It classifies the threat into one of 15 specific categories and maps it directly to the **MITRE ATT&CK framework**. For example, if it detects FTP BruteForce traffic, it automatically alerts the dashboard with: `Tactic: Initial Access | Technique: T1110 - Brute Force`.

### 5. Extreme Precision vs Baselines
During evaluation, a Logistic Regression baseline model suffered a **50% False Positive Rate** when analyzing normal background traffic because it lacked context. Our LSTM achieved a **0.00% False Positive Rate** and a **100% F1-Score** on the same subset.

---

## 🏗️ Architecture & How It Was Made

### 1. The Dataset
The model was trained on the massive **CIC-IDS-2018** dataset, which contains terabytes of PCAP files and CSVs capturing modern attack profiles.

### 2. The Data Pipeline
Because the dataset is so large (some CSVs are over 10GB), standard Python Pandas would crash the RAM. We built a custom data engineering pipeline:
- `clean_dataset_to_disk.py`: Reads the massive CSVs in safe memory chunks (250,000 rows at a time). It sanitizes infinite values, fills missing fields, and normalizes all bytes.
- **Feature Locking:** The data is strictly bounded to exactly 78 network features. Missing columns are mathematically padded with zeros.

### 3. The Neural Network
The core of the system is written in PyTorch. 
- **Input Size:** 78
- **Hidden Size:** 128
- **Layers:** 2-Layer LSTM
- **Output:** 16 Classes (15 Attack Types + 1 Benign)

---

## 🚀 Installation & Setup (How to Use It)

Follow these steps to run the interactive dashboard on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/RupeshMaster/AI-Model-PS-153.git
   cd AI-Model-PS-153
   ```

2. **Install Dependencies:**
   Ensure you have **Python 3.12+** installed, then run:
   ```bash
   pip install -r requirements.txt
   ```
   *(This installs PyTorch, Streamlit, Pandas, Numpy, Scikit-learn, Matplotlib, and Seaborn).*

3. **Launch the Interface:**
   Run the Streamlit app from your terminal:
   ```bash
   streamlit run app.py
   ```

4. **Analyze Data in Real-Time:**
   - The dashboard will automatically open in your web browser.
   - You must upload a sanitized CSV dataset (with 78 features). 
   - Click **Run Real-Time Analysis**.
   - Watch the dashboard process the sliding sequences, map MITRE tactics, forecast future threats, and explain its decisions using XAI.

---

## 🏋️ How to Train the Model from Scratch

If you want to completely retrain the AI World Model from the ground up, you will need the raw CSV files.

**Prerequisites:**
- A CUDA-compatible NVIDIA GPU (Highly recommended. We trained on an RTX 4050).
- The CIC-IDS-2018 CSV datasets placed inside a `Cleaned_Data/` directory.

**Training Steps:**
1. **Clean the Data:** 
   Run `python clean_dataset_to_disk.py` to sanitize your raw CSVs into memory-safe chunks.
2. **Train the Model:**
   Run `python train_full_model.py`. 
   - This script utilizes a custom PyTorch `Dataset` (`CICIDSDataset`) which slides a 10-packet window over your CSVs.
   - It streams data directly from the hard drive to the GPU, preventing RAM crashes.
   - It will automatically save `trained_world_model_FULL.pth` when finished.
3. **Evaluate the Model:**
   Run `python evaluate_performance.py`.
   - This will generate a confusion matrix and a markdown report comparing your newly trained LSTM against a Logistic Regression baseline.
