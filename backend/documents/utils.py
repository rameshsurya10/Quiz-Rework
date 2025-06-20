import logging
from PyPDF2 import PdfReader
import io
import os
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image
    TEXT_EXTRACTION_AVAILABLE = True
except ImportError:
    TEXT_EXTRACTION_AVAILABLE = False
    logger.warning("OCR packages not available. Install with: pip install pytesseract pillow")

def extract_text_from_pdf(document):
    try:
        document.file.seek(0)
        file_content = document.file.read()
        document.file.seek(0)
        
        pdf = PdfReader(io.BytesIO(file_content))
        document.page_count = len(pdf.pages)
        
        all_text = ""
        for page_num in range(len(pdf.pages)):
            page = pdf.pages[page_num]
            page_text = page.extract_text()
            if page_text:
                all_text += page_text + "\n\n"
        
        document.extracted_text = all_text.strip()
        document.is_processed = True
        document.save()
        
        logger.info(f"Successfully extracted text from PDF: {document.title}")
        return True
        
    except Exception as e:
        logger.error(f"Error extracting text from PDF {document.title}: {str(e)}")
        document.is_processed = False
        document.extracted_text = f"[Error extracting text: {str(e)}]"
        document.save()
        return False

def extract_text_from_file(file):
    if not file:
        logger.warning("No file provided for text extraction")
        return ""
    
    try:
        file.seek(0)
        content_type = getattr(file, 'content_type', 'application/octet-stream')
        file_content = file.read()
        file.seek(0)
        
        if content_type == 'application/pdf':
            return _extract_text_from_pdf_content(file_content)
        elif content_type.startswith('text/'):
            return _extract_text_from_text_file(file_content)
        
        logger.warning(f"Unsupported file type: {content_type}")
        return f"[Unsupported file type: {content_type}]"
        
    except Exception as e:
        logger.error(f"Error extracting text from file: {e}")
        return f"[Error extracting text: {str(e)}]"

def _extract_text_from_pdf_content(file_content):
    try:
        pdf = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return f"[Error extracting text from PDF: {str(e)}]"

def _extract_text_from_text_file(file_content):
    try:
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return file_content.decode('latin-1')
        except Exception as e:
            logger.error(f"Error decoding text file: {e}")
            return f"[Error decoding text file: {str(e)}]"
