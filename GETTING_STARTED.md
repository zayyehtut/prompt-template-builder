# 🚀 Getting Started - Document Extraction MVP

## Quick Setup Guide

This guide will help you get the Document Extraction API running locally and prepare it for Azure deployment.

### 🔧 Prerequisites

Before you begin, ensure you have:

- **Python 3.11+** installed
- **OpenRouter API Key** (get one at [openrouter.ai](https://openrouter.ai/keys))
- **Azure Account** with Student Subscription
- **Git** configured
- **Azure CLI** installed (optional, for deployment)

### 📦 Installation Steps

#### 1. **Setup Backend Environment**

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (following your memory guidelines)
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. **Configure Environment Variables**

```bash
# Copy environment template
cp environment.example .env

# Edit .env file with your configuration
# At minimum, you need to set:
# OPENROUTER_API_KEY=your_actual_api_key_here
```

**Required Configuration:**
- `OPENROUTER_API_KEY`: Your OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)

**Optional Configuration:**
- Azure Storage connection string (for document storage)
- Azure Application Insights (for monitoring)
- Custom templates and processing settings

#### 3. **Start the Development Server**

```bash
# From the backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Main API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 🧪 Testing the API

#### Health Check
```bash
curl http://localhost:8000/health
```

#### Document Extraction Test
```bash
# Test with a simple text file
curl -X POST "http://localhost:8000/api/extract" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_document.txt" \
  -F "template=emails"
```

### 🌐 Frontend Integration

Your existing frontend code needs minimal changes. Update your API client:

```typescript
// Before (HuggingFace Space)
const HF_SPACE_URL = "https://huggingcode123-extractthis.hf.space/";

// After (Local/Azure)
const API_URL = "http://localhost:8000";  // Local development
// const API_URL = "https://your-app.azurewebsites.net";  // Azure production

export async function extractFromDocument(
  file: File,
  template: string | null,
  customPrompt: string | null
): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (template) formData.append('template', template);
  if (customPrompt) formData.append('custom_prompt', customPrompt);

  const response = await fetch(`${API_URL}/api/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
```

### ☁️ Azure Deployment

#### Option 1: Azure App Service (Recommended)

```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-docu-extract --location eastus

# Deploy to App Service
cd backend
az webapp up --sku B1 --name your-unique-app-name --resource-group rg-docu-extract
```

#### Option 2: Azure Container Apps

```bash
# Build and deploy container
cd backend
az containerapp up --name docu-extract --resource-group rg-docu-extract
```

### 💰 Cost Optimization Tips

**For Azure Student Subscription ($100/month):**

1. **Use Basic App Service Plan (B1)**: ~$13/month
2. **Enable auto-scaling**: Scale down to 0 when not in use
3. **Use consumption-based OpenRouter**: Pay only for what you use
4. **Implement document cleanup**: Auto-delete old files from storage
5. **Monitor costs**: Set up budget alerts in Azure

**Estimated Monthly Costs:**
- App Service B1: $13
- Blob Storage: $2-5
- Application Insights: Free tier
- OpenRouter API: $5-15 (usage-based)
- **Total: $20-35/month**

### 🔍 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/api/extract` | POST | Main document extraction |
| `/predict` | POST | Legacy endpoint (HF compatibility) |
| `/api/templates` | GET | Available extraction templates |
| `/metrics` | GET | Service metrics |

### 📊 Available Templates

- **emails**: Extract email addresses and related info
- **contacts**: Extract contact information
- **invoices**: Extract invoice details and amounts
- **resumes**: Extract candidate information
- **contracts**: Extract contract terms and parties
- **medical**: Extract medical information
- **financial**: Extract financial data

### 🛠️ Development Tools

#### API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Get available templates
curl http://localhost:8000/api/templates

# Extract with custom prompt
curl -X POST "http://localhost:8000/api/extract" \
  -F "file=@document.pdf" \
  -F "custom_prompt=Extract all phone numbers and email addresses"
```

#### Using Python requests

```python
import requests

# Test extraction
with open('document.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:8000/api/extract',
        files={'file': f},
        data={'template': 'contacts'}
    )
    
print(response.json())
```

### 🐛 Troubleshooting

#### Common Issues:

1. **Import Errors**: Make sure virtual environment is activated and dependencies installed
2. **OpenRouter API Errors**: Verify your API key is correct and has sufficient credits
3. **File Upload Errors**: Check file size limits (50MB max) and supported formats
4. **CORS Errors**: Ensure your frontend URL is in `ALLOWED_ORIGINS`

#### Debug Mode:

```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=DEBUG

# Run with detailed logs
uvicorn app.main:app --reload --log-level debug
```

### 📈 Monitoring and Logging

The application includes comprehensive logging and monitoring:

- **Structured Logging**: JSON format for Azure Application Insights
- **Request Tracing**: Unique request IDs for debugging
- **Performance Metrics**: Response times and processing statistics
- **Error Tracking**: Detailed error logs with stack traces
- **Cost Tracking**: Usage metrics for cost optimization

### 🔐 Security Features

- **CORS Protection**: Configured allowed origins
- **File Validation**: Size and type restrictions
- **Error Sanitization**: No internal details leaked to users
- **Request Rate Limiting**: Prevent abuse
- **Secure Headers**: Added security headers for production

### 🚀 Next Steps

1. **Test Locally**: Get the basic API working with your OpenRouter key
2. **Frontend Integration**: Update your frontend to use the new API
3. **Azure Setup**: Create Azure resources and deploy
4. **Domain Setup**: Configure custom domain and SSL
5. **Monitoring**: Set up Application Insights and cost alerts
6. **Optimization**: Fine-tune performance and costs

### 📞 Support

- **Documentation**: Check the `/docs` endpoint for interactive API docs
- **Issues**: Create GitHub issues for bugs and feature requests
- **Logs**: Check application logs for detailed error information

---

**Happy coding! 🎉**

Your Document Extraction API is now ready for Azure migration and will maintain full compatibility with your existing frontend while providing better performance, security, and cost control. 