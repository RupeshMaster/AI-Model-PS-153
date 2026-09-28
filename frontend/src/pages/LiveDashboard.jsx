import React, { useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Upload, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Activity, 
  Clock, 
  Server, 
  CheckCircle2, 
  ArrowUpRight, 
  Cpu, 
  Sliders,
  Radio,
  X,
  Rewind,
  FastForward
} from 'lucide-react';
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
  uploadNotification,
  setUploadNotification,
  handleFileUpload,
  kSteps,
  setKSteps,
  speed,
  setSpeed,
  sampleDatasets,
  loadSampleDataset
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [actionDeployed, setActionDeployed] = useState(false);
  const [graphViewMode, setGraphViewMode] = useState('full'); // 'full' (Start-to-End) or 'window' (Rolling last 60 flows)

  // Extract frame info from live WebSocket stream
  const eventIndex = currentFrame?.event_index || 0;
  const totalEvents = currentFrame?.total_events || 5000;
  const sourceName = currentFrame?.source_name || 'telemetry.csv';
  const latency = currentFrame?.inference_latency_ms || 3.4;
  const progressPct = totalEvents > 0 ? Math.min(100, Math.round((eventIndex / totalEvents) * 100)) : 0;
  const isCompleted = Boolean(currentFrame?.is_completed || (totalEvents > 0 && eventIndex >= totalEvents));
  const firstThreatEvent = currentFrame?.first_threat_event || null;

  const defcon = currentFrame?.defcon || {
    level: 5,
    status: 'NORMAL: BENIGN TELEMETRY BASELINE',
    color: '#00FF66'
  };

  const stepT = currentFrame?.step_t || {
    infiltration_probability: 10.3,
    phase_name: 'Benign / Normal Operations',
    attack_name: 'Benign Traffic',
    mitre_id: 'None',
    mitre_tactic: 'Operational Baseline',
    mitre_technique: 'Normal Network Behavior',
    phase_severity: 'NORMAL',
    recommended_action: 'Telemetry parameters within normal statistical baseline.',
    ground_truth_label: 'Benign'
  };

  const trajectory = currentFrame?.trajectory || [
    { step: 1, horizon: 'T+1', infiltration_probability: 12.5, predicted_phase_idx: 0 },
    { step: 2, horizon: 'T+2', infiltration_probability: 15.0, predicted_phase_idx: 0 },
    { step: 3, horizon: 'T+3', infiltration_probability: 22.4, predicted_phase_idx: 1 },
    { step: 4, horizon: 'T+4', infiltration_probability: 38.1, predicted_phase_idx: 2 },
  ];

  const historyRisks = currentFrame?.history_risks || [10.2, 10.5, 11.0, 10.8, 11.2, 10.9];
  const topFeatures = currentFrame?.top_features || [
    { feature: 'Bwd Packet Length Mean', importance: 0.84 },
    { feature: 'Flow Duration', importance: 0.69 },
    { feature: 'SYN Flag Count', importance: 0.54 },
    { feature: 'Flow IAT Mean', importance: 0.41 },
    { feature: 'Init Fwd Win Bytes', importance: 0.32 }
  ];
  const temporalAttention = currentFrame?.temporal_attention || [0.08, 0.09, 0.08, 0.10, 0.11, 0.12, 0.15, 0.18, 0.12, 0.14];

  // Drag and drop handlers
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Chart configuration: Dual View (Complete Run Overview vs Sliding Window)
  const fullTimeline = currentFrame?.full_timeline || [];

  let chartLabels = [];
  let pastData = [];
  let futureData = [];

  if (graphViewMode === 'full' && fullTimeline.length > 0) {
    const fullLabels = fullTimeline.map(pt => `Evt ${pt.event}`);
    const fullRisks = fullTimeline.map(pt => pt.risk);
    const futureLabels = trajectory.map(t => `+${t.step} Steps`);

    chartLabels = [...fullLabels, ...futureLabels];
    pastData = [...fullRisks, ...trajectory.map(() => null)];
    futureData = [
      ...fullRisks.slice(0, -1).map(() => null),
      fullRisks[fullRisks.length - 1],
      ...trajectory.map(t => t.infiltration_probability)
    ];
  } else {
    const pastLabels = historyRisks.map((_, i) => `Past -${historyRisks.length - 1 - i}`);
    const futureLabels = trajectory.map(t => `+${t.step} Step${t.step > 1 ? 's' : ''} Ahead`);

    chartLabels = [...pastLabels, ...futureLabels];
    pastData = [...historyRisks, ...trajectory.map(() => null)];
    futureData = [
      ...historyRisks.slice(0, -1).map(() => null),
      historyRisks[historyRisks.length - 1],
      ...trajectory.map(t => t.infiltration_probability)
    ];
  }

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: graphViewMode === 'full'
          ? `Complete Trajectory (Event ${fullTimeline[0]?.event || 10} ➔ ${eventIndex})`
          : 'Observed Risk History (Recent Flows)',
        data: pastData,
        borderColor: '#00F0FF',
        backgroundColor: 'rgba(0, 240, 255, 0.10)',
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
        pointRadius: graphViewMode === 'full' ? (fullTimeline.length > 60 ? 1 : 2) : 2,
      },
      {
        label: `AI Future Prediction Cone (+${trajectory.length} Steps Ahead)`,
        data: futureData,
        borderColor: '#FF0055',
        backgroundColor: 'rgba(255, 0, 85, 0.18)',
        borderWidth: 3,
        borderDash: [6, 4],
        tension: 0.3,
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
        padding: 10,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.parsed.y !== null ? Number(context.parsed.y).toFixed(1) + '%' : ''}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { 
          color: '#53627A', 
          font: { family: 'JetBrains Mono', size: 10 },
          maxTicksLimit: graphViewMode === 'full' ? 14 : 20,
          maxRotation: 45,
          minRotation: 0
        }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* ================= STEP 1: INGEST TELEMETRY & UPLOAD BANNER ================= */}
      <div 
        className="glass-panel" 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ 
          padding: '18px 24px', 
          border: dragOver ? '2px dashed var(--accent-cyan)' : '1px solid var(--border-subtle)',
          backgroundColor: dragOver ? 'rgba(0, 240, 255, 0.08)' : 'var(--bg-card)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: 'rgba(0, 240, 255, 0.12)', 
              border: '1px solid rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Upload size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>STEP 1</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Ingest Network Traffic Data (CSV Up to 500MB)</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Upload raw network flow captures or select a pre-loaded attack scenario below.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".csv"
              onChange={handleFileUpload} 
            />
            
            <button 
              className="btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <Upload size={16} />
              <span>{uploading ? 'Ingesting (500MB max)...' : 'Choose CSV File to Upload'}</span>
            </button>
          </div>

        </div>

        {/* Quick-Load Sample Attack Presets */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Quick Presets:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {sampleDatasets.slice(0, 5).map((ds) => {
                const isSelected = sourceName === ds.filename;
                return (
                  <button
                    key={ds.filename}
                    onClick={() => loadSampleDataset(ds.filename)}
                    className="btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                    }}
                  >
                    <span>{ds.filename.replace('.pcap_ISCX.csv', '').replace('clean_', '')}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>({ds.size_mb}MB)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currently Ingested Active File Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Telemetry:</span>
            <span className="mono" style={{ fontSize: '0.8rem', color: '#00FF88', fontWeight: '600', background: 'rgba(0, 255, 136, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 255, 136, 0.25)' }}>
              {sourceName} ({totalEvents} events)
            </span>
          </div>
        </div>

        {/* Upload Notification Banner */}
        {uploadNotification && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: uploadNotification.type === 'success' ? 'rgba(0, 255, 136, 0.1)' : uploadNotification.type === 'error' ? 'rgba(255, 0, 85, 0.1)' : 'rgba(0, 240, 255, 0.1)',
            border: `1px solid ${uploadNotification.type === 'success' ? '#00FF88' : uploadNotification.type === 'error' ? '#FF0055' : 'var(--accent-cyan)'}`,
            color: uploadNotification.type === 'success' ? '#00FF88' : uploadNotification.type === 'error' ? '#FF0055' : 'var(--accent-cyan)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {uploadNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{uploadNotification.message}</span>
            </div>

            <button
              onClick={() => setUploadNotification && setUploadNotification(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 6px',
                borderRadius: '4px',
                opacity: 0.8,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Close Notification"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ================= STEP 2: SIMULATION CONTROLS & TIMELINE STATUS ================= */}
      <div className="glass-panel" style={{ padding: '16px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          {/* Main Simulation Playback Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>STEP 2</span>
            
            <button 
              className={isCompleted ? "btn-secondary" : isPlaying ? "btn-danger" : "btn-primary"}
              onClick={() => {
                if (isCompleted) {
                  sendControl({ action: 'RESET' });
                  setTimeout(() => sendControl({ action: 'PLAY' }), 80);
                } else {
                  sendControl({ action: isPlaying ? 'PAUSE' : 'PLAY' });
                }
              }}
              style={{ 
                padding: '10px 22px', 
                fontSize: '0.95rem', 
                fontWeight: '800',
                borderColor: isCompleted ? '#00FF88' : undefined,
                color: isCompleted ? '#00FF88' : undefined,
                boxShadow: isCompleted ? '0 0 20px rgba(0, 255, 136, 0.4)' : isPlaying ? '0 0 20px rgba(255, 0, 85, 0.4)' : '0 0 20px rgba(0, 240, 255, 0.4)'
              }}
            >
              {isCompleted ? <RotateCcw size={18} /> : isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isCompleted ? 'REPLAY SIMULATION' : isPlaying ? 'PAUSE SIMULATION' : 'START SIMULATION'}</span>
            </button>

            <button 
              className="btn-secondary"
              onClick={() => sendControl({ action: 'STEP' })}
              title="Advance 1 Sequence Window (W=10)"
              disabled={isCompleted}
            >
              <SkipForward size={16} />
              <span>Step (+1)</span>
            </button>

            <button 
              className="btn-secondary"
              onClick={() => sendControl({ action: 'RESET' })}
              title="Reset Simulation to Event 0"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>

          {/* Speed & Horizon Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            
            {/* Speed Multiplier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Stream Speed:</span>
              {[0.5, 1.0, 2.0, 5.0, 10.0].map(s => {
                const isActive = Number(speed) === Number(s);
                return (
                  <button
                    key={s}
                    className={`btn-secondary ${isActive ? 'active' : ''}`}
                    style={{ 
                      padding: '4px 9px', 
                      fontSize: '0.75rem', 
                      borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      background: isActive ? 'rgba(0, 240, 255, 0.18)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      boxShadow: isActive ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
                      fontWeight: isActive ? '700' : '500'
                    }}
                    onClick={() => {
                      setSpeed(s);
                      sendControl({ action: 'SET_SPEED', speed: s });
                    }}
                  >
                    {s}x
                  </button>
                );
              })}
            </div>

            {/* Prediction Lookahead Depth */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="How many future network events ahead the AI simulates">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Predict Ahead:</span>
              {[
                { k: 2, label: '+2 Steps' },
                { k: 4, label: '+4 Steps' },
                { k: 6, label: '+6 Steps' },
                { k: 8, label: '+8 Steps' },
              ].map(item => {
                const isActive = kSteps === item.k;
                return (
                  <button
                    key={item.k}
                    className={`btn-secondary ${isActive ? 'active' : ''}`}
                    style={{ 
                      padding: '4px 9px', 
                      fontSize: '0.75rem', 
                      borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                      background: isActive ? 'rgba(0, 240, 255, 0.18)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontWeight: isActive ? '700' : '500'
                    }}
                    onClick={() => {
                      setKSteps(item.k);
                      sendControl({ action: 'SET_HORIZON', k_steps: item.k });
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="radar-dot" style={{ backgroundColor: isCompleted ? '#00FF88' : isPlaying ? '#00FF88' : '#FFB800' }} />
            <span className="mono" style={{ fontSize: '0.8rem', fontWeight: '700', color: isCompleted ? '#00FF88' : isPlaying ? '#00FF88' : '#FFB800' }}>
              {isCompleted ? 'SIMULATION COMPLETE (100%)' : isPlaying ? 'SIMULATION STREAMING LIVE' : 'SIMULATION PAUSED'}
            </span>
          </div>

        </div>

        {/* Real-time Progress Bar */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            <span className="mono">Simulation Progress: Event {eventIndex.toLocaleString()} / {totalEvents.toLocaleString()} ({progressPct}%)</span>
            <span className="mono">Inference Latency: {latency} ms | Window: 10 Flows | Dimensions: 78</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${progressPct}%`, 
              height: '100%', 
              background: isCompleted ? '#00FF88' : 'linear-gradient(90deg, #00F0FF, #FF0055)',
              transition: 'width 0.1s linear'
            }} />
          </div>
        </div>

        {/* Completed Executive Summary Callout (Only appears once completed) */}
        {isCompleted && (
          <div style={{
            marginTop: '14px',
            padding: '14px 18px',
            borderRadius: '8px',
            background: 'rgba(0, 255, 136, 0.08)',
            border: '1px solid rgba(0, 255, 136, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={24} color="#00FF88" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#00FF88' }}>
                  Telemetry Run Complete: 100% of Events Analyzed
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Processed all {totalEvents.toLocaleString()} sequential flows. Model telemetry and forecasting state are preserved above.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className="btn-primary"
                onClick={() => {
                  sendControl({ action: 'RESET' });
                  setTimeout(() => sendControl({ action: 'PLAY' }), 80);
                }}
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                <RotateCcw size={14} />
                <span>Replay from Start</span>
              </button>

              <button 
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                <Upload size={14} />
                <span>Upload Another Capture</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= STEP 3: REAL-TIME AI WORLD MODEL FORECASTING HUD ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
        
        {/* Left Column: Forecasting Timeline & Forward Cone */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-crimson" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>STEP 3</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Infiltration Risk Timeline & Forward Simulation Cone</h2>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Autoregressive Dynamics Head P(S_t+1 | S_t) recursively rolling out future network states before compromise occurs.
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* View Mode Toggle: Complete Trajectory vs Sliding Window */}
              <div style={{ 
                display: 'flex', 
                background: 'rgba(255, 255, 255, 0.05)', 
                padding: '3px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => setGraphViewMode('full')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: graphViewMode === 'full' ? '700' : '500',
                    borderRadius: '6px',
                    border: graphViewMode === 'full' ? '1px solid var(--accent-cyan)' : 'none',
                    background: graphViewMode === 'full' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                    color: graphViewMode === 'full' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Show complete trajectory curve from Event 0 to final event"
                >
                  📈 Full Run Overview
                </button>
                <button
                  type="button"
                  onClick={() => setGraphViewMode('window')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: graphViewMode === 'window' ? '700' : '500',
                    borderRadius: '6px',
                    border: graphViewMode === 'window' ? '1px solid var(--accent-cyan)' : 'none',
                    background: graphViewMode === 'window' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                    color: graphViewMode === 'window' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Show sliding window of recent telemetry flows + prediction cone"
                >
                  ⏱ Recent Sliding Window
                </button>
              </div>

              <div style={{ textAlign: 'right', minWidth: '90px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CURRENT RISK AT STEP T</div>
                <div className="mono" style={{ fontSize: '1.25rem', fontWeight: '800', color: stepT.infiltration_probability >= 50 ? '#FF0055' : '#00F0FF' }}>
                  {stepT.infiltration_probability.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div style={{ height: '330px', width: '100%' }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Timeline Scrubber & Quick Jumps (Allows viewing starting phase, threat ramp-up, or final state anytime) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Interactive Timeline Scrubber
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(0, 240, 255, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                  Viewing Event {eventIndex.toLocaleString()} / {totalEvents.toLocaleString()}
                </span>
              </div>

              {/* Quick Jump Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => sendControl({ action: 'SEEK', event_index: 10 })}
                  title="Inspect the starting phase baseline graph (Event 10)"
                  style={{ padding: '4px 10px', fontSize: '0.73rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Rewind size={13} color="#00F0FF" />
                  <span>Jump to Start (Event 10)</span>
                </button>

                {firstThreatEvent && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => sendControl({ action: 'SEEK', event_index: firstThreatEvent })}
                    title={`Inspect attack onset at Event ${firstThreatEvent}`}
                    style={{ padding: '4px 10px', fontSize: '0.73rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(255, 184, 0, 0.5)', color: '#FFB800' }}
                  >
                    <AlertTriangle size={13} color="#FFB800" />
                    <span>Attack Onset (Evt {firstThreatEvent})</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => sendControl({ action: 'SEEK', event_index: totalEvents })}
                  title="Inspect completed final state"
                  style={{ padding: '4px 10px', fontSize: '0.73rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FastForward size={13} color="#00FF88" />
                  <span>Jump to Final Event</span>
                </button>
              </div>
            </div>

            {/* Slider bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evt 10</span>
              <input
                type="range"
                min={10}
                max={Math.max(10, totalEvents)}
                value={eventIndex}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  sendControl({ action: 'SEEK', event_index: val });
                }}
                style={{
                  flex: 1,
                  accentColor: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  height: '6px'
                }}
              />
              <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evt {totalEvents.toLocaleString()}</span>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span>💡 Drag slider or click preset buttons to inspect the starting baseline graph, anomaly spikes, or breach point at any historical flow.</span>
              <span style={{ color: graphViewMode === 'full' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                Active View: {graphViewMode === 'full' ? 'Complete Trajectory (0 ➔ N)' : 'Sliding Window (Last 60)'}
              </span>
            </div>
          </div>

          {/* Forward Horizon Prediction Cards (T+1 to T+K) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Future Steps Predicted by AI (+1 to +{trajectory.length} Steps Ahead)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                Simulating network conditions ahead of time
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${trajectory.length}, 1fr)`, gap: '10px' }}>
              {trajectory.map((step, idx) => {
                const delta = idx === 0 
                  ? step.infiltration_probability - stepT.infiltration_probability 
                  : step.infiltration_probability - trajectory[idx - 1].infiltration_probability;

                const isCritical = step.infiltration_probability >= 70.0;
                const isElevated = step.infiltration_probability >= 35.0;
                const readableStepName = step.step === 1 ? 'Next Flow (+1)' : `+${step.step} Flows Ahead`;

                return (
                  <div 
                    key={step.step} 
                    style={{ 
                      background: isCritical ? 'rgba(255, 0, 85, 0.1)' : 'var(--bg-elevated)', 
                      padding: '12px 14px', 
                      borderRadius: '8px', 
                      border: isCritical ? '1px solid rgba(255, 0, 85, 0.4)' : '1px solid var(--border-subtle)',
                      boxShadow: isCritical ? '0 0 15px rgba(255, 0, 85, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                        {readableStepName}
                      </span>
                      <span className="mono" style={{ fontSize: '0.72rem', color: delta > 0 ? '#FF0055' : '#00FF88', fontWeight: '600' }}>
                        {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                      </span>
                    </div>

                    <div className="mono" style={{ fontSize: '1.35rem', fontWeight: '800', margin: '4px 0', color: isCritical ? '#FF0055' : isElevated ? '#FFB800' : '#00FF88' }}>
                      {step.infiltration_probability.toFixed(1)}%
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Predicted MITRE Stage {step.predicted_phase_idx}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Temporal Attention Visualizer Across Sequence Window (W=10) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Temporal Attention Weights Across Sequence Window (T-9 to T)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Scaled Dot-Product Self Attention</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${temporalAttention.length}, 1fr)`, gap: '6px' }}>
              {temporalAttention.map((attn, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '32px', 
                    background: 'rgba(255, 255, 255, 0.04)', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: '100%', 
                      height: `${Math.min(100, Math.round(attn * 300))}%`, 
                      background: attn > 0.14 ? '#00F0FF' : 'rgba(0, 240, 255, 0.4)',
                      transition: 'height 0.2s ease'
                    }} />
                  </div>
                  <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>T-{temporalAttention.length - 1 - i}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Active Threat Intelligence & Explainability HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* DEFCON Status Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '18px 20px', 
              borderLeft: `4px solid ${defcon.color}`,
              background: defcon.level === 1 ? 'rgba(255, 0, 85, 0.08)' : 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="badge" style={{ background: `${defcon.color}22`, color: defcon.color, border: `1px solid ${defcon.color}` }}>
                DEFCON LEVEL {defcon.level}
              </span>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {currentFrame?.timestamp || 'Live'}
              </span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: defcon.color }}>
              {defcon.status}
            </div>
          </div>

          {/* Current Step T Threat Classification */}
          <div className={`glass-panel ${stepT.infiltration_probability >= 50 ? 'glass-panel-danger' : ''}`} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="badge badge-cyan">TELEMETRY STEP T</span>
              <span className={`badge ${stepT.phase_severity === 'CRITICAL' ? 'badge-critical' : stepT.phase_severity === 'HIGH' ? 'badge-elevated' : 'badge-normal'}`}>
                {stepT.phase_severity}
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Detected Attack Profile</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: stepT.infiltration_probability >= 50 ? '#FF0055' : '#00F0FF', margin: '4px 0 12px 0' }}>
              {stepT.attack_name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MITRE TECHNIQUE</div>
                <div className="mono" style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stepT.mitre_id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TACTICAL PHASE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{stepT.phase_name}</div>
              </div>
            </div>

            {/* Defender Containment Action */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--accent-amber)' }}>
                  <Zap size={14} /> DEFENDER MITIGATION PLAYBOOK
                </div>
                {actionDeployed && (
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>DEPLOYED</span>
                )}
              </div>
              
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                {stepT.recommended_action}
              </p>

              <button 
                className="btn-secondary"
                onClick={() => setActionDeployed(true)}
                style={{ width: '100%', fontSize: '0.78rem', padding: '8px', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
              >
                <ShieldCheck size={14} />
                <span>{actionDeployed ? 'Automated Firewall Rule Active' : 'Execute Containment Playbook'}</span>
              </button>
            </div>
          </div>

          {/* Explainable AI (XAI) Feature Attribution (Top 5 Saliency Gradients) */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Cpu size={16} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '0.88rem', fontWeight: '700' }}>XAI Saliency Feature Attribution</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topFeatures.map((feat, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>{feat.feature}</span>
                    <span className="mono" style={{ color: 'var(--accent-amber)' }}>{feat.importance.toFixed(3)}</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.round(feat.importance * 100))}%`, 
                      height: '100%', 
                      background: 'var(--accent-amber)',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
