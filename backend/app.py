import gradio as gr
from docling.document_converter import DocumentConverter
from extractor import extract_data
import json

def process_document(file, extraction_type, custom_prompt):
    """Main processing function"""
    if file is None:
        return {"error": "No file uploaded"}
    
    try:
        # Convert document to text
        converter = DocumentConverter()
        result = converter.convert(file)
        text = result.document.export_to_markdown()
        
        # Extract based on type or custom prompt
        if custom_prompt:
            extracted = extract_data(text, custom_prompt, method="ai")
        else:
            extracted = extract_data(text, extraction_type, method="template")
        
        return extracted
    except Exception as e:
        return {"error": str(e)}

# Gradio Interface
interface = gr.Interface(
    fn=process_document,
    inputs=[
        gr.File(label="Upload Document", file_types=[".pdf", ".png", ".jpg", ".jpeg"]),
        gr.Radio(
            choices=["emails", "phones", "money", "dates", "people", "addresses"],
            label="Quick Templates",
            value="emails"
        ),
        gr.Textbox(
            label="Or Custom Extraction (overrides template)",
            placeholder="Extract all product names and SKUs",
            max_lines=3
        )
    ],
    outputs=gr.JSON(label="Extracted Data"),
    title="ExtractThis - Document Data Extractor",
    description="Upload a document and extract structured data using AI",
    # examples=[
    #     ["invoice.pdf", "money", ""],
    #     ["business_card.jpg", "emails", ""],
    #     ["menu.pdf", "", "Extract all dish names and prices"]
    # ]
)

interface.launch(share=True) 