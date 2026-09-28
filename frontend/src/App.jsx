import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LiveDashboard from './pages/LiveDashboard';
import MitreProgression from './pages/MitreProgression';
import FlowInspector from './pages/FlowInspector';
import XaiStudio from './pages/XaiStudio';
import BenchmarkLab from './pages/BenchmarkLab';
import IncidentReports from './pages/IncidentReports';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentFrame, setCurrentFrame] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [kSteps, setKSteps] = useState(4);
  const [uploading, setUploading] = useState(false);
  const [uploadNotification, setUploadNotification] = useState(null);
  const [sampleDatasets, setSampleDatasets] = useState([]);

  const wsRef = useRef(null);

  // Initialize WebSocket Connection
  useEffect(() => {
    let ws;
    let reconnectTimer;

    const connectWebSocket = () => {
      ws = new WebSocket('ws://localhost:8000/ws/stream');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AEGIS WS] Connected to live telemetry stream');
        setConnectionStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setCurrentFrame(data);
          if (typeof data.is_playing === 'boolean') {
            setIsPlaying(data.is_playing);
          }
        } catch (err) {
          console.error('[AEGIS WS] Error parsing frame:', err);
        }
      };

      ws.onclose = () => {
        console.log('[AEGIS WS] Disconnected. Reconnecting in 2s...');
        setConnectionStatus('DISCONNECTED');
        reconnectTimer = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = (err) => {
        console.error('[AEGIS WS] Error:', err);
        setConnectionStatus('ERROR');
      };
    };

    connectWebSocket();

    // Fetch available sample captures
    fetch('http://localhost:8000/api/datasets')
      .then(res => res.json())
      .then(data => {
        if (data.datasets) setSampleDatasets(data.datasets);
      })
      .catch(err => console.error("Error fetching datasets:", err));

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Send control messages over WebSocket
  const sendControl = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      if (payload.action === 'PLAY') setIsPlaying(true);
      if (payload.action === 'PAUSE') setIsPlaying(false);
      if (payload.action === 'RESET') setIsPlaying(false);
    }
  };

  // Upload CSV Telemetry (up to 500MB)
  const handleFileUpload = async (fileOrEvent) => {
    let file = null;
    if (fileOrEvent?.target?.files) {
      file = fileOrEvent.target.files[0];
    } else if (fileOrEvent instanceof File) {
      file = fileOrEvent;
    }
    if (!file) return;

    setUploading(true);
    setUploadNotification({ type: 'info', message: `Uploading and ingesting ${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)...` });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUploadNotification({
          type: 'success',
          message: `Successfully ingested ${data.total_events} events from ${data.source}! Ready to simulate. Click START SIMULATION.`
        });
        sendControl({ action: 'RESET' });
      } else {
        setUploadNotification({
          type: 'error',
          message: `Upload error: ${data.message || 'Unknown server error'}`
        });
      }
    } catch (err) {
      setUploadNotification({
        type: 'error',
        message: `Network error during upload: ${err.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  // Quick-load sample dataset from server
  const loadSampleDataset = async (filename) => {
    setUploading(true);
    setUploadNotification({ type: 'info', message: `Loading sample dataset: ${filename}...` });
    const formData = new FormData();
    formData.append('filename', filename);

    try {
      const res = await fetch('http://localhost:8000/api/load-sample', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUploadNotification({
          type: 'success',
          message: `Ingested ${data.total_events} events from ${data.source}. Ready to simulate!`
        });
        sendControl({ action: 'RESET' });
      }
    } catch (err) {
      setUploadNotification({
        type: 'error',
        message: `Error loading sample: ${err.message}`
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navigation Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentFrame={currentFrame} 
        connectionStatus={connectionStatus} 
      />

      {/* Main Content View Container */}
      <main style={{ flex: 1, padding: '0 16px 24px 16px', maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
        {activeTab === 'dashboard' && (
          <LiveDashboard 
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            sendControl={sendControl}
            uploading={uploading}
            uploadNotification={uploadNotification}
            handleFileUpload={handleFileUpload}
            kSteps={kSteps}
            setKSteps={setKSteps}
            speed={speed}
            setSpeed={setSpeed}
            sampleDatasets={sampleDatasets}
            loadSampleDataset={loadSampleDataset}
          />
        )}

        {activeTab === 'mitre' && (
          <MitreProgression currentFrame={currentFrame} />
        )}

        {activeTab === 'inspector' && (
          <FlowInspector currentFrame={currentFrame} />
        )}

        {activeTab === 'xai' && (
          <XaiStudio currentFrame={currentFrame} />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkLab currentFrame={currentFrame} />
        )}

        {activeTab === 'reports' && (
          <IncidentReports currentFrame={currentFrame} />
        )}
      </main>

    </div>
  );
}
