#!/bin/bash

# Azure App Service startup script for FastAPI application
echo "Starting Document Extraction MVP..."

# Install dependencies
echo "Installing dependencies..."
pip install -r backend/requirements.txt

# Set working directory to backend
cd backend

# Start the application with gunicorn for production
echo "Starting FastAPI with gunicorn..."
python -m gunicorn app.main:app --bind 0.0.0.0:8000 --workers 1 --timeout 300 