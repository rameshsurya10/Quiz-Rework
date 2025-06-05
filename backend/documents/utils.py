import logging
from PyPDF2 import PdfReader
import io
import os

logger = logging.getLogger(__name__)


def extract_text_from_pdf(document):
    """Extract text from a PDF document and update the document model"""
    try:
        # Get the file path or file object
        if os.path.exists(document.file.path):
            # Local file system
            file_path = document.file.path
            pdf = PdfReader(file_path)
        else:
            # S3 or other storage
            file_content = document.file.read()
            pdf = PdfReader(io.BytesIO(file_content))
        
        # Get the number of pages
        document.page_count = len(pdf.pages)
        
        # Extract text from each page
        all_text = ""
        for page_num in range(len(pdf.pages)):
            page = pdf.pages[page_num]
            all_text += page.extract_text() + "\n\n"
        
        # Update the document with the extracted text
        document.extracted_text = all_text
        document.is_processed = True
        document.save()
        
        return True
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        document.is_processed = False
        document.save()
        return False
