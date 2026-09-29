import uvicorn
from backend.server import app

if __name__ == "__main__":
    # Hugging Face Gradio/Blank spaces route traffic to port 7860 by default
    uvicorn.run(app, host="0.0.0.0", port=7860)
