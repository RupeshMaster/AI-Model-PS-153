import React from 'react';
import { ShieldAlert, Activity, Radio, Cpu, FileText, BarChart3, Search, Crosshair } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentFrame, connectionStatus }) {
  const defcon = currentFrame?.defcon || {
    level: 5,
    status: 'NORMAL: BENIGN TELEMETRY BASELINE',
    color: '#00FF88'
  };

  const navItems = [
    { id: 'dashboard', label: 'Live Operations', icon: Activity },
    { id: 'mitre', label: 'MITRE Kill Chain', icon: Crosshair },
    { id: 'inspector', label: 'Traffic Inspector', icon: Search },
    { id: 'xai', label: 'XAI Attention Studio', icon: Cpu },
    { id: 'benchmarks', label: 'Benchmark Lab', icon: BarChart3 },
    { id: 'reports', label: 'Incident Reports', icon: FileText },
  ];

  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 16px 16px', margin: '0 16px 16px 16px', padding: '14px 24px', borderTop: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(157, 0, 255, 0.2))', border: '1px solid var(--border-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={24} color="#00F0FF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #FFFFFF 0%, #A2BEE5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AEGIS // WORLD MODEL
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>NTRO PS-26153</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Autonomous Network Attack Forecasting & P(S_t+1 | S_t) Forward Simulation
            </p>
          </div>
        </div>

        {/* DEFCON & Telemetry Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '6px 14px', 
            borderRadius: '8px', 
            background: defcon.level === 1 ? 'rgba(255, 0, 85, 0.15)' : defcon.level === 3 ? 'rgba(255, 184, 0, 0.12)' : 'rgba(0, 255, 136, 0.12)',
            border: `1px solid ${defcon.color}55`
          }}>
            <div className="radar-dot" style={{ backgroundColor: defcon.color }} />
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                THREAT LEVEL DEFCON {defcon.level}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: defcon.color }}>
                {defcon.status}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
            <Radio size={14} color={connectionStatus === 'CONNECTED' ? '#00FF88' : '#FF0055'} />
            <span className="mono" style={{ color: 'var(--text-secondary)' }}>{connectionStatus}</span>
            {currentFrame?.inference_latency_ms && (
              <span className="mono" style={{ color: 'var(--accent-cyan)' }}>• {currentFrame.inference_latency_ms}ms</span>
            )}
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav style={{ display: 'flex', gap: '6px', marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', overflowX: 'auto' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-tab ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
