"""
Document Extraction MVP - FastAPI Backend
Azure-hosted replacement for HuggingFace Space backend
Maintains API compatibility with existing frontend while leveraging Azure services
"""

from contextlib import asynccontextmanager
from typing import Dict, Optional, Union, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import structlog

from .config import get_settings
from .models import (
    ExtractResponse,
    TemplateExtractionResult,
    AIExtractionResult,
    ErrorResult,
    HealthResponse
)
from .services.document_processor import DocumentProcessor
from .services.openrouter_client import OpenRouterClient

from .services.dynamic_query_service import DynamicQueryService
from .middleware.logging import setup_logging
from .middleware.error_handling import setup_error_handlers

# Configure structured logging
setup_logging()
logger = structlog.get_logger(__name__)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup/shutdown tasks"""
    logger.info("Starting Document Extraction API", version="1.0.0")
    
    # Initialize services
    try:
        # Initialize OpenRouter client
        app.state.openrouter_client = OpenRouterClient(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url
        )
        
        # Initialize document processor (no storage needed - process in-memory)
        app.state.document_processor = DocumentProcessor(
            openrouter_client=app.state.openrouter_client,
        )
        
        # Initialize dynamic query service
        app.state.dynamic_query_service = DynamicQueryService(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url
        )
        
        logger.info("Services initialized successfully")
        yield
        
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise
    finally:
        logger.info("Shutting down Document Extraction API")

# Create FastAPI application with enhanced configuration
app = FastAPI(
    title="Document Extraction API",
    description="Azure-hosted document extraction service with AI-powered insights",
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint for monitoring and load balancer probes
    """
    try:
        # Check OpenRouter connectivity
        openrouter_status = "healthy"
        try:
            await app.state.openrouter_client.health_check()
        except Exception as e:
            logger.warning("OpenRouter health check failed", error=str(e))
            openrouter_status = "unhealthy"
        
        overall_status = "healthy" if openrouter_status == "healthy" else "degraded"
        
        return HealthResponse(
            status=overall_status,
            version="1.0.0",
            environment=settings.environment,
            services={
                "openrouter": openrouter_status
            }
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )

@app.post("/api/extract", response_model=ExtractResponse, tags=["Document Processing"])
async def extract_from_document(
    file: UploadFile = File(..., description="Document file to process"),
    template: Optional[str] = Form(None, description="Extraction template name"),
    custom_prompt: Optional[str] = Form(None, description="Custom extraction prompt")
) -> ExtractResponse:
    """
    Main document extraction endpoint - maintains compatibility with existing frontend
    
    Processes uploaded documents using AI extraction with specified templates or custom prompts.
    Supports multiple document formats: PDF, DOCX, TXT, images (PNG, JPG, JPEG).
    """
    logger.info(
        "Document extraction request",
        filename=file.filename,
        content_type=file.content_type,
        template=template,
        has_custom_prompt=bool(custom_prompt)
    )
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file size (50MB limit)
        if file.size and file.size > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 50MB limit"
            )
        
        # Process document
        result = await app.state.document_processor.process_document(
            file=file,
            template=template,
            custom_prompt=custom_prompt
        )
        
        logger.info(
            "Document extraction completed",
            filename=file.filename,
            result_type=type(result).__name__
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Document extraction failed",
            filename=file.filename,
            error=str(e),
            exc_info=True
        )
        return ErrorResult(error=f"Processing failed: {str(e)}")


@app.post("/api/dynamic-query", response_model=Union[AIExtractionResult, ErrorResult], tags=["Dynamic Query"])
async def dynamic_query_extraction(
    file: UploadFile = File(..., description="Document file to analyze"),
    query: str = Form(..., description="Natural language query like 'Extract teams who lost to Arsenal'")
) -> Union[AIExtractionResult, ErrorResult]:
    """
    Dynamic Query Extraction - "SQL for Documents"
    
    Process natural language queries against documents with completely dynamic schema generation.
    The AI determines variable names, types, and structure based on your query intent.
    
    Examples:
    - "Extract the team and their status who lost to Arsenal"
    - "Get all product prices and categories" 
    - "Find customer complaints and their severity"
    """
    logger.info(
        "Dynamic query request",
        filename=file.filename,
        query=query,
        content_type=file.content_type
    )
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Validate query
        if not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query cannot be empty"
            )
        
        # Check file size (50MB limit)
        if file.size and file.size > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 50MB limit"
            )
        
        # Extract text from document first
        document_text = await app.state.document_processor.extract_text_from_file(file)
        
        if not document_text.strip():
            return ErrorResult(error="Could not extract text from document")
        
        # Process with dynamic query service
        result = await app.state.dynamic_query_service.process_dynamic_query(
            document_text=document_text,
            natural_query=query.strip()
        )
        
        logger.info(
            "Dynamic query completed",
            filename=file.filename,
            query=query,
            result_type=type(result).__name__
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Dynamic query failed",
            filename=file.filename,
            query=query,
            error=str(e),
            exc_info=True
        )
        return ErrorResult(error=f"Dynamic query processing failed: {str(e)}")


@app.post("/api/analyze-query", response_model=Dict[str, Any], tags=["Dynamic Query"])
async def analyze_query_intent(
    query: str = Form(..., description="Natural language query to analyze")
) -> Dict[str, Any]:
    """
    Analyze Query Intent
    
    Analyze a natural language query to understand what data structure would be most appropriate.
    This helps users understand how their query will be interpreted before processing a document.
    """
    logger.info("Query intent analysis", query=query)
    
    try:
        if not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query cannot be empty"
            )
        
        result = await app.state.dynamic_query_service.analyze_query_intent(query.strip())
        
        logger.info("Query intent analysis completed", query=query)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Query intent analysis failed", query=query, error=str(e))
        return {"error": f"Analysis failed: {str(e)}"}


@app.post("/api/dynamic-query-advanced", response_model=Union[AIExtractionResult, ErrorResult], tags=["Dynamic Query"])
async def dynamic_query_advanced_extraction(
    file: UploadFile = File(..., description="Document file to analyze"),
    query: str = Form(..., description="Natural language query"),
    enable_summarization: bool = Form(True, description="Enable smart summarization for long extractions"),
    enable_citations: bool = Form(True, description="Enable page number citations"),
    force_summarization: bool = Form(False, description="Force summarization even for short content"),
    max_summary_length: int = Form(200, description="Maximum length for summaries"),
    citation_style: str = Form("page_numbers", description="Citation style: page_numbers, sections, none")
) -> Union[AIExtractionResult, ErrorResult]:
    """
    Advanced Dynamic Query Extraction with Summarization and Citations
    
    Enhanced version with fine-grained control over:
    - Smart summarization for token optimization
    - Page number citations for reference tracking
    - Custom summarization settings
    - Citation style options
    
    Perfect for large documents where you need brief summaries with citations instead of full text extraction.
    
    Examples:
    - Query: "Extract main complaints and their severity" 
      → Returns brief summaries of complaints with page references
    - Query: "Get key financial metrics"
      → Returns summarized metrics with source page numbers
    """
    logger.info(
        "Advanced dynamic query request",
        filename=file.filename,
        query=query,
        summarization=enable_summarization,
        citations=enable_citations,
        force_summary=force_summarization
    )
    
    try:
        # Validate inputs
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        if not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query cannot be empty"
            )
        
        if citation_style not in ["page_numbers", "sections", "none"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Citation style must be 'page_numbers', 'sections', or 'none'"
            )
        
        # Check file size
        if file.size and file.size > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 50MB limit"
            )
        
        # Extract text from document
        document_text = await app.state.document_processor.extract_text_from_file(file)
        
        if not document_text.strip():
            return ErrorResult(error="Could not extract text from document")
        
        # Process with advanced options
        if force_summarization or max_summary_length != 200 or citation_style != "page_numbers":
            # Use custom options method
            result = await app.state.dynamic_query_service.process_with_custom_options(
                document_text=document_text,
                natural_query=query.strip(),
                max_summary_length=max_summary_length,
                force_summarization=force_summarization,
                citation_style=citation_style
            )
        else:
            # Use standard method with flags
            result = await app.state.dynamic_query_service.process_dynamic_query(
                document_text=document_text,
                natural_query=query.strip(),
                enable_summarization=enable_summarization,
                enable_citations=enable_citations
            )
        
        logger.info(
            "Advanced dynamic query completed",
            filename=file.filename,
            query=query,
            result_type=type(result).__name__
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Advanced dynamic query failed",
            filename=file.filename,
            query=query,
            error=str(e),
            exc_info=True
        )
        return ErrorResult(error=f"Advanced dynamic query processing failed: {str(e)}")


@app.post("/predict", response_model=ExtractResponse, tags=["Legacy"])
async def predict_legacy(
    file: UploadFile = File(...),
    template: Optional[str] = Form(None),
    custom_prompt: Optional[str] = Form(None)
) -> ExtractResponse:
    """
    Legacy endpoint for backward compatibility with HuggingFace Space API
    
    This endpoint maintains the exact same interface as the original HuggingFace Space
    to ensure seamless migration without frontend changes.
    """
    logger.info("Legacy predict endpoint called - forwarding to extract")
    return await extract_from_document(file, template, custom_prompt)

@app.get("/api/templates", response_model=Dict[str, str], tags=["Templates"])
async def get_available_templates() -> Dict[str, str]:
    """
    Get list of available extraction templates
    """
    return await app.state.document_processor.get_available_templates()

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with API information
    """
    return {
        "message": "Document Extraction API",
        "version": "1.0.0",
        "status": "running",
        "docs_url": "/docs" if settings.environment != "production" else None,
        "health_url": "/health"
    }

# Additional monitoring endpoints for Azure Application Insights
@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    """
    Prometheus-compatible metrics endpoint
    """
    # This would typically return Prometheus metrics
    # For now, return basic service information
    return {
        "uptime": "running",
        "requests_total": 0,  # Would be tracked by middleware
        "errors_total": 0,    # Would be tracked by middleware
        "response_time_avg": 0  # Would be calculated from request logs
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level="info"
    ) 