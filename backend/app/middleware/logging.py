"""
Logging middleware and configuration
Structured logging with Azure Application Insights integration
"""

import json
import logging
import sys
import time
from typing import Dict, Any, Optional

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..config import get_settings

settings = get_settings()


def setup_logging() -> None:
    """
    Configure structured logging for the application
    Optimized for Azure Application Insights and local development
    """
    
    # Configure structlog processors
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    
    # Add appropriate renderer based on environment
    if settings.environment == "development":
        # Human-readable console output for development
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    else:
        # JSON output for production (Azure Application Insights)
        processors.append(structlog.processors.JSONRenderer())
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level.upper()),
    )


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP request/response logging middleware
    Provides detailed request tracking for monitoring and debugging
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Log HTTP requests and responses with timing"""
        
        # Generate request ID for tracing
        request_id = f"{int(time.time() * 1000)}_{hash(str(request.url)) % 10000:04d}"
        
        # Extract request information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        logger = structlog.get_logger(__name__)
        
        # Log request start
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            path=request.url.path,
            query_params=dict(request.query_params),
            client_ip=client_ip,
            user_agent=user_agent,
            content_type=request.headers.get("content-type"),
            content_length=request.headers.get("content-length")
        )
        
        start_time = time.time()
        
        try:
            # Add request ID to request state for downstream use
            request.state.request_id = request_id
            
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            process_time = time.time() - start_time
            
            # Log successful response
            logger.info(
                "Request completed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                process_time=round(process_time, 4),
                response_size=response.headers.get("content-length")
            )
            
            # Add timing header
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate error response time
            process_time = time.time() - start_time
            
            # Log error
            logger.error(
                "Request failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                error=str(e),
                error_type=type(e).__name__,
                process_time=round(process_time, 4),
                exc_info=True
            )
            
            # Re-raise the exception to be handled by FastAPI
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request headers"""
        # Check for forwarded headers (common in Azure App Service)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        forwarded = request.headers.get("x-forwarded")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"


class MetricsLogger:
    """
    Business metrics logger for application insights
    Tracks key performance indicators and usage patterns
    """
    
    def __init__(self):
        self.logger = structlog.get_logger("metrics")
    
    def log_extraction_metrics(
        self,
        request_id: str,
        filename: str,
        file_size_mb: float,
        processing_time: float,
        success: bool,
        template: Optional[str] = None,
        error: Optional[str] = None
    ) -> None:
        """Log document extraction metrics"""
        
        metrics = {
            "event_type": "document_extraction",
            "request_id": request_id,
            "filename": filename,
            "file_size_mb": round(file_size_mb, 2),
            "processing_time": round(processing_time, 4),
            "success": success,
            "template": template
        }
        
        if error:
            metrics["error"] = error
        
        if success:
            self.logger.info("Extraction completed", **metrics)
        else:
            self.logger.error("Extraction failed", **metrics)
    
    def log_api_usage(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
        client_ip: str
    ) -> None:
        """Log API usage metrics"""
        
        self.logger.info(
            "API usage",
            event_type="api_usage",
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time=round(response_time, 4),
            client_ip=client_ip
        )
    
    def log_cost_metrics(
        self,
        service: str,
        operation: str,
        cost_estimate: float,
        currency: str = "USD"
    ) -> None:
        """Log cost tracking metrics for Azure services"""
        
        self.logger.info(
            "Cost tracking",
            event_type="cost_tracking",
            service=service,
            operation=operation,
            cost_estimate=cost_estimate,
            currency=currency
        ) 