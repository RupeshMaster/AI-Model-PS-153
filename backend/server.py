import os
import sys
import json
import time
import asyncio
from typing import Optional, Dict, Any, List
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, JSONResponse

# Add parent directory and model directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model")
for p in [BASE_DIR, MODEL_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.stream_engine import TelemetryStreamEngine
except ImportError:
    from stream_engine import TelemetryStreamEngine
# pyrefly: ignore [missing-import]
from mitre_mapping import MITRE_PHASES, ATTACK_CLASS_MAP

app = FastAPI(
    title="AI Network World Model API",
    description="Proactive Network Attack Forecasting & K-Step Rollout Platform (NTRO PS 26153)",
    version="2.0.0"
)

# Enable CORS for React Vite client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engine
engine = TelemetryStreamEngine()

# Ensure uploads directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- REST ENDPOINTS ---

@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "engine_ready": engine.total_events > 0,
        "weights_loaded": engine.weights_loaded,
        "device": str(engine.device),
        "total_events": engine.total_events,
        "current_event": engine.current_index + engine.seq_length,
        "k_steps": engine.k_steps,
        "speed": engine.speed,
        "is_playing": engine.is_playing
    }

@app.get("/api/model/info")
def get_model_info():
    meta_path = os.path.join(MODEL_DIR, "world_model_meta.json")
    if not os.path.exists(meta_path):
        meta_path = os.path.join(BASE_DIR, "world_model_meta.json")
    
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
    else:
        metadata = {
            "model_type": "NetworkWorldModel",
            "input_features": 78,
            "hidden_size": 128,
            "num_layers": 2,
            "num_mitre_phases": 6,
            "num_classes": 16,
            "seq_length": 10
        }
    return metadata

@app.get("/api/mitre/matrix")
def get_mitre_matrix():
    return {
        "phases": MITRE_PHASES,
        "attack_classes": ATTACK_CLASS_MAP
    }

@app.get("/api/benchmark")
def get_benchmark():
    report_path = os.path.join(MODEL_DIR, "model_performance_report.md")
    if not os.path.exists(report_path):
        report_path = os.path.join(BASE_DIR, "model_performance_report.md")

    report_text = ""
    if os.path.exists(report_path):
        with open(report_path, "r", encoding="utf-8") as f:
            report_text = f.read()

    return {
        "metrics": {
            "world_model": {
                "accuracy": 99.95,
                "precision": 99.97,
                "recall": 99.95,
                "f1_score": 99.96,
                "false_positive_rate": 2.4262,
                "dynamics_mse": 0.021710,
                "lead_time_advantage": "Up to 4 Time Horizons Ahead"
            },
            "baseline_logistic_regression": {
                "accuracy": 100.00,
                "precision": 100.00,
                "recall": 100.00,
                "f1_score": 100.00,
                "false_positive_rate": 0.5376,
                "dynamics_mse": "N/A (No temporal state dynamics)",
                "lead_time_advantage": "0 Horizons (Reactive only)"
            }
        },
        "report_markdown": report_text
    }

@app.get("/api/confusion-matrix")
def get_confusion_matrix_image():
    cm_path = os.path.join(MODEL_DIR, "confusion_matrix.png")
    if not os.path.exists(cm_path):
        cm_path = os.path.join(BASE_DIR, "confusion_matrix.png")
    if os.path.exists(cm_path):
        return FileResponse(cm_path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Confusion matrix image not found")

@app.get("/api/confusion-matrix/download")
def download_confusion_matrix_image():
    cm_path = os.path.join(MODEL_DIR, "confusion_matrix.png")
    if not os.path.exists(cm_path):
        cm_path = os.path.join(BASE_DIR, "confusion_matrix.png")
    if os.path.exists(cm_path):
        return FileResponse(
            cm_path, 
            media_type="image/png", 
            filename="world_model_confusion_matrix.png",
            headers={"Content-Disposition": "attachment; filename=world_model_confusion_matrix.png"}
        )
    raise HTTPException(status_code=404, detail="Confusion matrix image not found")

@app.get("/api/confusion-matrix/data")
def get_confusion_matrix_data():
    data_path = os.path.join(MODEL_DIR, "confusion_matrix_data.json")
    if not os.path.exists(data_path):
        data_path = os.path.join(BASE_DIR, "confusion_matrix_data.json")
    if os.path.exists(data_path):
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Confusion matrix data not found")

@app.get("/api/benchmark/download-report")
def download_benchmark_report():
    report_path = os.path.join(MODEL_DIR, "model_performance_report.md")
    if not os.path.exists(report_path):
        report_path = os.path.join(BASE_DIR, "model_performance_report.md")
    if os.path.exists(report_path):
        return FileResponse(
            report_path, 
            media_type="text/markdown", 
            filename="model_performance_report.md",
            headers={"Content-Disposition": "attachment; filename=model_performance_report.md"}
        )
    raise HTTPException(status_code=404, detail="Benchmark report not found")

@app.get("/api/datasets")
def list_available_datasets():
    datasets = []
    possible_dirs = [
        os.path.join(BASE_DIR, "Cleaned_Data", "Cleaned_Data"),
        os.path.join(BASE_DIR, "Cleaned_Data")
    ]
    for d in possible_dirs:
        if os.path.exists(d):
            files = [f for f in os.listdir(d) if f.endswith(".csv")]
            for f in files:
                fpath = os.path.join(d, f)
                size_mb = round(os.path.getsize(fpath) / (1024 * 1024), 2)
                datasets.append({
                    "filename": f,
                    "size_mb": size_mb,
                    "path": fpath
                })
    return {"datasets": datasets}

@app.post("/api/load-sample")
def load_sample_dataset(filename: str = Form(...)):
    data_info = list_available_datasets()
    for d in data_info["datasets"]:
        if d["filename"] == filename:
            res = engine.load_dataset(d["path"], nrows=8000, source_name=filename)
            return res
    raise HTTPException(status_code=404, detail="Sample dataset not found")

@app.post("/api/upload")
async def upload_telemetry_csv(file: UploadFile = File(...)):
    """Handles streaming upload of CSV telemetry files up to 500MB."""
    try:
        dest_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(dest_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024 * 5): # 5MB chunk
                buffer.write(chunk)

        result = engine.load_dataset(dest_path, nrows=10000, source_name=file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flagged-flows")
def get_flagged_flows():
    return {
        "total_flagged": len(engine.flagged_flows),
        "flows": engine.flagged_flows
    }

@app.post("/api/incident/export")
def export_incident_report():
    report = {
        "report_id": f"INC-{int(time.time())}",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "defcon_level": 1 if any(f["severity"] == "CRITICAL" for f in engine.flagged_flows) else 3,
        "total_events_analyzed": engine.current_index + engine.seq_length,
        "total_flagged_threats": len(engine.flagged_flows),
        "threat_summary": engine.flagged_flows[:15],
        "system_status": "World Model Active Monitoring"
    }
    return report


# --- WEBSOCKET STREAMING ENGINE ---

@app.websocket("/ws/stream")
async def websocket_telemetry_stream(websocket: WebSocket):
    await websocket.accept()
    print("[WEBSOCKET] Client connected to live telemetry stream.")

    try:
        # Immediately send current state snapshot so the UI is active upon connect
        snapshot = engine.peek_frame()
        if snapshot:
            await websocket.send_json(snapshot)

        while True:
            # Check for incoming client control messages without blocking
            try:
                msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.01)
                action = msg.get("action")
                if action == "PLAY":
                    engine.set_playback(True)
                elif action == "PAUSE":
                    engine.set_playback(False)
                elif action == "SET_SPEED":
                    engine.set_speed(float(msg.get("speed", 1.0)))
                elif action == "SET_HORIZON":
                    engine.set_horizon(int(msg.get("k_steps", 4)))
                elif action == "STEP":
                    engine.set_playback(False)
                    frame = engine.next_frame()
                    if frame:
                        await websocket.send_json(frame)
                elif action == "SEEK":
                    target = int(msg.get("event_index", 10))
                    engine.seek_to(target)
                    snapshot = engine.peek_frame()
                    if snapshot:
                        await websocket.send_json(snapshot)
                elif action == "RESET":
                    engine.reset_stream()
                    snapshot = engine.peek_frame()
                    if snapshot:
                        await websocket.send_json(snapshot)
            except asyncio.TimeoutError:
                pass

            # If playing, generate next frame and send
            if engine.is_playing:
                frame = engine.next_frame()
                if frame:
                    try:
                        await websocket.send_json(frame)
                        if frame.get("is_completed"):
                            engine.set_playback(False)
                    except Exception as err:
                        print(f"[WEBSOCKET] Send error: {err}")
                        break
                # Compute delay scaled by speed (faster delay for high speeds)
                delay = max(0.005, 0.04 / (engine.speed ** 0.5))
                await asyncio.sleep(delay)
            else:
                await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        print("[WEBSOCKET] Client disconnected.")
    except Exception as e:
        print(f"[WEBSOCKET] Unexpected Error: {e}")

if __name__ == "__main__":
    # pyrefly: ignore [missing-import]
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
