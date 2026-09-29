# pyrefly: ignore [missing-import]
import streamlit as st
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np
import time
import os
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt

from world_model import NetworkWorldModel
from mitre_mapping import MITRE_PHASES, ATTACK_CLASS_MAP

# --- Page Configuration ---
st.set_page_config(
    page_title="AI Network World Model | Threat Forecasting",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #1E222D;
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #2E3648;
    }
    .stProgress > div > div > div > div {
        background-color: #FF4B4B;
    }
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def load_world_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = NetworkWorldModel(
        input_size=78,
        hidden_size=128,
        num_layers=2,
        num_phases=6,
        num_classes=16
    ).to(device)

    # Check for weights file
    weights_path = "trained_network_world_model.pth"
    if not os.path.exists(weights_path):
        if os.path.exists("trained_world_model_FULL.pth"):
            weights_path = "trained_world_model_FULL.pth"
    
    if os.path.exists(weights_path):
        try:
            model.load_state_dict(torch.load(weights_path, map_location=device))
            st.sidebar.success(f"Loaded model weights from `{weights_path}`")
        except Exception as e:
            st.sidebar.warning(f"Using architecture with initialized weights: {e}")
    else:
        st.sidebar.info("Model initialized with clean weights.")

    model.eval()
    return model, device

model, device = load_world_model()

# Header
st.title("🛡️ AI Network World Model: Threat Forecasting Dashboard")
st.caption("NTRO PS 26153 | Autonomous Network State Dynamics P(S_{t+1}|S_t) & K-Step Infiltration Rollout")

# Sidebar
st.sidebar.header("📁 Upload Telemetry Data")
uploaded_file = st.sidebar.file_uploader(
    "Upload Network Telemetry (CSV)",
    type=['csv'],
    help="Upload a sanitized network flow CSV (e.g. CIC-IDS-2018 capture) with 78 features."
)

if uploaded_file is not None:
    st.sidebar.success(f"📄 Uploaded: `{uploaded_file.name}`")

st.sidebar.header("🕹️ Simulation Controls")
k_steps = st.sidebar.slider("Forecasting Horizon (K-Steps Ahead)", min_value=2, max_value=8, value=4)
sim_speed = st.sidebar.select_slider("Simulation Streaming Speed", options=["Fast", "Normal", "Step-by-Step"], value="Normal")
sleep_times = {"Fast": 0.02, "Normal": 0.08, "Step-by-Step": 0.3}

run_analysis = st.sidebar.button("▶ Run World Model Simulation", use_container_width=True)

# Layout Columns
col_main, col_forecast = st.columns([5, 4])

with col_main:
    st.subheader("📡 Real-Time Infiltration Probability Timeline")
    timeline_placeholder = st.empty()

with col_forecast:
    st.subheader(f"🔮 True K-Step Forward Simulation ({k_steps} Horizons Ahead)")
    forecast_placeholder = st.empty()

st.markdown("---")

col_killchain, col_explain = st.columns([1, 1])

with col_killchain:
    st.subheader("🎯 MITRE ATT&CK Kill Chain Trajectory")
    killchain_placeholder = st.empty()

with col_explain:
    st.subheader("🧠 Temporal Attention & Decision Explainability")
    explain_placeholder = st.empty()

# Real-Time Execution Loop
if run_analysis:
    if uploaded_file is None:
        st.error("⚠️ Please upload a network telemetry CSV file in the sidebar to begin analysis.")
        st.stop()

    df = pd.read_csv(uploaded_file, nrows=5000)

    df.columns = df.columns.str.strip()
    df = df[df['Label'] != 'Label'] if 'Label' in df.columns else df

    # Feature Alignment to 78 dimensions
    feature_cols = [c for c in df.columns if c != 'Label']
    if len(feature_cols) < 78:
        for i in range(len(feature_cols), 78):
            col_name = f"Feature_Pad_{i}"
            df[col_name] = 0.0
            feature_cols.append(col_name)
    elif len(feature_cols) > 78:
        feature_cols = feature_cols[:78]

    X_raw = df[feature_cols].apply(pd.to_numeric, errors='coerce').replace([np.inf, -np.inf], np.nan).fillna(0.0).values
    
    # Simple MinMax scaling [0, 1]
    denom = (X_raw.max(axis=0) - X_raw.min(axis=0))
    denom[denom == 0] = 1.0
    X_scaled = (X_raw - X_raw.min(axis=0)) / denom

    seq_length = 10
    total_samples = min(800, len(X_scaled) - seq_length - k_steps)
    progress_bar = st.progress(0)

    timeline_probs = []
    
    # Sliding window simulation
    for i in range(0, total_samples, 4):
        seq = X_scaled[i : i + seq_length]
        seq_tensor = torch.tensor(seq, dtype=torch.float32).unsqueeze(0).to(device)

        # 1. True Autoregressive K-Step Forward Rollout
        trajectory = model.forward_rollout(seq_tensor, k_steps=k_steps)

        # Current observed step (T)
        next_state, inf_logit, phase_logits, class_logits, attn_weights = model(seq_tensor)
        curr_inf_prob = torch.sigmoid(inf_logit).item() * 100.0
        curr_phase_idx = int(np.argmax(torch.softmax(phase_logits, dim=-1).detach().cpu().numpy()[0]))
        curr_class_idx = int(np.argmax(torch.softmax(class_logits, dim=-1).detach().cpu().numpy()[0]))
        
        timeline_probs.append(curr_inf_prob)

        # --- A. Update Timeline Chart ---
        timeline_df = pd.DataFrame({"Current Infiltration Risk (%)": timeline_probs})
        timeline_placeholder.line_chart(timeline_df, color="#FF4B4B")

        # --- B. Update Forward Rollout Projections ---
        with forecast_placeholder.container():
            f_cols = st.columns(k_steps)
            for idx, step_data in enumerate(trajectory):
                with f_cols[idx]:
                    risk = step_data["infiltration_probability"]
                    h_phase = MITRE_PHASES[step_data["predicted_phase_idx"]]
                    h_attack = ATTACK_CLASS_MAP[step_data["predicted_class_idx"]]["name"]
                    
                    st.metric(
                        label=f"{step_data['horizon']}",
                        value=f"{risk:.1f}%",
                        delta=f"{risk - curr_inf_prob:+.1f}%" if idx == 0 else None,
                        delta_color="inverse"
                    )
                    st.caption(f"**{h_phase['name']}**\n{h_attack}")

        # --- C. Update MITRE ATT&CK Kill Chain Status ---
        with killchain_placeholder.container():
            phase_info = MITRE_PHASES[curr_phase_idx]
            attack_info = ATTACK_CLASS_MAP[curr_class_idx]

            if curr_phase_idx == 0:
                st.success(f"**Status:** {phase_info['name']}\n\n*Network operating within benign parameters.*")
            else:
                st.error(f"""
                🚨 **Active Threat:** {attack_info['name']}  
                🗺️ **MITRE Tactic:** {attack_info['mitre_tactic']}  
                ⚙️ **Technique:** {attack_info['mitre_technique']} (`{attack_info['mitre_id']}`)  
                📊 **Kill Chain Stage:** {phase_info['name']} (Severity: {phase_info['severity']})  
                🛡️ **Recommended Action:** {attack_info['recommended_action']}
                """)

        # --- D. Update Explainability (Temporal Attention & Top Features) ---
        with explain_placeholder.container():
            attn_np = attn_weights.detach().cpu().numpy()[0]
            attn_df = pd.DataFrame({
                "Window Step": [f"T-{seq_length-1-w}" for w in range(seq_length)],
                "Temporal Attention Weight": attn_np
            }).set_index("Window Step")

            st.bar_chart(attn_df, color="#17A2B8")
            st.caption("Temporal Attention: Identifies which preceding packet events triggered the World Model dynamics.")

        progress_bar.progress(min(1.0, (i + 4) / total_samples))
        time.sleep(sleep_times[sim_speed])

    st.success("✅ Real-Time Simulation Completed Successfully.")
