import React, { useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Upload, FileText, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function LiveDashboard({
  currentFrame,
  isPlaying,
  sendControl,
  uploading,
  handleFileUpload,
  kSteps,
  setKSteps,
  speed,
  setSpeed,
  sampleDatasets,
  loadSampleDataset
}) {
  const fileInputRef = useRef(null);

  // Extract frame info
  const stepT = currentFrame?.step_t || {
    infiltration_probability: 12.5,
    phase_name: 'Benign / Normal Operations',
    attack_name: 'Benign Traffic',
    mitre_id: 'None',
    phase_severity: 'NORMAL',
    recommended_action: 'Telemetry parameters within normal statistical baseline.'
  };

  const trajectory = currentFrame?.trajectory || [
    { step: 1, horizon: 'T+1', infiltration_probability: 12.5, predicted_phase_idx: 0 },
    { step: 2, horizon: 'T+2', infiltration_probability: 14.8, predicted_phase_idx: 0 },
    { step: 3, horizon: 'T+3', infiltration_probability: 22.0, predicted_phase_idx: 1 },
    { step: 4, horizon: 'T+4', infiltration_probability: 38.5, predicted_phase_idx: 2 },
  ];

  const historyRisks = currentFrame?.history_risks || [10, 11, 12, 10, 12, 15, 13, 12];

  // Chart configuration: Past Trajectory + Forward Rollout Cone
  const pastLabels = historyRisks.map((_, i) => `-${historyRisks.length - 1 - i}s`);
  const futureLabels = trajectory.map(t => t.horizon);
  const chartLabels = [...pastLabels, ...futureLabels];

  // Past data with nulls for future
  const pastData = [...historyRisks, ...trajectory.map(() => null)];
  
  // Future trajectory with connecting point from current step
  const futureData = [
    ...historyRisks.slice(0, -1).map(() => null),
    historyRisks[historyRisks.length - 1],
    ...trajectory.map(t => t.infiltration_probability)
  ];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Observed Trajectory (T-W to T)',
        data: pastData,
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Forward Simulation Rollout (T+1 to T+K)',
        data: futureData,
        borderColor: '#FF0055',
        backgroundColor: 'rgba(255, 0, 85, 0.15)',
        borderWidth: 3,
        borderDash: [6, 4],
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: '#FF0055',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: {
          color: '#8E9DB5',
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: '#121722',
        titleColor: '#00F0FF',
        bodyColor: '#F0F4FC',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#53627A', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#8E9DB5',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: (val) => `${val}%`
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Controller Bar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Playback controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className={isPlaying ? "btn-danger" : "btn-primary"}
            onClick={() => sendControl({ action: isPlaying ? 'PAUSE' : 'PLAY' })}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'PAUSE STREAM' : 'START SIMULATION'}</span>
          </button>

          <button 
            className="btn-secondary"
            onClick={() => sendControl({ action: 'STEP' })}
            title="Advance 1 Sequence Step"
          >
            <SkipForward size={16} />
            <span>Step</span>
          </button>

          <button 
            className="btn-secondary"
            onClick={() => sendControl({ action: 'RESET' })}
            title="Reset to Event 0"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Speed & Horizon Multipliers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Speed:</span>
            {[0.5, 1.0, 2.0, 5.0].map(s => (
              <button
                key={s}
                className={`btn-secondary ${speed === s ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: speed === s ? 'var(--accent-cyan)' : 'var(--border-subtle)' }}
                onClick={() => {
                  setSpeed(s);
                  sendControl({ action: 'SET_SPEED', speed: s });
                }}
              >
                {s}x
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Horizon:</span>
            {[2, 4, 6, 8].map(k => (
              <button
                key={k}
                className={`btn-secondary ${kSteps === k ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: kSteps === k ? 'var(--accent-cyan)' : 'var(--border-subtle)' }}
                onClick={() => {
                  setKSteps(k);
                  sendControl({ action: 'SET_HORIZON', k_steps: k });
                }}
              >
                T+{k}
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".csv"
              onChange={handleFileUpload} 
            />
            <button 
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={16} color="var(--accent-cyan)" />
              <span>{uploading ? 'Ingesting (500MB max)...' : 'Upload Telemetry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        
        {/* Left: Real-Time Infiltration Forecasting Canvas */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Infiltration Risk Timeline & Forward Simulation Cone</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Autoregressive P(S_t+1 | S_t) rollout projecting threat convergence ahead of breach completion
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Event {currentFrame?.event_index || 0} / {currentFrame?.total_events || 0}
              </span>
            </div>
          </div>

          <div style={{ height: '320px', width: '100%' }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Forward Horizon Projection Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${trajectory.length}, 1fr)`, gap: '10px', marginTop: '4px' }}>
            {trajectory.map((step, idx) => {
              const delta = idx === 0 
                ? step.infiltration_probability - stepT.infiltration_probability 
                : step.infiltration_probability - trajectory[idx - 1].infiltration_probability;

              return (
                <div key={step.step} style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                      {step.horizon}
                    </span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: delta > 0 ? '#FF0055' : '#00FF88' }}>
                      {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: '1.2rem', fontWeight: '800', margin: '4px 0', color: step.infiltration_probability > 50 ? '#FF0055' : 'var(--text-primary)' }}>
                    {step.infiltration_probability.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Stage {step.predicted_phase_idx}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Threat State & Containment Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Current Observed State Box */}
          <div className={`glass-panel ${stepT.infiltration_probability >= 50 ? 'glass-panel-danger' : ''}`} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="badge badge-cyan">TELEMETRY STEP T</span>
              <span className={`badge ${stepT.phase_severity === 'CRITICAL' ? 'badge-critical' : stepT.phase_severity === 'HIGH' ? 'badge-elevated' : 'badge-normal'}`}>
                {stepT.phase_severity}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Detected Attack Profile</div>
            <div style={{ fontSize: '1.35rem', fontWeight: '800', color: stepT.infiltration_probability >= 50 ? '#FF0055' : '#00F0FF', margin: '2px 0 10px 0' }}>
              {stepT.attack_name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MITRE TECHNIQUE</div>
                <div className="mono" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stepT.mitre_id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KILL CHAIN STAGE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{stepT.phase_name}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-amber)', marginBottom: '4px' }}>
                <Zap size={14} /> DEFENDER CONTAINMENT ACTION
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {stepT.recommended_action}
              </p>
            </div>
          </div>

          {/* Quick-Load Sample Dataset Selection */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <FileText size={16} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700' }}>Quick-Load Attack Capture</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sampleDatasets.slice(0, 4).map(ds => (
                <button
                  key={ds.filename}
                  onClick={() => loadSampleDataset(ds.filename)}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.75rem', padding: '6px 10px' }}
                >
                  <span className="mono">{ds.filename}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{ds.size_mb} MB</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
