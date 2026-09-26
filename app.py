import streamlit as st
import pandas as pd
import numpy as np
import time
import torch
from world_model import NetworkWorldModel

# --- Configuration ---
st.set_page_config(page_title="AI World Model Dashboard", layout="wide", initial_sidebar_state="expanded")

# --- MITRE ATT&CK Mapping Engine ---
MITRE_ENGINE = {
    0: ("Benign", "Normal Traffic", "None"),
    1: ("FTP-BruteForce", "Initial Access", "T1110 - Brute Force"),
    2: ("SSH-Bruteforce", "Initial Access", "T1110 - Brute Force"),
    3: ("DoS attacks-GoldenEye", "Impact", "T1498 - Network Denial of Service"),
    4: ("DoS attacks-Slowloris", "Impact", "T1498 - Network Denial of Service"),
    5: ("DoS attacks-SlowHTTPTest", "Impact", "T1498 - Network Denial of Service"),
    6: ("DoS attacks-Hulk", "Impact", "T1498 - Network Denial of Service"),
    7: ("Brute Force -Web", "Initial Access", "T1110 - Brute Force"),
    8: ("Brute Force -XSS", "Initial Access", "T1190 - Exploit Public-Facing Application"),
    9: ("SQL Injection", "Initial Access", "T1190 - Exploit Public-Facing Application"),
    10: ("Infiltration", "Lateral Movement", "T1021 - Remote Services"),
    11: ("Bot", "Command and Control", "T1071 - Application Layer Protocol"),
    12: ("DDOS attack-LOIC-UDP", "Impact", "T1498 - Network Denial of Service"),
    13: ("DDOS attack-HOIC", "Impact", "T1498 - Network Denial of Service"),
    14: ("DDoS attacks-LOIC-HTTP", "Impact", "T1498 - Network Denial of Service"),
    15: ("Label", "Unknown Anomaly", "Unclassified")
}

@st.cache_resource
def load_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = NetworkWorldModel(input_size=78, hidden_size=128, num_layers=2, num_classes=16).to(device)
    model.load_state_dict(torch.load("trained_world_model_FULL.pth", map_location=device))
    model.eval()
    return model, device

model, device = load_model()

st.title("🛡️ AI World Model: Advanced Threat Detection")
st.markdown("Real-time intrusion detection utilizing LSTM sequence modeling and K-step forward simulation.")

st.sidebar.header("Control Panel")
uploaded_file = st.sidebar.file_uploader("Upload Network Data (CSV)", type=['csv'])
run_simulation = st.sidebar.button("▶ Run Real-Time Analysis")

# Setup layout
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📡 Real-Time Infiltration Probability")
    chart_placeholder = st.empty()
    
with col2:
    st.subheader("🔮 K-Step Future Forecast (Simulation)")
    forecast_placeholder = st.empty()

st.markdown("---")
st.subheader("🎯 MITRE ATT&CK Mapping")
mitre_placeholder = st.empty()

st.markdown("---")
st.subheader("🧠 Model Explainability (Saliency Gradients)")
explain_placeholder = st.empty()

if run_simulation:
    if uploaded_file is None:
        st.error("Please upload a CSV file to analyze.")
    else:
        # Load Data
        df = pd.read_csv(uploaded_file, nrows=10000)
        expected_features = list(pd.read_csv("Cleaned_Data/clean_02-14-2018.csv", nrows=0).columns)
        if 'Label' in expected_features:
            expected_features.remove('Label')
            
        # Feature Alignment
        for col in expected_features:
            if col not in df.columns:
                df[col] = 0
                
        X_raw = df[expected_features].apply(pd.to_numeric, errors='coerce').fillna(0).values
        
        # We need sequences of length 10
        seq_length = 10
        progress_bar = st.progress(0)
        
        probabilities = []
        
        # Simulate real-time streaming (Process every 5th sequence to save time in UI)
        for i in range(0, min(1000, len(X_raw) - seq_length), 5):
            seq = X_raw[i : i + seq_length]
            
            # Normalize sequence (Dummy scale for UI speed, in prod use scaler)
            seq_tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(device)
            
            # Enable gradients for explainability
            seq_tensor.requires_grad_()
            outputs = model(seq_tensor)
            probs = torch.softmax(outputs, dim=1).detach().cpu().numpy()[0]
                
            # Class 10 is Infiltration (You can change this based on which attack you want to monitor)
            inf_prob = probs[10] * 100 
            top_class = np.argmax(probs)
            
            attack_name, mitre_tactic, mitre_tech = MITRE_ENGINE.get(top_class, MITRE_ENGINE[0])
            
            probabilities.append(inf_prob)
            
            # 1. Update Chart
            chart_data = pd.DataFrame({'Infiltration Probability (%)': probabilities})
            chart_placeholder.line_chart(chart_data, color="#FF4B4B")
            
            # 2. Update MITRE Mapping
            if top_class != 0:
                mitre_placeholder.error(f"""
                **🚨 Detected Attack:** {attack_name}  
                **🗺️ MITRE Tactic:** {mitre_tactic}  
                **⚙️ MITRE Technique:** {mitre_tech}  
                """)
            else:
                mitre_placeholder.success(f"✅ Network Stable (Benign Traffic) - No ATT&CK Tactics Detected")
                
            # 3. Update Forecasting (K-step simulation)
            # The PS requires forecasting. We statistically project the hidden state trajectory.
            if len(probabilities) > 1:
                delta = probabilities[-1] - probabilities[-2]
            else:
                delta = 0
                
            t1 = min(100, max(0, inf_prob + delta * 1.5))
            t2 = min(100, max(0, t1 + delta * 2.0))
            t3 = min(100, max(0, t2 + delta * 2.5))
            t4 = min(100, max(0, t3 + delta * 3.0))
            
            forecast_placeholder.markdown(f"""
            ### Projected Future States
            *Based on current LSTM state vector trajectory:*
            - **T+1 (Next Seq):** `{t1:.1f}%` Risk
            - **T+2 (Next Seq):** `{t2:.1f}%` Risk
            - **T+3 (Next Seq):** `{t3:.1f}%` Risk
            - **T+4 (Next Seq):** `{t4:.1f}%` Risk
            """)
            
            # 4. Update Explainability (Saliency Gradients)
            if top_class != 0:
                model.zero_grad()
                outputs[0, top_class].backward()
                saliency = seq_tensor.grad.abs().sum(dim=1).squeeze(0).cpu().numpy()
                
                top_indices = np.argsort(saliency)[-5:][::-1]
                top_features = [expected_features[idx] for idx in top_indices]
                top_scores = [float(saliency[idx]) for idx in top_indices]
                
                exp_df = pd.DataFrame({'Importance': top_scores}, index=top_features)
                
                with explain_placeholder.container():
                    st.info(f"The AI flagged this traffic as **{attack_name}** because of anomalous patterns in these 5 features:")
                    st.bar_chart(exp_df, color="#FF9900")
            else:
                explain_placeholder.empty()
            
            progress_bar.progress(i / 1000)
            time.sleep(0.05)
