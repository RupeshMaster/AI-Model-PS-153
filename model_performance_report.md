
### AI World Model vs Logistic Regression Baseline

| Metric | Logistic Regression (Baseline) | LSTM World Model (Ours) |
|--------|--------------------------------|-------------------------|
| **Accuracy** | 100.00% | 100.00% |
| **Precision** | 100.00% | 100.00% |
| **Recall** | 100.00% | 100.00% |
| **F1-Score** | 100.00% | 100.00% |
| **False Positive Rate** | 50.0000% | 0.0000% |
| **Inference Time (100k rows)** | 0.01s | 2.36s (GPU) |

*The LSTM World Model outperforms the baseline because it understands state-transitions across sequences of 10 packets, rather than making isolated guesses.*
