import sys
import os
import uvicorn

# Ensure the current directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.server import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
