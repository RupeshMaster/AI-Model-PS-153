"""
MITRE ATT&CK Kill Chain & Tactical Progression Engine
Provides structured mapping from granular network attack classifications to:
1. Canonical Cyber Kill Chain Phases (Reconnaissance -> Initial Access -> Lateral Movement -> C2 -> Impact)
2. MITRE ATT&CK Tactics & Techniques (IDs)
3. Defensive Mitigation Guidance
"""

MITRE_PHASES = {
    0: {
        "name": "Benign / Normal Operations",
        "description": "Legitimate baseline network telemetry without malicious anomalies.",
        "severity": "NORMAL",
        "color": "#28a745"
    },
    1: {
        "name": "Reconnaissance",
        "description": "Adversary is actively scanning, probing ports, and mapping network topology.",
        "severity": "LOW",
        "color": "#17a2b8"
    },
    2: {
        "name": "Initial Access",
        "description": "Adversary attempting entry via credential brute forcing or public exploit vectors.",
        "severity": "MEDIUM",
        "color": "#ffc107"
    },
    3: {
        "name": "Lateral Movement & Infiltration",
        "description": "Adversary has breached perimeter and is navigating internally between hosts.",
        "severity": "HIGH",
        "color": "#fd7e14"
    },
    4: {
        "name": "Command and Control (C2)",
        "description": "Compromised internal host communicating with external attacker bot infrastructure.",
        "severity": "CRITICAL",
        "color": "#dc3545"
    },
    5: {
        "name": "Exfiltration & Impact",
        "description": "Adversary actively executing resource exhaustion (DoS/DDoS) or data disruption.",
        "severity": "CRITICAL",
        "color": "#721c24"
    }
}

ATTACK_CLASS_MAP = {
    0: {
        "name": "Benign",
        "phase_idx": 0,
        "mitre_tactic": "None",
        "mitre_technique": "Normal Traffic",
        "mitre_id": "None",
        "recommended_action": "No action required. Telemetry within normal statistical bounds."
    },
    1: {
        "name": "FTP-BruteForce",
        "phase_idx": 2,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "Brute Force: Password Guessing",
        "mitre_id": "T1110.001",
        "recommended_action": "Rate-limit FTP authentication, enforce account lockouts, and inspect repeated SYN requests on port 21."
    },
    2: {
        "name": "SSH-Bruteforce",
        "phase_idx": 2,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "Brute Force: Password Spraying",
        "mitre_id": "T1110.003",
        "recommended_action": "Disable password authentication on SSH (enforce key-based auth) and block high-frequency connection bursts."
    },
    3: {
        "name": "DoS attacks-GoldenEye",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Direct Network Flood",
        "mitre_id": "T1498.001",
        "recommended_action": "Deploy WAF rate limiting on HTTP Keep-Alive headers and terminate exhausted connection pools."
    },
    4: {
        "name": "DoS attacks-Slowloris",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Asymmetric Resource Consumption",
        "mitre_id": "T1498.002",
        "recommended_action": "Set aggressive HTTP read timeouts, limit concurrent open sockets per IP, and use reverse proxy buffering."
    },
    5: {
        "name": "DoS attacks-SlowHTTPTest",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Asymmetric Resource Consumption",
        "mitre_id": "T1498.002",
        "recommended_action": "Enforce minimum incoming transfer rate on HTTP POST payloads and drop slow clients."
    },
    6: {
        "name": "DoS attacks-Hulk",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Direct Network Flood",
        "mitre_id": "T1498.001",
        "recommended_action": "Enable cloud DDoS scrubbing, rate-limit unique user-agent permutations, and apply SYN cookies."
    },
    7: {
        "name": "Brute Force -Web",
        "phase_idx": 2,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "Brute Force: Credential Stuffing",
        "mitre_id": "T1110.004",
        "recommended_action": "Implement CAPTCHA, MFA on login endpoints, and block automated HTTP POST bursts."
    },
    8: {
        "name": "Brute Force -XSS",
        "phase_idx": 2,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "Exploit Public-Facing Application",
        "mitre_id": "T1190",
        "recommended_action": "Apply strict Content Security Policy (CSP), sanitize input parameters, and block script injection patterns."
    },
    9: {
        "name": "SQL Injection",
        "phase_idx": 2,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "Exploit Public-Facing Application: SQLi",
        "mitre_id": "T1190",
        "recommended_action": "Enforce parameterized queries / ORM prepared statements and block UNION/SLEEP payload signatures in WAF."
    },
    10: {
        "name": "Infiltration",
        "phase_idx": 3,
        "mitre_tactic": "Lateral Movement",
        "mitre_technique": "Remote Services: SMB/RPC Lateral Movement",
        "mitre_id": "T1021",
        "recommended_action": "CRITICAL: Segment network zones immediately, isolate infected host IP, and revoke active internal session tokens."
    },
    11: {
        "name": "Bot",
        "phase_idx": 4,
        "mitre_tactic": "Command and Control",
        "mitre_technique": "Application Layer Protocol: C2 Beaconing",
        "mitre_id": "T1071.001",
        "recommended_action": "Sinkhole external C2 domain/IP, quarantine internal infected host, and inspect periodic beaconing timers."
    },
    12: {
        "name": "DDOS attack-LOIC-UDP",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: UDP Flood",
        "mitre_id": "T1498.001",
        "recommended_action": "Block incoming high-volume UDP traffic on non-essential ports at edge router via BGP Flowspec."
    },
    13: {
        "name": "DDOS attack-HOIC",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Distributed HTTP Flood",
        "mitre_id": "T1498.001",
        "recommended_action": "Activate upstream DDoS mitigation scrubbing center and enforce client challenge verification."
    },
    14: {
        "name": "DDoS attacks-LOIC-HTTP",
        "phase_idx": 5,
        "mitre_tactic": "Impact",
        "mitre_technique": "Network Denial of Service: Distributed HTTP Flood",
        "mitre_id": "T1498.001",
        "recommended_action": "Enable geometric challenge-response and rate-limit HTTP GET request bursts per second."
    },
    15: {
        "name": "Label",
        "phase_idx": 0,
        "mitre_tactic": "Unknown",
        "mitre_technique": "Unclassified Anomaly",
        "mitre_id": "T0000",
        "recommended_action": "Review anomalous packet structure in SIEM."
    }
}

STRING_LABEL_TO_CLASS = {v["name"]: k for k, v in ATTACK_CLASS_MAP.items()}
