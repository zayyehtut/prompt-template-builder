"""
Configuration management for Document Extraction API
Handles environment variables, Azure settings, and application configuration
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application settings
    environment: str = Field(default="development", description="Environment: development, staging, production")
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # API settings
    api_title: str = Field(default="Document Extraction API", description="API title")
    api_version: str = Field(default="1.0.0", description="API version")
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000",
        description="Allowed CORS origins (comma-separated)"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        """Convert comma-separated origins to list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    # OpenRouter AI settings - Single-stage extraction approach
    openrouter_api_key: Optional[str] = Field(default=None, description="OpenRouter API key for AI services")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="OpenRouter API base URL"
    )
    openrouter_model_extraction: str = Field(
        default="google/gemini-2.0-flash-exp",
        description="Model for single-stage document extraction"
    )
    openrouter_timeout: int = Field(default=300, description="OpenRouter API timeout in seconds")
    openrouter_max_retries: int = Field(default=3, description="Maximum API retry attempts")
    

    
    # Azure Key Vault settings (optional)
    azure_keyvault_url: Optional[str] = Field(
        default=None,
        description="Azure Key Vault URL for secret management"
    )
    
    # Document processing settings
    max_file_size_mb: int = Field(default=50, description="Maximum file size in MB")
    supported_file_types: str = Field(
        default=".pdf,.docx,.txt,.png,.jpg,.jpeg",
        description="Supported file extensions (comma-separated)"
    )
    processing_timeout: int = Field(default=600, description="Document processing timeout in seconds")
    
    @property
    def file_extensions(self) -> List[str]:
        """Convert comma-separated file types to list"""
        return [ext.strip() for ext in self.supported_file_types.split(",")]
    
    # Azure Application Insights (optional)
    azure_application_insights_connection_string: Optional[str] = Field(
        default=None,
        description="Azure Application Insights connection string"
    )
    
    # Security settings
    enable_rate_limiting: bool = Field(default=True, description="Enable API rate limiting")
    rate_limit_per_minute: int = Field(default=60, description="Requests per minute per IP")
    
    # Template settings - using property for complex default
    @property
    def default_templates(self) -> dict:
        """Default extraction templates"""
        return {
            "emails": "Extract email addresses, subjects, and sender information",
            "contacts": "Extract contact information including names, phone numbers, and addresses",
            "invoices": "Extract invoice details including amounts, dates, and vendor information",
            "resumes": "Extract candidate information, skills, and experience",
            "contracts": "Extract key contract terms, dates, and parties involved",
            "medical": "Extract medical information, diagnoses, and treatment details",
            "financial": "Extract financial data, transactions, and account information"
        }
    
    def get_openrouter_headers(self) -> dict:
        """Get OpenRouter API headers"""
        return {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "HTTP-Referer": "https://github.com/your-username/docu-extract-mvp",
            "X-Title": "Document Extraction MVP"
        }
    
    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings() 