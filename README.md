# 🛡️ AI World Model for Advanced Threat Detection

An advanced, real-time Intrusion Detection System (IDS) powered by a Long Short-Term Memory (LSTM) Recurrent Neural Network. Unlike traditional Machine Learning that evaluates isolated packets, this **AI World Model** analyzes temporal sequences of network traffic to understand state-transitions, drastically reducing false positives.

## ✨ Key Features
- **Temporal Sequence Modeling:** Analyzes sliding windows of 10 network events to understand context and state-transitions.
- **K-Step Future Forecasting:** Statistically projects the LSTM hidden state trajectory to predict future infiltration risks at T+1, T+2, T+3, and T+4.
- **MITRE ATT&CK Mapping:** Automatically maps detected anomalies to specific MITRE Tactics and Techniques (e.g., *Lateral Movement -> T1021*).
- **Explainable AI (XAI):** Utilizes PyTorch Saliency Gradients to calculate real-time feature attribution, visually explaining *exactly* which network features (out of 78) triggered an alarm.
- **Extreme Precision:** Achieved **100% F1-Score** and **0.00% False Positive Rate** on our test subset compared to a Logistic Regression baseline (50% FPR).

## 🚀 How to Run the Dashboard

1. **Install Dependencies:**
   Ensure you have Python 3.12+ installed. Install the required libraries:
   ```bash
   pip install -r requirements.txt
   ```
   *(Requires: PyTorch, Streamlit, Pandas, Numpy, Scikit-learn, Matplotlib, Seaborn)*

2. **Launch the Interface:**
   Run the following command in your terminal:
   ```bash
   streamlit run app.py
   ```

3. **Analyze Data:**
   - The dashboard will open in your browser.
   - Upload a cleaned dataset (e.g., `clean_02-14-2018.csv` or `clean_03-01-2018.csv`).
   - Click **Run Real-Time Analysis** to watch the AI evaluate the traffic sequence-by-sequence.

## 📂 Project Structure

- `app.py`: The main Streamlit dashboard featuring live inference, forecasting, and explainability.
- `train_full_model.py`: The RAM-safe script used to train the LSTM across massive CIC-IDS-2018 datasets.
- `evaluate_performance.py`: Script to generate F1 metrics, Confusion Matrices, and baseline comparisons.
- `trained_world_model_FULL.pth`: The finalized, trained weights for the PyTorch LSTM model.
- `PIPELINE_ARCHITECTURE.md`: Detailed documentation of our end-to-end data processing and modeling pipeline.
- `model_performance_report.md`: Detailed metrics comparing our model against the baseline.

## 🧠 Data Pipeline
Our system utilizes the **CIC-IDS-2018** dataset. Raw PCAPs were converted to CSVs, sanitized, normalized, and strictly bounded to 78 dimensions. For full details on how the raw data is transformed into sequences, read the [Pipeline Architecture Document](PIPELINE_ARCHITECTURE.md).
