# 🛡️ AI World Model Pipeline Architecture

**Problem Statement:** NTRO 26153 — AI based Network Attack Forecasting from Network Traffic Data  
**Theme:** Proactive Cyber Defense via Environment State-Transition Dynamics

---

## 1. Data Ingestion & Sanitization
The CIC-IDS-2018 dataset arrives as massive tabular CSV files containing network flow telemetry extracted from PCAP captures.
- **Memory Management**: Raw files (up to 10GB per capture) are processed using chunked memory streaming (250,000 rows at a time).
- **Sanitization**: String `Infinity` and `NaN` values are mapped to numerical zero representations to preserve gradient stability.
- **Dimension Locking**: Telemetry vectors are bound to 78 standardized network features (`Flow Duration`, `SYN Flag Cnt`, `IAT Mean`, etc.).

---

## 2. Sequence State Generation (The Sliding Observation Window)
Traditional static classifiers analyze a single packet $S_t$ in isolation, discarding causal and temporal progressions.
Our World Model observes the evolving state of the environment over a sliding window:
$$\mathbf{X}_t = [S_{t-9}, S_{t-8}, \dots, S_{t-1}, S_t] \in \mathbb{R}^{10 \times 78}$$
Each observation vector $S_t$ is normalized into bounded $[0.0, 1.0]$ tensor space using `MinMaxScaler`.

---

## 3. World Model Neural Architecture

```text
[Input Window: 10 x 78] 
       │
       ▼
[Deep 2-Layer LSTM Backbone (Hidden Size: 128)]
       │
       ▼
[Temporal Multi-Head Attention Layer]
       │
       ├─────────────────┬─────────────────┬─────────────────┐
       ▼                 ▼                 ▼                 ▼
[Head 1: Dynamics] [Head 2: Inf Risk] [Head 3: MITRE]   [Head 4: Class]
 P(S_{t+1} | S_t)   P(Infiltration)   6 Kill Chain Phases 16 Specific Attacks
  (Linear: 78)       (Linear: 1)       (Linear: 6)       (Linear: 16)
```

1. **Temporal Sequence Backbone:** Deep 2-layer LSTM maintaining recurrent hidden context of telemetry transitions.
2. **Temporal Attention Layer:** Computes normalized attention weights across the 10 sliding events, pinpointing which preceding burst triggered the transition.
3. **Dynamics Transition Head:** Predicts the continuous next-state telemetry vector $\hat{S}_{t+1} \in \mathbb{R}^{78}$.
4. **Infiltration Risk Head:** Outputs binary compromise likelihood $P(\text{Infiltration} \in [0, 1])$.
5. **MITRE ATT&CK Phase Head:** Maps trajectory into the 5 cyber kill chain stages (*Reconnaissance $\to$ Initial Access $\to$ Lateral Movement $\to$ C2 $\to$ Exfiltration*).
6. **Granular Classification Head:** Predicts specific attack category across 16 classes.

---

## 4. Multi-Objective Supervised Dynamics Learning
The model is trained end-to-end minimizing a composite loss:
$$\mathcal{L}_{\text{total}} = \lambda_{\text{dyn}} \mathcal{L}_{\text{MSE}}(\hat{S}_{t+1}, S_{t+1}) + \lambda_{\text{inf}} \mathcal{L}_{\text{BCE}}(\hat{y}_{\text{inf}}, y_{\text{inf}}) + \lambda_{\text{phase}} \mathcal{L}_{\text{CE}}(\hat{y}_{\text{phase}}, y_{\text{phase}}) + \lambda_{\text{cls}} \mathcal{L}_{\text{CE}}(\hat{y}_{\text{cls}}, y_{\text{cls}})$$

This ensures the network doesn't simply memorize attack labels—it learns the causal dynamics of how network telemetry states evolve over time.

---

## 5. Autoregressive $K$-Step Forward Simulation (Rollout)
At step $t$, given the observed sequence $[S_{t-9:t}]$, the World Model simulates future states:
1. Predicts $\hat{S}_{t+1}$ and evaluates infiltration probability.
2. Appends $\hat{S}_{t+1}$ to the sequence and drops $S_{t-9}$.
3. Predicts $\hat{S}_{t+2}$, $\hat{S}_{t+3}$, $\hat{S}_{t+4}$ recursively.
4. Generates a multi-horizon risk trajectory $(T+1, T+2, T+3, T+4)$ to alert network administrators *before* the attack trajectory converges to compromise.
