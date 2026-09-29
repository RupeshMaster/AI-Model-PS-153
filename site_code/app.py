import sys
import os
import uvicorn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    # If Hugging Face flattened the folder and put server.py in the root
    from server import app
except ModuleNotFoundError:
    # If the backend folder was preserved
    from backend.server import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
