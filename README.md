# Document Extraction MVP - "SQL for Documents" ✨

A production-ready document extraction system with **Dynamic Query capabilities** - allowing natural language queries against documents with AI-generated schemas. Migrated from HuggingFace Space to Azure cloud platform with complete "SQL for Documents" functionality.

## 🎯 **NEW: Dynamic Query System**

Transform any document into queryable data using natural language:

```bash
# Query: "Extract top five skills of this person"
# AI Response: Dynamically creates 'skills' schema with relevant data

# Query: "Get all products under $50 with descriptions"  
# AI Response: Creates 'products' schema with price filtering

# Query: "Find customer complaints and their severity"
# AI Response: Generates 'complaints' schema with severity analysis
```

**🌟 Key Features:**
- **Dynamic Schema Generation**: AI determines variable names, types, and structure
- **Smart Summarization**: Brief summaries for long extractions to reduce costs
- **Page Citations**: Automatic `[PAGE X]` references for traceability
- **Token Optimization**: Intelligent content processing for cost efficiency

## 🏗️ Architecture Overview

```
Frontend (React/Next.js) → Azure App Service (FastAPI) → OpenRouter API
                                     ↓
                           Azure Blob Storage (Documents)
                                     ↓
                           Application Insights (Monitoring)
```

## 📁 Project Structure

```
docu_extract_mvp/
├── backend/                 # FastAPI backend application
│   ├── app/                # Application source code
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile         # Container configuration
│   └── .env.example       # Environment variables template
├── frontend/               # React/Next.js frontend application
│   ├── src/               # Frontend source code
│   ├── package.json       # Node.js dependencies
│   └── .env.example       # Frontend environment variables
├── infrastructure/         # Azure infrastructure as code
│   ├── bicep/             # Azure Bicep templates
│   └── scripts/           # Deployment scripts
├── docs/                  # Documentation
├── .github/               # GitHub Actions workflows
├── TSD.md                 # Technical Specification Document
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Azure Account with Student Subscription
- Node.js 18+ and Python 3.11+
- Azure CLI installed
- Git configured

### Development Setup

1. **Clone and setup the repository**
   ```bash
   git clone <repository-url>
   cd docu_extract_mvp
   ```

2. **Backend Setup** ([following memory guidelines][[memory:3272068563168265192]])
   ```bash
   cd backend
   python -m venv .venv
   
   # Windows
   .venv\Scripts\activate
   # Linux/Mac
   source .venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Frontend Setup** ([following memory guidelines][[memory:2199631115299965007]])
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Configuration**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your Azure and OpenRouter credentials
   
   # Frontend
   cp frontend/.env.example frontend/.env.local
   # Edit frontend/.env.local with your API endpoints
   ```

5. **Run Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   uvicorn app.main:app --reload --port 8000
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

## 🔧 API Documentation

### **🆕 Dynamic Query API** - "SQL for Documents"

Query documents using natural language with completely dynamic schemas:

```typescript
// Basic Dynamic Query
const dynamicQuery = async (file: File, query: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('query', query);

  const response = await fetch('/api/dynamic-query', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
};

// Example Usage
const result = await dynamicQuery(pdfFile, "Extract teams who won matches");
// Returns: { "teams": [{"name": "Arsenal", "status": "winner", "score": "3-1"}] }
```

**Advanced Dynamic Query with Citations:**
```typescript
const advancedQuery = async (file: File, query: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('query', query);
  formData.append('enable_summarization', 'true');
  formData.append('enable_citations', 'true');

  const response = await fetch('/api/dynamic-query-advanced', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
};
```

### **📊 Testing the Dynamic Query System**

1. **Start the server:**
   ```bash
   python start_server.py
   ```

2. **Access Swagger UI:** `http://localhost:8000/docs`

3. **Try these endpoints:**
   - **`/api/dynamic-query`** - Basic dynamic queries
   - **`/api/dynamic-query-advanced`** - With summarization & citations
   - **`/api/analyze-query`** - Query intent analysis

### Legacy Template-Based API
Traditional extraction with predefined templates:

```typescript
const AZURE_API_URL = "https://your-app-service.azurewebsites.net";

export async function extractFromDocument(
  file: File,
  template: string | null,
  customPrompt: string | null
): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('template', template || '');
  formData.append('custom_prompt', customPrompt || '');

  const response = await fetch(`${AZURE_API_URL}/api/extract`, {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}
```

## 🏗️ Infrastructure Deployment

### Automated Deployment with Azure CLI

1. **Login to Azure**
   ```bash
   az login
   az account set --subscription "Your Azure Student Subscription"
   ```

2. **Deploy Infrastructure**
   ```bash
   cd infrastructure
   ./scripts/deploy.sh
   ```

3. **Deploy Application**
   ```bash
   # Backend deployment
   cd backend
   az webapp up --sku B1 --name your-app-name

   # Frontend deployment (if hosting on Azure)
   cd frontend
   npm run build
   az staticwebapp create --name your-frontend-name
   ```

## 📊 Cost Optimization

This architecture is optimized for Azure Student Subscription:

- **App Service Basic B1**: ~$13.50/month (includes 1.75 GB RAM, auto-scaling)
- **Blob Storage**: ~$2-5/month (depending on usage)
- **Application Insights**: Free tier (up to 1GB/month)
- **OpenRouter API**: Pay-per-use (typically $5-15/month depending on usage)

**Total Estimated Monthly Cost**: $20-35 (well within $100 student budget)

## 🔒 Security Features

- **Managed Identity**: Passwordless authentication between Azure services
- **Key Vault Integration**: Secure storage of API keys and secrets
- **HTTPS Only**: All communication encrypted in transit
- **CORS Configuration**: Controlled frontend access
- **File Validation**: Comprehensive upload security

## 📈 Monitoring & Observability

- **Application Insights**: Real-time performance monitoring
- **Health Checks**: Automated service health monitoring
- **Cost Alerts**: Budget monitoring and alerts
- **Error Tracking**: Comprehensive error logging and alerting

## 🚀 Deployment Pipeline

The project includes GitHub Actions workflows for:

- **Automated Testing**: Unit tests, integration tests, security scans
- **Blue-Green Deployment**: Zero-downtime deployments
- **Environment Management**: Separate dev/staging/production environments
- **Cost Monitoring**: Automated cost reporting

## 📚 Documentation

- [Technical Specification Document (TSD)](./TSD.md) - Comprehensive technical requirements
- [API Documentation](./docs/api.md) - Detailed API reference
- [Deployment Guide](./docs/deployment.md) - Step-by-step deployment instructions
- [Cost Optimization Guide](./docs/cost-optimization.md) - Azure cost management strategies

## 🤝 Contributing

1. Follow the [GitHub workflow guidelines](./.github/CONTRIBUTING.md)
2. All changes must reference TSD sections
3. Create issues before starting development
4. Use conventional commit messages
5. Ensure tests pass before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Create GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions

---

**Project Status**: ✅ **DYNAMIC QUERY SYSTEM COMPLETE!**  
**Current Phase**: **MVP Functional** - "SQL for Documents" Working  
**Achievements**: 
- ✅ Dynamic Schema Generation with AI
- ✅ Smart Summarization & Citations
- ✅ Token Optimization for Cost Efficiency
- ✅ 3 Dynamic Query API Endpoints
- ✅ Full Swagger UI Documentation

**Next Steps**: Frontend Integration & Production Deployment 