"""
Pydantic models for API request/response schemas
Maintains compatibility with existing frontend while adding proper typing
"""

from typing import Dict, Optional, Union, Any
from pydantic import BaseModel, Field


class TemplateExtractionResult(BaseModel):
    """Result for template-based extraction - returns key-value pairs with lists"""
    # Dynamic fields based on template
    # Example: {"emails": ["john@example.com", "jane@example.com"]}
    model_config = {"extra": "allow"}
    
    def __init__(self, **data):
        super().__init__(**data)


class AIExtractionResult(BaseModel):
    """Result for AI-powered extraction with status information"""
    ai_extraction_result: Dict[str, Any] = Field(
        description="AI extraction result with status and data"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "ai_extraction_result": {
                    "status": "success",
                    "message": "Extraction completed successfully",
                    "query": "Extract contact information",
                    "data": {
                        "contacts": ["John Doe", "Jane Smith"],
                        "emails": ["john@example.com", "jane@example.com"]
                    }
                }
            }
        }


class ErrorResult(BaseModel):
    """Error response model"""
    error: str = Field(description="Error message")
    
    class Config:
        schema_extra = {
            "example": {
                "error": "Failed to process document: Invalid file format"
            }
        }


# Union type for all possible extraction results
ExtractResponse = Union[TemplateExtractionResult, AIExtractionResult, ErrorResult]


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(description="Overall service status")
    version: str = Field(description="API version")
    environment: str = Field(description="Deployment environment")
    services: Dict[str, str] = Field(description="Status of individual services")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0",
                "environment": "production",
                            "services": {
                "openrouter": "healthy"
            }
            }
        }


class DocumentMetadata(BaseModel):
    """Document metadata model"""
    filename: str = Field(description="Original filename")
    file_size: int = Field(description="File size in bytes")
    content_type: str = Field(description="MIME content type")
    page_count: Optional[int] = Field(None, description="Number of pages (for PDFs)")
    language: Optional[str] = Field(None, description="Detected language")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    
    class Config:
        schema_extra = {
            "example": {
                "filename": "contract.pdf",
                "file_size": 1024576,
                "content_type": "application/pdf",
                "page_count": 5,
                "language": "en",
                "processing_time": 12.5
            }
        }
 