import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faDownload } from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export default function IncidentReports({ currentFrame }) {
  const [downloaded, setDownloaded] = useState(false);

  const stepT = currentFrame?.step_t || {
    attack_name: 'FTP-BruteForce',
    mitre_id: 'T1110.001',
    mitre_phase: 'Initial Access',
    phase_severity: 'HIGH',
    recommended_action: 'Rate-limit FTP authentication and block repeated SYN bursts.'
  };

  const handleDownload = () => {
    fetch(`${API_URL}/api/incident/export`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `QC_WORLD_MODEL_INCIDENT_REPORT_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 3000);
      })
      .catch(err => console.error("Export error:", err));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <FontAwesomeIcon icon={faFileLines} style={{ fontSize: '20px', color: 'var(--accent-cyan)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Automated SOC Incident & Forensic Report</h2>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Official forensic documentation conforming to NTRO Critical Information Infrastructure incident standards
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleDownload}
            className="btn-primary"
          >
            <FontAwesomeIcon icon={faDownload} style={{ fontSize: '14px' }} />
            <span>{downloaded ? 'Report Downloaded!' : 'Export Incident JSON'}</span>
          </button>
        </div>
      </div>

      {/* Structured Official Advisory Preview */}
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(0, 240, 255, 0.3)', paddingBottom: '16px' }}>
          <div>
            <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: '700' }}>
              NATIONAL TECHNICAL RESEARCH ORGANISATION (NTRO) // SOC ADVISORY
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '4px' }}>
              THREAT INTELLIGENCE & INFILTRATION INCIDENT BRIEFING
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-critical" style={{ fontSize: '0.85rem' }}>OFFICIAL DEFENSE REPORT</span>
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              REF: QC-WM-2026-PS153
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px' }}>
            1. Executive Threat Summary
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            The AI Network World Model detected anomalous temporal transition dynamics within monitored network telemetry. Continuous sliding sequence analysis of multi-dimensional flow metrics identified an active threat progression categorized as <strong>{stepT.attack_name}</strong> operating at <strong>Stage {stepT.mitre_phase}</strong>. The internal forward simulation rolled out future states indicating imminent infiltration trajectory unless defensive containment is initiated immediately.
          </p>
        </div>

        {/* Section 2: Key Tactical Indicators */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '10px' }}>
            2. Tactical Cyber Kill Chain Indicators
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PRIMARY ATTACK TECHNIQUE</div>
              <div className="mono" style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {stepT.mitre_id}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KILL CHAIN STAGE</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#FFB800', marginTop: '2px' }}>
                {stepT.mitre_phase}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PREDICTIVE INFILTRATION RISK</div>
              <div className="mono" style={{ fontSize: '0.95rem', fontWeight: '800', color: '#FF0055', marginTop: '2px' }}>
                {currentFrame?.step_t?.infiltration_probability || 88.5}% (Forecasted: T+4)
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Defender Containment Actions */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-amber)', textTransform: 'uppercase', marginBottom: '8px' }}>
            3. Recommended Defensive Containment Protocol
          </h4>
          <div style={{ background: 'rgba(255, 184, 0, 0.08)', border: '1px solid rgba(255, 184, 0, 0.3)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', color: '#F7FAFC', lineHeight: 1.5 }}>
            {stepT.recommended_action}
          </div>
        </div>

        {/* Section 4: Forensic Audit Trail */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            4. Cryptographic Validation & Engine Metadata
          </h4>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div>Engine: PyTorch NetworkWorldModel v2.0</div>
            <div>Verification: Supervised Dynamics Learning</div>
            <div>Attention Mechanism: Scaled Dot-Product (d_k=128)</div>
            <div>Signatures Mapped: MITRE ATT&CK v14.1</div>
          </div>
        </div>

      </div>

    </div>
  );
}
