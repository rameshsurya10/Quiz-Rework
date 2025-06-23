import logging
import io
import os
import re
from django.conf import settings

logger = logging.getLogger(__name__)

# Import necessary packages for different file types
try:
    from PyPDF2 import PdfReader
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("PDF support not available. Install with: pip install PyPDF2")

try:
    import pytesseract
    from PIL import Image
    OCR_SUPPORT = True
except ImportError:
    OCR_SUPPORT = False
    logger.warning("OCR packages not available. Install with: pip install pytesseract pillow")

try:
    import pandas as pd
    PANDAS_SUPPORT = True
except ImportError:
    PANDAS_SUPPORT = False
    logger.warning("Pandas not available. Install with: pip install pandas")

try:
    import docx
    DOCX_SUPPORT = True
except ImportError:
    DOCX_SUPPORT = False
    logger.warning("DocX support not available. Install with: pip install python-docx")

def extract_text_from_pdf(document):
    """Legacy function for backward compatibility"""
    try:
        if not PDF_SUPPORT:
            logger.error("PDF support not available")
            return False
            
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

def extract_text_from_file(file, page_ranges=None):
    """
    Extract text from various file types with support for page ranges in PDFs
    
    Args:
        file: File object to extract text from
        page_ranges: Optional list of page ranges to extract from PDFs
        
    Returns:
        str: Extracted text
    """
    if not file:
        logger.warning("No file provided for text extraction")
        return ""
    
    try:
        file.seek(0)
        content_type = getattr(file, 'content_type', 'application/octet-stream')
        file_name = getattr(file, 'name', 'unknown')
        file_content = file.read()
        file.seek(0)
        
        # Extract file extension
        _, file_extension = os.path.splitext(file_name)
        file_extension = file_extension.lower()
        
        # Log file information
        logger.info(f"Extracting text from file: {file_name}, type: {content_type}, extension: {file_extension}")
        
        # Handle different file types
        if content_type == 'application/pdf' or file_extension == '.pdf':
            return _extract_text_from_pdf_content(file_content, page_ranges)
            
        elif content_type.startswith('text/') or file_extension in ['.txt', '.csv', '.json', '.xml', '.html']:
            return _extract_text_from_text_file(file_content)
            
        elif content_type.startswith('image/') or file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']:
            return _extract_text_from_image(file_content)
            
        elif content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or file_extension == '.docx':
            return _extract_text_from_docx(file_content)
            
        elif content_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] or file_extension in ['.xls', '.xlsx']:
            return _extract_text_from_excel(file_content)
            
        else:
            logger.warning(f"Unsupported file type: {content_type} with extension {file_extension}")
            return f"[Unsupported file type: {content_type} with extension {file_extension}]"
        
    except Exception as e:
        logger.error(f"Error extracting text from file: {e}")
        return f"[Error extracting text: {str(e)}]"

def _extract_text_from_pdf_content(file_content, page_ranges=None):
    """
    Extract text from PDF content, optionally from specific pages.
    
    Args:
        file_content: Binary content of the PDF file
        page_ranges: Optional list of page ranges to extract. Format:
                     - [1, 5, 10] - Extract pages 1, 5, and 10 (1-indexed)
                     - [(1, 5), 10, (20, 30)] - Extract pages 1-5, 10, and 20-30
    
    Returns:
        str: Extracted text
    """
    if not PDF_SUPPORT:
        return "[PDF support not available. Install PyPDF2]"
        
    try:
        pdf = PdfReader(io.BytesIO(file_content))
        total_pages = len(pdf.pages)
        text = ""
        
        # Parse page ranges if it's a string
        if isinstance(page_ranges, str):
            page_ranges = _parse_page_ranges_str(page_ranges)
            
        # Process page ranges if provided
        if page_ranges:
            pages_to_extract = []
            
            for page_range in page_ranges:
                if isinstance(page_range, tuple) or (isinstance(page_range, list) and len(page_range) == 2):
                    # Handle page range (start, end)
                    start, end = page_range
                    # Convert from 1-indexed (user-friendly) to 0-indexed (internal)
                    start = max(0, start - 1)  # Ensure not negative
                    end = min(total_pages, end)  # Ensure not beyond total pages
                    pages_to_extract.extend(range(start, end))
                else:
                    # Handle single page
                    page_num = page_range - 1  # Convert from 1-indexed to 0-indexed
                    if 0 <= page_num < total_pages:
                        pages_to_extract.append(page_num)
            
            # Remove duplicates and sort
            pages_to_extract = sorted(set(pages_to_extract))
            
            # Log which pages are being extracted
            logger.info(f"Extracting text from specific pages: {[p+1 for p in pages_to_extract]} (1-indexed)")
            logger.info(f"Page ranges requested: {page_ranges}")
            
            if not pages_to_extract:
                logger.warning("No valid pages to extract based on provided page ranges")
                return "[No valid pages to extract based on provided page ranges]"
            
            # Extract text from selected pages
            for page_num in pages_to_extract:
                page = pdf.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    # Add clear page boundary markers
                    text += f"==================== PAGE {page_num + 1} ====================\n"
                    text += page_text + "\n"
                    text += f"==================== END OF PAGE {page_num + 1} ====================\n\n"
                else:
                    logger.warning(f"No text extracted from page {page_num + 1}")
        else:
            # Extract text from all pages (original behavior)
            logger.info(f"Extracting text from all {total_pages} pages")
            for page_num in range(total_pages):
                page = pdf.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    # Add page markers even when extracting all pages
                    text += f"==================== PAGE {page_num + 1} ====================\n"
                    text += page_text + "\n"
                    text += f"==================== END OF PAGE {page_num + 1} ====================\n\n"
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return f"[Error extracting text from PDF: {str(e)}]"

def _extract_text_from_text_file(file_content):
    """Extract text from text-based files"""
    try:
        # Try UTF-8 first
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            # Fall back to latin-1
            return file_content.decode('latin-1')
        except Exception as e:
            logger.error(f"Error decoding text file: {e}")
            return f"[Error decoding text file: {str(e)}]"

def _extract_text_from_image(file_content):
    """Extract text from image files using OCR"""
    if not OCR_SUPPORT:
        return "[OCR support not available. Install pytesseract and pillow]"
        
    try:
        # Open image from binary content
        image = Image.open(io.BytesIO(file_content))
        
        # Use pytesseract to extract text
        text = pytesseract.image_to_string(image)
        
        return text.strip() or "[No text detected in image]"
    except Exception as e:
        logger.error(f"Error extracting text from image: {e}")
        return f"[Error extracting text from image: {str(e)}]"

def _extract_text_from_docx(file_content):
    """Extract text from Word documents"""
    if not DOCX_SUPPORT:
        return "[DOCX support not available. Install python-docx]"
        
    try:
        # Save temporary file
        temp_file = io.BytesIO(file_content)
        
        # Open with python-docx
        doc = docx.Document(temp_file)
        
        # Extract text from paragraphs
        text = "\n\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text])
        
        # Extract text from tables
        for table in doc.tables:
            for row in table.rows:
                text += "\n" + " | ".join([cell.text for cell in row.cells if cell.text]) + "\n"
        
        return text.strip() or "[No text content in document]"
    except Exception as e:
        logger.error(f"Error extracting text from DOCX: {e}")
        return f"[Error extracting text from DOCX: {str(e)}]"

def _extract_text_from_excel(file_content):
    """Extract text from Excel files"""
    if not PANDAS_SUPPORT:
        return "[Excel support not available. Install pandas and openpyxl]"
        
    try:
        # Use pandas to read Excel
        excel_file = io.BytesIO(file_content)
        
        # Read all sheets
        excel_data = pd.read_excel(excel_file, sheet_name=None)
        
        text = ""
        
        # Process each sheet
        for sheet_name, df in excel_data.items():
            text += f"===== SHEET: {sheet_name} =====\n\n"
            
            # Convert dataframe to string
            text += df.to_string(index=False) + "\n\n"
        
        return text.strip() or "[No text content in Excel file]"
    except Exception as e:
        logger.error(f"Error extracting text from Excel: {e}")
        return f"[Error extracting text from Excel: {str(e)}]"

def _parse_page_ranges_str(page_ranges_str):
    """
    Parse page ranges string in format "1-5,7,10-15" into a list of ranges.
    
    Args:
        page_ranges_str: String with page ranges (e.g., "1-5,7,10-15")
        
    Returns:
        list: List of integers and tuples representing page ranges, e.g., 
              [(1, 5), 7, (10, 15)]
    """
    if not page_ranges_str:
        return None
        
    result = []
    parts = page_ranges_str.split(',')
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        # Check if it's a range (contains '-')
        if '-' in part:
            try:
                start, end = part.split('-', 1)
                start = int(start.strip())
                end = int(end.strip())
                
                # Validate range
                if start <= 0 or end <= 0:
                    raise ValueError("Page numbers must be positive")
                if start > end:
                    raise ValueError(f"Invalid range: {start}-{end}")
                
                result.append((start, end))
            except ValueError as e:
                logger.warning(f"Invalid page range format: '{part}' - {str(e)}")
        else:
            # Single page
            try:
                page = int(part)
                if page <= 0:
                    raise ValueError("Page numbers must be positive")
                result.append(page)
            except ValueError as e:
                logger.warning(f"Invalid page number: '{part}' - {str(e)}")
    
    return result if result else None
