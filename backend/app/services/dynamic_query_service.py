"""
Dynamic Query-Driven Document Extraction Service
Implements "SQL for documents" - natural language queries that generate dynamic schemas
The AI determines not just values, but variable names, types, and entire structure

Enhanced with:
- Smart summarization for long extractions
- Citation page numbers
- Token-efficient processing for cost optimization

Examples:
- "Extract the team and their status who lost to Arsenal" -> {"teams": [{"name": "...", "status": "...", "result": "..."}]}
- "Get all product prices and categories" -> {"products": [{"name": "...", "price": "...", "category": "..."}]}
- "Find customer complaints and their severity" -> {"complaints": [{"issue": "...", "severity": "...", "customer": "..."}]}
"""

import asyncio
import json
import time
import re
import math
from typing import Dict, List, Optional, Any, Union, Tuple

import httpx
import structlog
from openai import AsyncOpenAI

from ..config import get_settings
from ..models import AIExtractionResult, ErrorResult

logger = structlog.get_logger(__name__)
settings = get_settings()


class DynamicQueryService:
    """
    Dynamic Query Service - "SQL for Documents"
    Generates completely dynamic schemas based on natural language queries
    Enhanced with smart summarization and citation features
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or settings.openrouter_api_key
        self.base_url = base_url or settings.openrouter_base_url
        self.timeout = settings.openrouter_timeout
        self.max_retries = settings.openrouter_max_retries
        
        # Token management settings
        self.max_document_tokens = 6000  # Reserve space for prompts and responses
        self.long_text_threshold = 500   # Characters threshold for summarization
        self.citation_enabled = True     # Enable page number citations
        
        if not self.api_key:
            logger.warning("OpenRouter API key not configured - Dynamic query features disabled")
            self.client = None
        else:
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout,
                max_retries=self.max_retries
            )
    
    async def process_dynamic_query(
        self,
        document_text: str,
        natural_query: str,
        enable_summarization: bool = True,
        enable_citations: bool = True
    ) -> Union[AIExtractionResult, ErrorResult]:
        """
        Process a natural language query against a document
        Generate completely dynamic schema based on the query intent
        
        Args:
            document_text: The document content to analyze
            natural_query: Natural language query like "Extract teams who lost to Arsenal"
            enable_summarization: Whether to use smart summarization for long extractions
            enable_citations: Whether to include page/section citations
        
        Returns:
            Dynamic structured data with schema determined by the AI
        """
        if not self.client:
            return ErrorResult(error="Dynamic query service not available - missing API key")
        
        start_time = time.time()
        
        try:
            logger.info(
                "Processing dynamic query",
                query=natural_query,
                doc_length=len(document_text),
                summarization=enable_summarization,
                citations=enable_citations
            )
            
            # Preprocess document for optimization
            processed_doc, page_map = self._preprocess_document_with_citations(
                document_text, enable_citations
            )
            
            # Check if we need summarization mode
            use_summarization = (
                enable_summarization and 
                self._should_use_summarization(processed_doc, natural_query)
            )
            
            # Build dynamic analysis prompt
            system_prompt = self._build_dynamic_system_prompt(use_summarization, enable_citations)
            user_prompt = self._build_dynamic_user_prompt(
                processed_doc, natural_query, use_summarization, enable_citations
            )
            
            # Use the most capable model for dynamic schema generation
            response = await self.client.chat.completions.create(
                model=settings.openrouter_model_extraction,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Slightly creative for schema design, but consistent
                max_tokens=3000,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            response_content = response.choices[0].message.content
            if not response_content:
                return ErrorResult(error="Empty response from AI model")
            
            # Robust JSON parsing
            parsed_data = self._robust_json_parse(response_content)
            
            if "error" in parsed_data:
                return ErrorResult(error=parsed_data["error"])
            
            processing_time = time.time() - start_time
            
            logger.info(
                "Dynamic query completed",
                processing_time=processing_time,
                query=natural_query,
                schema_generated=list(parsed_data.keys()) if isinstance(parsed_data, dict) else "complex",
                summarization_used=use_summarization
            )
            
            # Return as AI extraction result
            return AIExtractionResult(
                ai_extraction_result={
                    "status": "success",
                    "message": "Dynamic query processed successfully",
                    "query": natural_query,
                    "schema_type": "dynamic",
                    "data": parsed_data,
                    "processing_time": round(processing_time, 2),
                    "summarization_used": use_summarization,
                    "citations_enabled": enable_citations,
                    "optimization_stats": {
                        "original_doc_length": len(document_text),
                        "processed_doc_length": len(processed_doc),
                        "token_savings": max(0, len(document_text) - len(processed_doc))
                    }
                }
            )
            
        except Exception as e:
            logger.error("Dynamic query processing failed", error=str(e), query=natural_query)
            return ErrorResult(error=f"Dynamic query failed: {str(e)}")
    
    def _preprocess_document_with_citations(self, document_text: str, enable_citations: bool) -> Tuple[str, Dict[str, int]]:
        """
        Preprocess document to add page/section markers and create citation map
        """
        if not enable_citations:
            return document_text, {}
        
        # Split document into logical sections
        sections = self._split_into_sections(document_text)
        page_map = {}
        processed_sections = []
        
        for i, section in enumerate(sections):
            page_num = i + 1
            
            # Add page marker to section
            section_with_marker = f"[PAGE {page_num}]\n{section.strip()}\n[/PAGE {page_num}]"
            processed_sections.append(section_with_marker)
            
            # Create mapping for citation lookup
            page_map[f"page_{page_num}"] = page_num
        
        processed_doc = "\n\n".join(processed_sections)
        
        # Truncate if still too long
        if len(processed_doc) > self.max_document_tokens * 4:  # Rough token estimation
            truncated = processed_doc[:self.max_document_tokens * 4]
            processed_doc = truncated + "\n\n[DOCUMENT TRUNCATED DUE TO LENGTH...]"
        
        return processed_doc, page_map
    
    def _split_into_sections(self, document_text: str) -> List[str]:
        """
        Split document into logical sections for page numbering
        """
        # Try to split by common section markers
        section_patterns = [
            r'\n\s*(?:CHAPTER|Chapter|SECTION|Section)\s+\d+',
            r'\n\s*\d+\.\s+[A-Z]',  # Numbered sections
            r'\n\s*[A-Z][A-Z\s]{10,}\n',  # ALL CAPS headers
            r'\n\s*={3,}\n',  # Horizontal lines
            r'\n\s*-{3,}\n',  # Dashed lines
        ]
        
        sections = [document_text]
        
        for pattern in section_patterns:
            new_sections = []
            for section in sections:
                split_sections = re.split(pattern, section)
                new_sections.extend([s for s in split_sections if s.strip()])
            
            if len(new_sections) > 1:
                sections = new_sections
                break
        
        # If no clear sections found, split by length
        if len(sections) == 1 and len(document_text) > 2000:
            chunk_size = len(document_text) // math.ceil(len(document_text) / 1000)
            sections = [
                document_text[i:i + chunk_size] 
                for i in range(0, len(document_text), chunk_size)
            ]
        
        return sections
    
    def _should_use_summarization(self, document_text: str, query: str) -> bool:
        """
        Determine if we should use summarization mode based on document length and query type
        """
        # Check document length
        if len(document_text) < 3000:  # Short documents don't need summarization
            return False
        
        # Check query type - some queries require full text
        full_text_indicators = [
            "extract all", "list all", "get all", "find all",
            "complete list", "full text", "entire", "whole"
        ]
        
        query_lower = query.lower()
        if any(indicator in query_lower for indicator in full_text_indicators):
            return False
        
        # Check if query asks for specific details that might need summarization
        summary_indicators = [
            "summary", "overview", "brief", "main points", "key points",
            "important", "significant", "major", "primary"
        ]
        
        if any(indicator in query_lower for indicator in summary_indicators):
            return True
        
        # Default: use summarization for long documents
        return len(document_text) > 5000
    
    def _build_dynamic_system_prompt(self, use_summarization: bool, enable_citations: bool) -> str:
        """
        Build system prompt for dynamic schema generation with summarization and citation options
        """
        base_prompt = """You are an advanced document analysis AI that creates dynamic data structures based on natural language queries.

Your task is to:
1. Analyze the user's natural language query to understand what they want to extract
2. Design an appropriate data structure (schema) that best represents the requested information
3. Extract the relevant data from the document using that dynamic structure

CRITICAL RULES FOR DYNAMIC SCHEMA GENERATION:

1. VARIABLE NAMES: Determine appropriate variable names based on the query intent
   - "teams who lost" → "teams" array with team objects
   - "product prices" → "products" array with price information
   - "customer complaints" → "complaints" array with complaint details

2. VARIABLE TYPES: Choose the most appropriate data structure
   - Single entities: Use objects with properties
   - Multiple entities: Use arrays of objects
   - Simple lists: Use arrays of strings/numbers
   - Complex relationships: Use nested objects

3. PROPERTY NAMES: Create meaningful property names within objects
   - For teams: "name", "status", "score", "result"
   - For products: "name", "price", "category", "description"
   - For people: "name", "role", "department", "contact"

4. DATA EXTRACTION: Extract only information that exists in the document
   - Do not hallucinate or infer missing data
   - Use "unknown" or null for missing required fields
   - Be precise and factual

5. STRUCTURE CONSISTENCY: Maintain consistent structure across similar entities
   - All team objects should have the same properties
   - All product objects should follow the same schema"""

        if use_summarization:
            base_prompt += """

SUMMARIZATION MODE ACTIVE:
- For long text content, provide BRIEF SUMMARIES instead of full text
- Focus on key points, main ideas, and essential information
- Keep summaries concise but informative
- Maintain factual accuracy while reducing length"""

        if enable_citations:
            base_prompt += """

CITATION MODE ACTIVE:
- Include "page_reference" or "source_page" in objects when available
- Use page markers [PAGE X] to identify source pages
- Add citation information like: {"text": "summary", "page": 2}
- Preserve page reference information for traceability"""

        base_prompt += """

EXAMPLE TRANSFORMATIONS:
Query: "Extract teams and their scores"
Schema: {"teams": [{"name": "string", "score": "number", "status": "string"}]}

Query: "Get customer feedback and ratings"
Schema: {"feedback": [{"customer": "string", "comment": "string", "rating": "number", "date": "string"}]}

Query: "Find all financial transactions"
Schema: {"transactions": [{"amount": "number", "type": "string", "date": "string", "description": "string"}]}

RESPONSE FORMAT: Return ONLY valid JSON with the dynamic structure you determine is most appropriate for the query."""

        return base_prompt

    def _build_dynamic_user_prompt(
        self, 
        document_text: str, 
        natural_query: str, 
        use_summarization: bool, 
        enable_citations: bool
    ) -> str:
        """Build user prompt with document and query, including summarization instructions"""
        
        # Truncate document if too long
        max_doc_length = 8000
        if len(document_text) > max_doc_length:
            document_text = document_text[:max_doc_length] + "\n\n[Document truncated due to length...]"
        
        prompt = f"""DOCUMENT CONTENT:
{document_text}

USER QUERY: {natural_query}

Analyze the document and extract the information requested in the query. Design an appropriate data structure that best represents what the user is asking for, then extract the relevant data.

Remember:
- Create variable names and types that match the user's intent
- Use the most logical structure for the requested information
- Extract only factual data from the document"""

        if use_summarization:
            prompt += """
- For long text content, provide brief summaries with key points
- Focus on essential information rather than full text reproduction
- Keep extracted content concise but informative"""

        if enable_citations:
            prompt += """
- Include page references when available (look for [PAGE X] markers)
- Add "page" or "source_page" fields to track information sources
- Maintain traceability of where information was found"""

        prompt += "\n\nReturn the result as valid JSON"

        return prompt
    
    def _robust_json_parse(self, content: str) -> Dict[str, Any]:
        """
        Robust JSON parsing with multiple fallback strategies
        Enhanced for dynamic schema responses
        """
        # Strategy 1: Direct JSON parsing
        try:
            parsed = json.loads(content.strip())
            if isinstance(parsed, dict):
                return parsed
            else:
                return {"data": parsed}
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
        
        # Strategy 3: Find JSON objects in the response
        json_objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', content, re.DOTALL)
        for json_obj in sorted(json_objects, key=len, reverse=True):
            try:
                parsed = json.loads(json_obj)
                if isinstance(parsed, dict) and len(parsed) > 0:
                    return parsed
            except json.JSONDecodeError:
                continue
        
        # Strategy 4: Try to extract array structures
        array_pattern = r'\[(.*?)\]'
        array_match = re.search(array_pattern, content, re.DOTALL)
        if array_match:
            try:
                array_content = f'[{array_match.group(1)}]'
                parsed_array = json.loads(array_content)
                return {"extracted_items": parsed_array}
            except json.JSONDecodeError:
                pass
        
        # Strategy 5: Look for key-value patterns and construct JSON
        try:
            # Pattern for "key": value or "key": [array]
            kv_pattern = r'"([^"]+)":\s*(?:\[(.*?)\]|"([^"]*)"|\{(.*?)\}|(\d+(?:\.\d+)?))'
            matches = re.findall(kv_pattern, content, re.DOTALL)
            
            if matches:
                result = {}
                for match in matches:
                    key = match[0]
                    array_val = match[1]
                    string_val = match[2]
                    object_val = match[3]
                    number_val = match[4]
                    
                    if array_val:
                        # Parse array
                        try:
                            result[key] = json.loads(f'[{array_val}]')
                        except:
                            # Simple split fallback
                            items = [item.strip().strip('"') for item in array_val.split(',')]
                            result[key] = [item for item in items if item]
                    elif object_val:
                        # Parse object
                        try:
                            result[key] = json.loads(f'{{{object_val}}}')
                        except:
                            result[key] = {"value": object_val.strip()}
                    elif number_val:
                        # Parse number
                        try:
                            result[key] = float(number_val) if '.' in number_val else int(number_val)
                        except:
                            result[key] = number_val
                    else:
                        # String value
                        result[key] = string_val
                
                if result:
                    return result
        except Exception as e:
            logger.warning("Failed to parse key-value patterns", error=str(e))
        
        # Strategy 6: Fallback error response
        logger.warning("Could not parse dynamic query response", content_preview=content[:300])
        return {
            "error": "Could not parse AI response into valid JSON structure",
            "raw_response": content[:500]
        }
    
    async def analyze_query_intent(self, natural_query: str) -> Dict[str, Any]:
        """
        Analyze the intent of a natural language query to suggest optimal structure
        This is a helper method for understanding what the user wants
        """
        if not self.client:
            return {"error": "Service not available"}
        
        try:
            intent_prompt = f"""Analyze this natural language query and determine what data structure would be most appropriate:

QUERY: {natural_query}

Return a JSON object describing:
1. The main entities the user wants to extract
2. The suggested variable names
3. The expected data types
4. The suggested structure
5. Whether summarization would be beneficial
6. Whether citations would be helpful

Example response:
{{
  "main_entities": ["teams", "scores"],
  "suggested_variables": {{"teams": "array", "scores": "number"}},
  "structure_type": "array_of_objects",
  "explanation": "User wants to extract multiple teams with their associated scores",
  "summarization_recommended": false,
  "citations_recommended": true
}}"""

            response = await self.client.chat.completions.create(
                model=settings.openrouter_model_extraction,
                messages=[
                    {"role": "system", "content": "You are a query analysis expert. Analyze natural language queries and suggest optimal data structures."},
                    {"role": "user", "content": intent_prompt}
                ],
                temperature=0.0,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            if content:
                return self._robust_json_parse(content)
            else:
                return {"error": "Empty response from intent analysis"}
                
        except Exception as e:
            logger.error("Query intent analysis failed", error=str(e))
            return {"error": f"Intent analysis failed: {str(e)}"}
    
    async def process_with_custom_options(
        self,
        document_text: str,
        natural_query: str,
        max_summary_length: int = 200,
        force_summarization: bool = False,
        citation_style: str = "page_numbers"  # "page_numbers", "sections", "none"
    ) -> Union[AIExtractionResult, ErrorResult]:
        """
        Process dynamic query with custom summarization and citation options
        
        Args:
            document_text: Document content
            natural_query: User query
            max_summary_length: Maximum length for summaries
            force_summarization: Force summarization even for short content
            citation_style: Citation format ("page_numbers", "sections", "none")
        """
        # Set custom configuration
        original_threshold = self.long_text_threshold
        original_citations = self.citation_enabled
        
        try:
            if force_summarization:
                self.long_text_threshold = 0  # Force summarization for any length
            
            self.citation_enabled = citation_style != "none"
            
            result = await self.process_dynamic_query(
                document_text,
                natural_query,
                enable_summarization=True,
                enable_citations=self.citation_enabled
            )
            
            return result
            
        finally:
            # Restore original settings
            self.long_text_threshold = original_threshold
            self.citation_enabled = original_citations 