import logging
from PyPDF2 import PdfReader
import io
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# Import additional text extraction libraries if available
try:
    import pytesseract
    from PIL import Image
    TEXT_EXTRACTION_AVAILABLE = True
except ImportError:
    TEXT_EXTRACTION_AVAILABLE = False
    logger.warning("OCR packages not available. Install with: pip install pytesseract pillow")


def extract_text_from_pdf(document):
    """Extract text from a PDF document and update the document model"""
    try:
        # Get the file content - always use file object, never local path
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


def extract_text_from_file(file):
    """
    Extract text from a file based on its content type.
    Works with various file types: PDF, images, text files, etc.
    
    Args:
        file: File object (not a path)
        
    Returns:
        str: Extracted text or empty string if extraction failed
    """
    if not file:
        return ""
    
    try:
        content_type = file.content_type
        file_content = file.read()
        file.seek(0)  # Reset file pointer after reading
        
        # Extract text based on content type
        if content_type.startswith('image/'):
            # Extract text from image using OCR
            if not TEXT_EXTRACTION_AVAILABLE:
                logger.warning("OCR packages not available for image text extraction")
                return ""
                
            try:
                image = Image.open(io.BytesIO(file_content))
                return pytesseract.image_to_string(image)
            except Exception as e:
                logger.error(f"Error extracting text from image: {e}")
                return ""
                
        elif content_type == 'application/pdf':
            # Extract text from PDF
            try:
                pdf = PdfReader(io.BytesIO(file_content))
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n\n"
                return text
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {e}")
                return ""
                
        elif content_type.startswith('text/'):
            # Plain text file
            try:
                return file_content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    return file_content.decode('latin-1')
                except:
                    return ""
                    
        elif content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            # DOCX file
            try:
                import docx
                doc = docx.Document(io.BytesIO(file_content))
                return "\n".join([para.text for para in doc.paragraphs])
            except Exception as e:
                logger.error(f"Error extracting text from DOCX: {e}")
                return ""
                
        elif content_type == 'application/vnd.ms-excel' or content_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            # Excel file
            try:
                import pandas as pd
                df = pd.read_excel(io.BytesIO(file_content))
                return df.to_string()
            except Exception as e:
                logger.error(f"Error extracting text from Excel: {e}")
                return ""
                
        elif content_type == 'text/csv':
            # CSV file
            try:
                import pandas as pd
                df = pd.read_csv(io.BytesIO(file_content))
                return df.to_string()
            except Exception as e:
                logger.error(f"Error extracting text from CSV: {e}")
                return ""
        
        # Unsupported file type
        logger.warning(f"Unsupported file type: {content_type}")
        return ""
    except Exception as e:
        logger.error(f"Error extracting text from file: {e}")
        return ""
