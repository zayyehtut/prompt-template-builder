#!/usr/bin/env python3
"""
Simple startup script for the Document Extraction API development server.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_environment():
    """Check if the environment is properly set up."""
    print("🔍 Checking environment setup...")
    
    # Check if we're in the right directory
    backend_dir = Path(__file__).parent / "backend"
    if not backend_dir.exists():
        print("❌ Backend directory not found. Make sure you're in the project root.")
        return False
    
    # Check if virtual environment exists
    venv_dir = backend_dir / "venv"
    if not venv_dir.exists():
        print("⚠️  Virtual environment not found. Creating one...")
        try:
            subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)
            print("✅ Virtual environment created")
        except subprocess.CalledProcessError:
            print("❌ Failed to create virtual environment")
            return False
    
    # Check for .env file
    env_file = backend_dir / ".env"
    if not env_file.exists():
        env_example = backend_dir.parent / "environment.example"
        if env_example.exists():
            print("⚠️  .env file not found. Copying from environment.example...")
            import shutil
            shutil.copy(env_example, env_file)
            print("✅ .env file created from template")
            print("🔑 Please edit .env and add your OpenRouter API key")
        else:
            print("❌ No .env file found and no environment.example to copy from")
            return False
    
    print("✅ Environment check completed")
    return True

def install_requirements():
    """Install requirements if needed."""
    backend_dir = Path(__file__).parent / "backend"
    requirements_file = backend_dir / "requirements.txt"
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    print("📦 Installing requirements...")
    try:
        # Determine the python executable in venv
        if sys.platform == "win32":
            python_exe = backend_dir / "venv" / "Scripts" / "python.exe"
            pip_exe = backend_dir / "venv" / "Scripts" / "pip.exe"
        else:
            python_exe = backend_dir / "venv" / "bin" / "python"
            pip_exe = backend_dir / "venv" / "bin" / "pip"
        
        # Install requirements
        subprocess.run([str(pip_exe), "install", "-r", str(requirements_file)], check=True)
        print("✅ Requirements installed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def start_server():
    """Start the development server."""
    backend_dir = Path(__file__).parent / "backend"
    
    print("🚀 Starting development server...")
    
    # Determine the uvicorn executable in venv
    if sys.platform == "win32":
        uvicorn_exe = backend_dir / "venv" / "Scripts" / "uvicorn.exe"
    else:
        uvicorn_exe = backend_dir / "venv" / "bin" / "uvicorn"
    
    try:
        # Change to backend directory
        os.chdir(backend_dir)
        
        # Start uvicorn
        subprocess.run([
            str(uvicorn_exe),
            "app.main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ], check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start server: {e}")
        return False
    except KeyboardInterrupt:
        print("\n✅ Server stopped by user")
        return True

def main():
    """Main startup routine."""
    print("🔧 Document Extraction API - Development Server")
    print("=" * 50)
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment setup failed. Please check the errors above.")
        return False
    
    # Ask user if they want to install/update requirements
    install_deps = input("\n📦 Install/update requirements? (y/N): ").lower().strip()
    if install_deps in ['y', 'yes']:
        if not install_requirements():
            print("\n❌ Requirements installation failed.")
            return False
    
    # Check if .env has API key
    backend_dir = Path(__file__).parent / "backend"
    env_file = backend_dir / ".env"
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_content = f.read()
            if 'OPENROUTER_API_KEY=' not in env_content or 'your_api_key_here' in env_content:
                print("\n🔑 WARNING: OpenRouter API key not configured in .env file")
                print("   Please edit .env and add your API key before testing")
    
    print("\n🚀 Starting server...")
    print("   Server will be available at: http://localhost:8000")
    print("   API docs will be at: http://localhost:8000/docs")
    print("   Press Ctrl+C to stop the server")
    print("\n" + "=" * 50)
    
    # Start the server
    return start_server()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 