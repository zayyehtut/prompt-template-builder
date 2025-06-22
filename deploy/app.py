"""
Azure App Service entry point for Document Extraction MVP
"""

import sys
import os
from pathlib import Path

# Get the current directory
current_dir = Path(__file__).parent

# Add the current directory to Python path
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Import the FastAPI app
from main import app

# This is the WSGI callable that Azure will use
application = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 