import React, { useState, useEffect } from 'react';
import { Crosshair, Shield, AlertTriangle, ArrowRight, CheckCircle2, Info, Lock } from 'lucide-react';

export default function MitreProgression({ currentFrame }) {
  const [mitreData, setMitreData] = useState(null);
  const [selectedAttack, setSelectedAttack] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/mitre/matrix')
      .then(res => res.json())
      .then(data => {
        setMitreData(data);
        if (data.attack_classes && data.attack_classes[1]) {
          setSelectedAttack(data.attack_classes[1]);
        }
      })
      .catch(err => console.error("Error fetching MITRE matrix:", err));
  }, []);

  const currentPhaseIdx = currentFrame?.step_t?.predicted_phase_idx || 0;
  const currentAttackName = currentFrame?.step_t?.attack_name || 'Benign';

  const phases = [
    { idx: 1, name: 'Reconnaissance', desc: 'Port scanning, probing & topology mapping' },
    { idx: 2, name: 'Initial Access', desc: 'Credential brute-force, web exploits & SQLi' },
    { idx: 3, name: 'Lateral Movement', desc: 'Perimeter breached, internal host pivot' },
    { idx: 4, name: 'Command & Control', desc: 'Botnet beaconing & outbound control sync' },
    { idx: 5, name: 'Exfiltration & Impact', desc: 'Resource exhaustion, DoS/DDoS floods' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Crosshair size={22} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>MITRE ATT&CK Kill Chain Progression Hub</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Tracking continuous state progression across recognized tactical cyber kill chain phases. Rather than evaluating isolated anomalies, the World Model maps evolving telemetry state sequences directly to MITRE tactics and defensive countermeasures.
        </p>
      </div>

      {/* Kill Chain Pipeline Matrix */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
          Real-Time Kill Chain Progression Pipeline
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {phases.map((phase, i) => {
            const isCurrent = currentPhaseIdx === phase.idx;
            const isPassed = currentPhaseIdx > phase.idx;
            const isFuture = currentPhaseIdx < phase.idx;

            return (
              <div 
                key={phase.idx}
                style={{
                  background: isCurrent ? 'rgba(255, 0, 85, 0.12)' : isPassed ? 'rgba(0, 240, 255, 0.06)' : 'var(--bg-elevated)',
                  border: isCurrent ? '2px solid var(--accent-crimson)' : isPassed ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  position: 'relative',
                  boxShadow: isCurrent ? '0 0 25px rgba(255, 0, 85, 0.35)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.75rem', color: isCurrent ? 'var(--accent-crimson)' : 'var(--accent-cyan)', fontWeight: '700' }}>
                    STAGE 0{phase.idx}
                  </span>
                  {isCurrent && <div className="radar-dot" style={{ backgroundColor: 'var(--accent-crimson)' }} />}
                  {isPassed && <CheckCircle2 size={16} color="var(--accent-cyan)" />}
                </div>

                <div style={{ fontSize: '1rem', fontWeight: '700', color: isCurrent ? '#FFFFFF' : 'var(--text-primary)', marginBottom: '4px' }}>
                  {phase.name}
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  {phase.desc}
                </p>

                {isCurrent && (
                  <div className="badge badge-critical" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                    ACTIVE THREAT
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attack Profiles & Defense Playbooks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left: Interactive Attack Categories Matrix */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '14px' }}>
            Catalogued Threat Categories (16 Profiles)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
            {mitreData?.attack_classes && Object.entries(mitreData.attack_classes).map(([id, item]) => {
              const isSelected = selectedAttack?.name === item.name;
              const isTriggered = currentAttackName === item.name;

              return (
                <button
                  key={id}
                  onClick={() => setSelectedAttack(item)}
                  className="btn-secondary"
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    borderColor: isSelected ? 'var(--accent-cyan)' : isTriggered ? 'var(--accent-crimson)' : 'var(--border-subtle)',
                    background: isTriggered ? 'rgba(255, 0, 85, 0.12)' : isSelected ? 'rgba(0, 240, 255, 0.08)' : 'var(--bg-elevated)',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isTriggered ? '#FF0055' : 'var(--text-primary)' }}>
                      {item.name}
                    </span>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {item.mitre_id}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Stage {item.phase_idx}: {item.mitre_tactic}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Tactical Drill-Down & Containment Playbook */}
        {selectedAttack && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>MITRE ATT&CK PLAYBOOK</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {selectedAttack.name}
                </h3>
              </div>
              <div className="mono badge badge-elevated" style={{ fontSize: '0.85rem' }}>
                {selectedAttack.mitre_id}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-elevated)', padding: '14px', borderRadius: '10px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TACTIC</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{selectedAttack.mitre_tactic}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TECHNIQUE</div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{selectedAttack.mitre_technique}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-amber)', marginBottom: '8px' }}>
                🛡️ RECOMMENDED DEFENDER PLAYBOOK & CONTAINMENT
              </h4>
              <div style={{ background: 'rgba(255, 184, 0, 0.06)', border: '1px solid rgba(255, 184, 0, 0.2)', padding: '14px', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.5, color: '#E2E8F0' }}>
                {selectedAttack.recommended_action}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', gap: '10px' }}>
              <div className="badge badge-normal" style={{ fontSize: '0.7rem' }}>Automated SIEM Rule Ready</div>
              <div className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>Snort / Suricata Mapped</div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
