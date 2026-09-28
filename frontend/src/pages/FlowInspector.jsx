import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, ArrowDownUp, Download, Eye } from 'lucide-react';

export default function FlowInspector({ currentFrame }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [selectedFlow, setSelectedFlow] = useState(null);

  // In production, stream engine tracks historical flagged flows
  const latestFlagged = currentFrame?.latest_flagged_flow;
  
  // Dummy demo flows combined with incoming stream
  const baseFlows = [
    {
      id: 'FL-2849',
      event_index: 2849,
      timestamp: '18:32:10',
      ground_truth_label: 'FTP-BruteForce',
      predicted_attack: 'FTP-BruteForce',
      mitre_id: 'T1110.001',
      mitre_phase: 'Initial Access',
      severity: 'HIGH',
      infiltration_risk: 88.4,
      key_anomaly: 'SYN Flag Cnt (Burst > 150/s)'
    },
    {
      id: 'FL-2850',
      event_index: 2850,
      timestamp: '18:32:14',
      ground_truth_label: 'SSH-Bruteforce',
      predicted_attack: 'SSH-Bruteforce',
      mitre_id: 'T1110.003',
      mitre_phase: 'Initial Access',
      severity: 'HIGH',
      infiltration_risk: 92.1,
      key_anomaly: 'Flow Duration < 10ms'
    },
    {
      id: 'FL-3102',
      event_index: 3102,
      timestamp: '18:33:05',
      ground_truth_label: 'Infiltration',
      predicted_attack: 'Infiltration',
      mitre_id: 'T1021',
      mitre_phase: 'Lateral Movement',
      severity: 'CRITICAL',
      infiltration_risk: 96.8,
      key_anomaly: 'Dst Port 445 (SMB Pivot)'
    },
    {
      id: 'FL-3250',
      event_index: 3250,
      timestamp: '18:34:12',
      ground_truth_label: 'DoS attacks-GoldenEye',
      predicted_attack: 'DoS attacks-GoldenEye',
      mitre_id: 'T1498.001',
      mitre_phase: 'Exfiltration & Impact',
      severity: 'CRITICAL',
      infiltration_risk: 99.4,
      key_anomaly: 'Keep-Alive Exhaustion'
    }
  ];

  const flowsList = latestFlagged 
    ? [latestFlagged, ...baseFlows.filter(f => f.id !== latestFlagged.id)]
    : baseFlows;

  const filteredFlows = flowsList.filter(f => {
    const matchesSearch = f.predicted_attack.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.mitre_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.key_anomaly.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === 'ALL' || f.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Network Telemetry & Flagged Flows Inspector</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Deep packet inspection and incident triage for anomalous sequence transitions
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search attack, MITRE ID, anomaly..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px 8px 34px',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                width: '260px',
                outline: 'none'
              }}
            />
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'NORMAL'].map(sev => (
              <button
                key={sev}
                className={`btn-secondary ${filterSeverity === sev ? 'active' : ''}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  borderColor: filterSeverity === sev ? 'var(--accent-cyan)' : 'var(--border-subtle)'
                }}
                onClick={() => setFilterSeverity(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ padding: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 14px' }}>FLOW ID</th>
              <th style={{ padding: '12px 14px' }}>TIMESTAMP</th>
              <th style={{ padding: '12px 14px' }}>DETECTED THREAT</th>
              <th style={{ padding: '12px 14px' }}>MITRE ID</th>
              <th style={{ padding: '12px 14px' }}>KILL CHAIN STAGE</th>
              <th style={{ padding: '12px 14px' }}>RISK SCORE</th>
              <th style={{ padding: '12px 14px' }}>KEY ANOMALY</th>
              <th style={{ padding: '12px 14px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlows.map(flow => (
              <tr 
                key={flow.id} 
                style={{ 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  background: flow.severity === 'CRITICAL' ? 'rgba(255, 0, 85, 0.04)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <td className="mono" style={{ padding: '12px 14px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                  {flow.id}
                </td>
                <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                  {flow.timestamp}
                </td>
                <td style={{ padding: '12px 14px', fontWeight: '700', color: flow.severity === 'CRITICAL' ? '#FF0055' : 'var(--text-primary)' }}>
                  {flow.predicted_attack}
                </td>
                <td className="mono" style={{ padding: '12px 14px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{flow.mitre_id}</span>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                  {flow.mitre_phase}
                </td>
                <td className="mono" style={{ padding: '12px 14px', fontWeight: '700', color: flow.infiltration_risk > 75 ? '#FF0055' : 'var(--accent-amber)' }}>
                  {flow.infiltration_risk}%
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {flow.key_anomaly}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <button 
                    onClick={() => setSelectedFlow(flow)}
                    className="btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    <Eye size={12} /> Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Drawer: Deep Flow Breakdown */}
      {selectedFlow && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{ width: '600px', maxWidth: '90%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-critical">{selectedFlow.severity}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '6px' }}>
                  Telemetry Flow {selectedFlow.id}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedFlow(null)}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>THREAT SIGNATURE</div>
                <div style={{ fontWeight: '700', color: '#FF0055' }}>{selectedFlow.predicted_attack}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MITRE TECHNIQUE</div>
                <div className="mono" style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{selectedFlow.mitre_id}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>INFILTRATION PROBABILITY</div>
                <div className="mono" style={{ fontWeight: '700', color: '#FF0055' }}>{selectedFlow.infiltration_risk}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DRIVING ANOMALY</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedFlow.key_anomaly}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px' }}>
                78-DIMENSIONAL FEATURE VECTOR PREVIEW
              </div>
              <div className="mono" style={{ background: '#080B10', padding: '10px', borderRadius: '6px', fontSize: '0.7rem', maxHeight: '120px', overflowY: 'auto', color: '#8E9DB5' }}>
                Flow Duration: 18491us | Tot Fwd Pkts: 14 | Tot Bwd Pkts: 8 | Fwd Pkt Len Max: 1460 | SYN Flag Cnt: 1 | ACK Flag Cnt: 1 | Flow IAT Mean: 1290.4us | Down/Up Ratio: 0.57 | Init Fwd Win Byts: 65535
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setSelectedFlow(null)}
                className="btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                Acknowledge & Flag in SIEM
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
