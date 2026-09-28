import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip } from '@fortawesome/free-solid-svg-icons';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function XaiStudio({ currentFrame }) {
  const temporalAttention = currentFrame?.temporal_attention || [
    0.05, 0.08, 0.04, 0.06, 0.09, 0.12, 0.15, 0.18, 0.11, 0.12
  ];

  const topFeatures = currentFrame?.top_features || [
    { feature: 'Flow Duration', importance: 0.8421 },
    { feature: 'SYN Flag Cnt', importance: 0.6912 },
    { feature: 'Fwd Pkt Len Max', importance: 0.5401 },
    { feature: 'Flow IAT Mean', importance: 0.4120 },
    { feature: 'Init Fwd Win Byts', importance: 0.3204 }
  ];

  // Chart 1: Temporal Attention
  const attnLabels = temporalAttention.map((_, i) => `T-${temporalAttention.length - 1 - i}`);
  const attnChartData = {
    labels: attnLabels,
    datasets: [
      {
        label: 'Attention Weight (Normalized)',
        data: temporalAttention,
        backgroundColor: temporalAttention.map(v => v > 0.14 ? '#00F0FF' : 'rgba(0, 240, 255, 0.4)'),
        borderColor: '#00F0FF',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  // Chart 2: Top Features Attribution
  const featureChartData = {
    labels: topFeatures.map(f => f.feature),
    datasets: [
      {
        label: 'Saliency Attribution Gradient',
        data: topFeatures.map(f => f.importance),
        backgroundColor: '#FFB800',
        borderColor: '#FFA500',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8E9DB5', font: { family: 'Outfit', size: 11 } }
      },
      tooltip: {
        backgroundColor: '#121722',
        titleColor: '#00F0FF',
        bodyColor: '#F0F4FC'
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#8E9DB5', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#53627A', font: { family: 'JetBrains Mono', size: 10 } }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <FontAwesomeIcon icon={faMicrochip} style={{ fontSize: '20px', color: 'var(--accent-cyan)' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Explainable AI (XAI) & Attention Studio</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Black-box predictions are unacceptable in mission-critical defense operations. This studio reveals the exact mathematical drivers behind the World Model's threat predictions through Temporal Multi-Head Attention and PyTorch Auto-Differentiation Saliency.
        </p>
      </div>

      {/* Dual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Temporal Multi-Head Attention */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Temporal Attention Heatmap</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Identifies which preceding sequence event (T-9 to T) triggered the state transition
              </p>
            </div>
            <span className="badge badge-cyan">Softmax Scaled Dot-Product</span>
          </div>

          <div style={{ height: '260px' }}>
            <Bar data={attnChartData} options={commonOptions} />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px' }}>
            💡 <strong>Observation:</strong> Events with high attention weights represent sudden state-transition bursts (e.g. abrupt SYN packet rushes or sudden inter-arrival timing drops).
          </div>
        </div>

        {/* Top 5 Feature Attribution */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Top Driving Telemetry Features</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Gradient sensitivity |∂Logit / ∂Feature| indicating feature contribution
              </p>
            </div>
            <span className="badge badge-elevated">Saliency Gradient</span>
          </div>

          <div style={{ height: '260px' }}>
            <Bar data={featureChartData} options={commonOptions} />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px' }}>
            🔍 <strong>Insight:</strong> The World Model heavily weights <em>{topFeatures[0]?.feature}</em>, proving that multi-packet timing patterns (not isolated signatures) govern the prediction.
          </div>
        </div>

      </div>

      {/* Mathematical Formulations Accordion */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px', color: 'var(--accent-cyan)' }}>
          Mathematical Formulations (NTRO Compliance)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.8rem' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
              1. Temporal Attention Mechanism
            </div>
            <p className="mono" style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>
              Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V
            </p>
            <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
              Computes pairwise correlation between the most recent hidden state h_t and all preceding observation vectors in the sliding sequence window.
            </p>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div className="mono" style={{ color: 'var(--accent-amber)', fontWeight: '700', marginBottom: '4px' }}>
              2. Saliency Gradient Attribution
            </div>
            <p className="mono" style={{ color: '#E2E8F0', fontSize: '0.75rem' }}>
              Attribution(x_i) = | ∂(Infiltration Logit) / ∂(x_i) |
            </p>
            <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
              Computes first-order derivative of the neural network's infiltration decision with respect to each of the 78 input dimensions.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
