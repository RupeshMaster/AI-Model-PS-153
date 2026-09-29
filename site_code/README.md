# 🛡️ AI World Model for Network Attack Forecasting (NTRO PS 26153)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0%2B-orange.svg)](https://pytorch.org/)
[![Streamlit](https://img.shields.io/badge/Dashboard-Streamlit-red.svg)](https://streamlit.io/)
[![MITRE ATT&CK](https://img.shields.io/badge/Framework-MITRE%20ATT%26CK-green.svg)](https://attack.mitre.org/)

An advanced AI World Model prototype designed for **NTRO Problem Statement 26153: AI based Network Attack Forecasting from Network Traffic Data**.

Rather than treating network telemetry as isolated packets via static classification, this system learns the **environment's causal state-transition dynamics $P(S_{t+1} \mid S_t)$**. This allows proactive cyber defense through **autoregressive forward simulation ($K$-steps ahead)**, predicting the likelihood and progression of malicious activity before compromise is completed.

---

## 🌟 Key Architectural Innovations

### 1. State-Transition Dynamics Core: $P(S_{t+1} \mid S_t)$
- Built upon a 2-layer Deep LSTM coupled with **Temporal Multi-Head Attention**.
- Directly forecasts the continuous 78-dimensional network telemetry state vector $\hat{S}_{t+1}$ given the observed sequence $[S_{t-9}, \dots, S_t]$.
- Trained with supervised multi-objective dynamics loss:
  $$\mathcal{L} = \lambda_{\text{dyn}} \mathcal{L}_{\text{MSE}}(\hat{S}_{t+1}, S_{t+1}) + \lambda_{\text{inf}} \mathcal{L}_{\text{BCE}}(\hat{y}_{\text{inf}}, y_{\text{inf}}) + \lambda_{\text{phase}} \mathcal{L}_{\text{CE}}(\hat{y}_{\text{phase}}, y_{\text{phase}}) + \lambda_{\text{cls}} \mathcal{L}_{\text{CE}}(\hat{y}_{\text{cls}}, y_{\text{cls}})$$

### 2. Autoregressive $K$-Step Forward Simulation
- Rather than static guessing, the internal `forward_rollout(seq, k_steps=4)` method simulates the network into the future:
  $$S_t \longrightarrow \hat{S}_{t+1} \longrightarrow \hat{S}_{t+2} \longrightarrow \hat{S}_{t+3} \longrightarrow \hat{S}_{t+4}$$
- Evaluates the evolving infiltration probability and attack kill-chain phase at each future step $T+k$, giving security teams actionable lead-time.

### 3. MITRE ATT&CK Cyber Kill Chain Progression
- Predicts transitions across the canonical 5-stage cyber kill chain:
  - **Phase 0:** Benign / Normal State
  - **Phase 1:** Reconnaissance (Port Scanning, Probing)
  - **Phase 2:** Initial Access (FTP/SSH/Web Brute Force, SQL Injection, XSS)
  - **Phase 3:** Lateral Movement & Infiltration (Remote Services, SMB/RPC)
  - **Phase 4:** Command & Control (C2 Beaconing, Botnets)
  - **Phase 5:** Exfiltration & Impact (DoS/DDoS Floods)
- Provides tailored mitigation guidance for security defenders for each detected threat.

### 4. Interpretable AI (Temporal Attention & Attribution)
- Built-in **Temporal Attention Layer** extracts normalized attention weights across sliding time windows ($T-9 \dots T$), identifying which specific packet arrival bursts triggered the transition.
- Combined with feature attribution to explain *why* the AI flagged the traffic.

---

## 📁 Repository Structure

```text
├── world_model.py                # Complete NetworkWorldModel (LSTM, Attention, Dynamics Head, Rollout)
├── mitre_mapping.py              # MITRE ATT&CK kill chain and defensive mitigation definitions
├── train_world_model_dynamics.py # Multi-objective supervised dynamics training script
├── evaluate_performance.py       # Benchmark evaluation vs. Logistic Regression baseline
├── test_world_model_dynamics.py  # Unit test suite verifying tensor shapes, rollout & attention
├── app.py                        # Streamlit threat forecasting dashboard with real-time K-step visualizer
├── model_config.json             # Hyperparameters, architecture dimensions & training config
├── model_performance_report.md   # Benchmark metrics, F1-scores, FPR, and dynamics MSE
├── confusion_matrix.png          # High-resolution confusion matrix
├── PIPELINE_ARCHITECTURE.md      # Detailed end-to-end data pipeline specification
└── requirements.txt              # Project dependencies
```

---

## 🚀 Quickstart Guide

### 1. Install Dependencies
Ensure you have Python 3.10+ installed:
```bash
pip install -r requirements.txt
```

### 2. Run Verification Unit Tests
Validate the complete World Model architecture, attention mechanics, and K-step rollout:
```bash
python test_world_model_dynamics.py
```

### 3. Train the World Model
To train the multi-task dynamics model across representative attack profile datasets:
```bash
python train_world_model_dynamics.py
```

### 4. Run Benchmark Evaluation vs. Baseline
Evaluate accuracy, F1-scores, False Positive Rates, and next-state MSE:
```bash
python evaluate_performance.py
```

### 5. Launch Interactive Dashboard
Launch the real-time Streamlit dashboard:
```bash
streamlit run app.py
```
- Select any available telemetry stream or upload your own CSV.
- Adjust the **K-Step Ahead** slider (2 to 8 horizons).
- Click **Run World Model Simulation** to inspect real-time infiltration probability timelines, future state projections, MITRE ATT&CK kill chain trajectory, and temporal attention attribution.
