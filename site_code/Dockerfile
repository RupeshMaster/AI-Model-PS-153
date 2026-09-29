FROM python:3.12-slim

WORKDIR /app

# Copy all project files (including models)
COPY . .

# Install dependencies from backend folder
RUN pip install --no-cache-dir -r backend/requirements.txt

# Expose Hugging Face default port
EXPOSE 7860

# Run FastAPI with Uvicorn from the backend directory module
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "7860"]
