"""
Error handling middleware and exception handlers
Provides comprehensive error handling with proper logging and user-friendly responses
"""

import traceback
from typing import Dict, Any, Optional

import structlog
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from ..models import ErrorResult

logger = structlog.get_logger(__name__)


def setup_error_handlers(app: FastAPI) -> None:
    """Setup global error handlers for the FastAPI application"""
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle HTTP exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.warning(
            "HTTP exception occurred",
            request_id=request_id,
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "request_id": request_id}
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def starlette_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        """Handle Starlette HTTP exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.warning(
            "Starlette HTTP exception occurred",
            request_id=request_id,
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "request_id": request_id}
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle request validation errors"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Format validation errors for better user experience
        error_details = []
        for error in exc.errors():
            field = " -> ".join(str(x) for x in error["loc"])
            message = error["msg"]
            error_details.append(f"{field}: {message}")
        
        error_message = "Validation failed: " + "; ".join(error_details)
        
        logger.warning(
            "Request validation failed",
            request_id=request_id,
            validation_errors=exc.errors(),
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": error_message,
                "details": exc.errors(),
                "request_id": request_id
            }
        )
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        """Handle ValueError exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.error(
            "Value error occurred",
            request_id=request_id,
            error=str(exc),
            path=request.url.path,
            method=request.method,
            exc_info=True
        )
        
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": str(exc), "request_id": request_id}
        )
    
    @app.exception_handler(FileNotFoundError)
    async def file_not_found_handler(request: Request, exc: FileNotFoundError) -> JSONResponse:
        """Handle file not found errors"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.error(
            "File not found error",
            request_id=request_id,
            error=str(exc),
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "Requested file not found", "request_id": request_id}
        )
    
    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError) -> JSONResponse:
        """Handle permission errors"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.error(
            "Permission error occurred",
            request_id=request_id,
            error=str(exc),
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "Permission denied", "request_id": request_id}
        )
    
    @app.exception_handler(TimeoutError)
    async def timeout_error_handler(request: Request, exc: TimeoutError) -> JSONResponse:
        """Handle timeout errors"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.error(
            "Timeout error occurred",
            request_id=request_id,
            error=str(exc),
            path=request.url.path,
            method=request.method
        )
        
        return JSONResponse(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            content={
                "error": "Request timed out - please try again with a smaller document or simpler extraction",
                "request_id": request_id
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all other unhandled exceptions"""
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log the full stack trace for debugging
        logger.error(
            "Unhandled exception occurred",
            request_id=request_id,
            error=str(exc),
            error_type=type(exc).__name__,
            path=request.url.path,
            method=request.method,
            traceback=traceback.format_exc(),
            exc_info=True
        )
        
        # Return a generic error message to avoid leaking internal details
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "An unexpected error occurred while processing your request",
                "request_id": request_id,
                "message": "Please try again later or contact support if the problem persists"
            }
        )


class DocumentProcessingError(Exception):
    """Custom exception for document processing errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code or "PROCESSING_ERROR"
        self.details = details or {}
        super().__init__(message)


class ExtractionError(Exception):
    """Custom exception for AI extraction errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, model_error: Optional[str] = None):
        self.message = message
        self.error_code = error_code or "EXTRACTION_ERROR"
        self.model_error = model_error
        super().__init__(message)


class StorageError(Exception):
    """Custom exception for Azure storage errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, azure_error: Optional[str] = None):
        self.message = message
        self.error_code = error_code or "STORAGE_ERROR"
        self.azure_error = azure_error
        super().__init__(message)


# Error message templates for consistent user experience
ERROR_MESSAGES = {
    "FILE_TOO_LARGE": "File size exceeds the maximum limit of {max_size}MB",
    "UNSUPPORTED_FORMAT": "File format not supported. Supported formats: {formats}",
    "NO_TEXT_CONTENT": "No text content found in the document",
    "EXTRACTION_FAILED": "Failed to extract data from the document",
    "API_KEY_MISSING": "OpenRouter API key not configured",

    "PROCESSING_TIMEOUT": "Document processing timed out - try a smaller document",
    "INVALID_TEMPLATE": "Template '{template}' not found",
    "RATE_LIMIT_EXCEEDED": "Rate limit exceeded - please wait before making another request"
}


def get_error_message(error_code: str, **kwargs) -> str:
    """Get formatted error message by code"""
    message = ERROR_MESSAGES.get(error_code, "An error occurred")
    try:
        return message.format(**kwargs)
    except KeyError:
        return message 