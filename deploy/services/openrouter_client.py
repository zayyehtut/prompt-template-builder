"""
OpenRouter API Client Service
Handles AI model interactions for document extraction using single-stage structured meta-prompting
Optimized for Azure hosting without GPU requirements - eliminates two-stage schema issues
"""

import asyncio
import json
import time
import re
from typing import Dict, List, Optional, Any, Union

import httpx
import structlog
from openai import AsyncOpenAI

from ..config import get_settings
from ..models import TemplateExtractionResult, AIExtractionResult, ErrorResult

logger = structlog.get_logger(__name__)
settings = get_settings()


class OpenRouterClient:
    """
    OpenRouter API client for AI-powered document extraction using single-stage approach
    Uses CPU-optimized models suitable for Azure App Service deployment
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.openrouter_api_key
        self.base_url = base_url or settings.openrouter_base_url
        self.timeout = settings.openrouter_timeout
        self.max_retries = settings.openrouter_max_retries
        
        if not self.api_key:
            logger.warning("OpenRouter API key not configured - AI features will be disabled")
            self.client = None
        else:
            # Initialize OpenAI client with OpenRouter configuration
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout,
                max_retries=self.max_retries
            )
        
        self.session_stats = {
            "requests_made": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens_used": 0,
            "average_response_time": 0.0
        }
    
    async def health_check(self) -> bool:
        """Check if OpenRouter API is accessible"""
        if not self.client:
            raise Exception("OpenRouter client not initialized - missing API key")
        
        try:
            # Make a simple request to test connectivity
            response = await self.client.models.list()
            logger.info("OpenRouter health check passed", model_count=len(response.data))
            return True
        except Exception as e:
            logger.error("OpenRouter health check failed", error=str(e))
            raise
    
    async def extract_data_single_stage(
        self,
        document_text: str,
        template: Optional[str] = None,
        custom_prompt: Optional[str] = None
    ) -> Union[TemplateExtractionResult, AIExtractionResult, ErrorResult]:
        """
        Single-stage extraction using structured meta-prompting approach
        Eliminates schema generation step to avoid JSON parsing issues
        """
        if not self.client:
            raise Exception("OpenRouter client not available")
        
        start_time = time.time()
        
        try:
            # Determine extraction goal and type
            if template and template in settings.default_templates:
                extraction_goal = settings.default_templates[template]
                prompt_type = "template"
                result_type = "template"
            elif custom_prompt:
                extraction_goal = custom_prompt
                prompt_type = "custom"
                result_type = "ai_extraction"
            else:
                extraction_goal = "Extract key information from the document including contact details, important dates, and main topics"
                prompt_type = "default"
                result_type = "ai_extraction"
            
            # Build the single-stage extraction prompt using structured meta-prompting
            system_prompt = self._build_system_prompt(extraction_goal, template)
            user_prompt = self._build_user_prompt(document_text, extraction_goal, template)
            
            logger.info(
                "Starting single-stage extraction",
                prompt_type=prompt_type,
                doc_length=len(document_text),
                template=template,
                extraction_goal=extraction_goal[:100]
            )
            
            # Use the more capable model for single-stage extraction
            response = await self.client.chat.completions.create(
                model=settings.openrouter_model_extraction,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,  # Use deterministic output for consistency
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            # Parse the extraction result with robust JSON parsing
            extraction_content = response.choices[0].message.content
            finish_reason = response.choices[0].finish_reason
            
            # Check if the response was cut off due to token limit
            if finish_reason == 'length':
                logger.warning("Model response was truncated due to token limit", 
                             finish_reason=finish_reason,
                             content_length=len(extraction_content) if extraction_content else 0)
                
                # Try to get content from reasoning field if available (for reasoning models)
                reasoning_content = getattr(response.choices[0].message, 'reasoning', None)
                if reasoning_content:
                    logger.info("Attempting to extract JSON from reasoning field", 
                               reasoning_length=len(reasoning_content))
                    try:
                        # Try to find JSON in the reasoning content
                        extracted_data = self._robust_json_parse(reasoning_content)
                        if extracted_data and 'extraction_error' not in extracted_data:
                            logger.info("Successfully extracted data from reasoning field")
                        else:
                            # Fallback: increase max_tokens and retry once
                            logger.info("Retrying with higher token limit")
                            response = await self.client.chat.completions.create(
                                model=settings.openrouter_model_extraction,
                                messages=[
                                    {"role": "system", "content": system_prompt},
                                    {"role": "user", "content": user_prompt}
                                ],
                                temperature=0.0,
                                max_tokens=4000,  # Increased token limit
                                response_format={"type": "json_object"}
                            )
                            extraction_content = response.choices[0].message.content
                    except Exception as e:
                        logger.warning("Failed to extract from reasoning field", error=str(e))
                        # Continue with the original content
                        pass
                
                # If content is still empty after retry, return error
                if not extraction_content or not extraction_content.strip():
                    return ErrorResult(error="Model response was truncated and no valid JSON could be extracted. Try a shorter document or simpler extraction prompt.")
            
            if not extraction_content:
                raise ValueError("Empty response from extraction model")
            
            extracted_data = self._robust_json_parse(extraction_content)
            
            # Update statistics
            processing_time = time.time() - start_time
            self._update_stats(response, processing_time, success=True)
            
            logger.info(
                "Single-stage extraction completed",
                processing_time=processing_time,
                extracted_fields=len(extracted_data),
                total_items=sum(len(v) if isinstance(v, list) else 1 for v in extracted_data.values())
            )
            
            # Return in the format expected by the frontend
            if result_type == "template":
                return TemplateExtractionResult(**extracted_data)
            else:
                return AIExtractionResult(
                    ai_extraction_result={
                        "status": "success",
                        "message": "Extraction completed successfully",
                        "query": extraction_goal,
                        "data": extracted_data
                    }
                )
            
        except json.JSONDecodeError as e:
            self._update_stats(None, time.time() - start_time, success=False)
            content_preview = extraction_content[:200] if extraction_content else "None"
            logger.error("Failed to parse extraction JSON", error=str(e), content=content_preview)
            return ErrorResult(error=f"Invalid JSON response from extraction model: {e}")
        except Exception as e:
            self._update_stats(None, time.time() - start_time, success=False)
            logger.error("Single-stage extraction failed", error=str(e), exc_info=True)
            return ErrorResult(error=f"Extraction failed: {str(e)}")
    
    def _build_system_prompt(self, extraction_goal: str, template: Optional[str] = None) -> str:
        """Build structured system prompt for single-stage extraction"""
        
        # Template-specific field definitions
        template_fields = {
            "emails": {
                "emails": "Email addresses found in the document",
                "subjects": "Email subjects or message titles",
                "senders": "Names or addresses of email senders",
                "dates": "Email dates or timestamps"
            },
            "contacts": {
                "names": "Full names of people or organizations",
                "phone_numbers": "Phone numbers in any format",
                "email_addresses": "Email addresses",
                "addresses": "Physical addresses",
                "companies": "Company or organization names"
            },
            "invoices": {
                "invoice_numbers": "Invoice or bill numbers",
                "amounts": "Monetary amounts and totals",
                "dates": "Invoice dates, due dates, or payment dates",
                "vendors": "Vendor or supplier names",
                "items": "Products or services listed"
            },
            "resumes": {
                "names": "Candidate names",
                "skills": "Technical and professional skills",
                "experience": "Work experience and job titles",
                "education": "Educational background and degrees",
                "contact_info": "Phone numbers and email addresses"
            },
            "contracts": {
                "parties": "Names of contracting parties",
                "terms": "Key contract terms and conditions",
                "dates": "Contract dates, deadlines, and durations",
                "amounts": "Financial terms and amounts",
                "obligations": "Key obligations and responsibilities"
            },
            "medical": {
                "patient_info": "Patient names and identifiers",
                "diagnoses": "Medical diagnoses and conditions",
                "treatments": "Treatments and procedures",
                "medications": "Prescribed medications",
                "dates": "Medical dates and appointments"
            },
            "financial": {
                "accounts": "Account numbers and types",
                "transactions": "Transaction descriptions and amounts",
                "dates": "Transaction dates and periods",
                "balances": "Account balances and totals",
                "institutions": "Financial institution names"
            }
        }
        
        # Use template-specific fields or generate dynamic fields
        if template and template in template_fields:
            fields_definition = template_fields[template]
        else:
            # Dynamic field generation based on extraction goal
            fields_definition = {
                "key_information": "Main topics and important information",
                "names": "Names of people, organizations, or entities",
                "dates": "Important dates and timestamps",
                "numbers": "Important numbers, amounts, or quantities",
                "contacts": "Contact information like emails and phones"
            }
        
        # Build field examples for the JSON structure
        field_examples = {}
        for field_name, description in fields_definition.items():
            field_examples[field_name] = []
        
        return f"""You are a precise document analysis and extraction expert. Your task is to analyze the document and extract specific information according to the requirements.

EXTRACTION GOAL: {extraction_goal}

REQUIRED OUTPUT FORMAT - Return ONLY valid JSON with this exact structure:
{json.dumps(field_examples, indent=2)}

CRITICAL RULES:
1. Return ONLY valid JSON - no explanatory text, no markdown, no code blocks
2. Each field must be an array of strings
3. If no data found for a field, return an empty array: []
4. Extract exact text from the document when possible
5. Do not hallucinate or infer information not present in the document
6. Be precise and conservative in extraction
7. If multiple similar items exist, include all of them

FIELD DEFINITIONS:
{json.dumps(fields_definition, indent=2)}"""
    
    def _build_user_prompt(self, document_text: str, extraction_goal: str, template: Optional[str] = None) -> str:
        """Build user prompt with document content and extraction instructions"""
        
        # Truncate document if too long to fit in context
        max_doc_length = 8000  # Conservative limit for context window
        if len(document_text) > max_doc_length:
            document_text = document_text[:max_doc_length] + "\n\n[Document truncated due to length...]"
        
        prompt = f"""DOCUMENT CONTENT:
{document_text}

EXTRACTION TASK: {extraction_goal}

Analyze the above document and extract the requested information. Return the results in the exact JSON format specified in the system prompt."""
        
        if template:
            prompt += f"\n\nTemplate: {template}"
        
        return prompt
    
    def _robust_json_parse(self, content: str) -> Dict[str, Any]:
        """
        Robust JSON parsing with multiple fallback strategies
        Handles various response formats from AI models
        """
        # Strategy 1: Direct JSON parsing
        try:
            return json.loads(content.strip())
        except json.JSONDecodeError:
            pass
        
        # Strategy 2: Extract JSON from markdown code blocks
        json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
        match = re.search(json_pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Strategy 3: Find the largest JSON object in the text
        json_objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
        for json_obj in sorted(json_objects, key=len, reverse=True):
            try:
                return json.loads(json_obj)
            except json.JSONDecodeError:
                continue
        
        # Strategy 4: Try to find JSON between specific markers
        markers = [
            (r'```json\s*(.*?)\s*```', re.DOTALL | re.IGNORECASE),
            (r'```\s*(.*?)\s*```', re.DOTALL),
            (r'JSON:\s*(.*?)(?:\n\n|\Z)', re.DOTALL | re.IGNORECASE),
            (r'Result:\s*(.*?)(?:\n\n|\Z)', re.DOTALL | re.IGNORECASE),
        ]
        
        for pattern, flags in markers:
            match = re.search(pattern, content, flags)
            if match:
                try:
                    return json.loads(match.group(1).strip())
                except json.JSONDecodeError:
                    continue
        
        # Strategy 5: Extract key-value pairs manually and construct JSON
        try:
            # Look for field patterns like "field_name": ["value1", "value2"]
            field_pattern = r'"([^"]+)":\s*\[(.*?)\]'
            matches = re.findall(field_pattern, content, re.DOTALL)
            if matches:
                result = {}
                for field_name, values_str in matches:
                    # Parse the array values
                    try:
                        values_array = json.loads(f'[{values_str}]')
                        result[field_name] = values_array
                    except json.JSONDecodeError:
                        # Fallback: split by comma and clean up
                        values = [v.strip().strip('"\'') for v in values_str.split(',') if v.strip()]
                        result[field_name] = values
                
                if result:
                    return result
        except Exception:
            pass
        
        # Strategy 6: Return a minimal valid structure if all else fails
        logger.warning("Could not parse JSON response, returning empty structure", content_preview=content[:200])
        return {
            "extraction_error": ["Could not parse the model response"],
            "raw_response": [content[:500]]  # Include part of raw response for debugging
        }
    
    def _update_stats(
        self,
        response: Optional[Any],
        processing_time: float,
        success: bool
    ) -> None:
        """Update session statistics"""
        self.session_stats["requests_made"] += 1
        
        if success:
            self.session_stats["successful_requests"] += 1
            if response and hasattr(response, 'usage'):
                self.session_stats["total_tokens_used"] += getattr(response.usage, 'total_tokens', 0)
        else:
            self.session_stats["failed_requests"] += 1
        
        # Update average response time
        current_avg = self.session_stats["average_response_time"]
        request_count = self.session_stats["requests_made"]
        self.session_stats["average_response_time"] = (
            (current_avg * (request_count - 1)) + processing_time
        ) / request_count
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current session statistics"""
        return self.session_stats.copy()
    
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models from OpenRouter"""
        if not self.client:
            return []
        
        try:
            response = await self.client.models.list()
            return [
                {
                    "id": model.id,
                    "name": getattr(model, 'name', model.id),
                    "description": getattr(model, 'description', ''),
                    "context_length": getattr(model, 'context_length', 0)
                }
                for model in response.data
            ]
        except Exception as e:
            logger.error("Failed to fetch available models", error=str(e))
            return []
 