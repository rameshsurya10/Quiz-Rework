import logging
from typing import Dict, Any, Optional
import PyPDF2
import re
from django.conf import settings
from .models import Document

logger = logging.getLogger(__name__)


class DocumentProcessingService:
    """Service for processing uploaded documents"""
    
    @staticmethod
    def extract_text_from_pdf(document: Document, page_range: tuple = None) -> bool:
        """
        Extract text from a PDF document and update the document's extracted_text field
        
        Args:
            document: The Document model instance to extract text from
            page_range: Optional tuple (start_page, end_page) to extract specific pages (0-indexed)
            
        Returns:
            bool: True if extraction was successful, False otherwise
        """
        try:
            # Open the PDF file
            pdf_file_path = document.file.path
            
            extracted_text = ""
            
            with open(pdf_file_path, 'rb') as file:
                # Create PDF reader object
                pdf_reader = PyPDF2.PdfReader(file)
                page_count = len(pdf_reader.pages)
                
                # Determine page range
                start_page = 0
                end_page = page_count - 1
                
                if page_range and len(page_range) == 2:
                    start_page = max(0, page_range[0] - 1)  # Convert from 1-indexed to 0-indexed
                    end_page = min(page_count - 1, page_range[1] - 1)  # Convert and ensure valid range
                
                # Extract text from specified pages
                for page_num in range(start_page, end_page + 1):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    # Add page number for traceability
                    extracted_text += f"[Page {page_num + 1}]\n{page_text}\n\n"
            
            # Clean and preprocess text
            cleaned_text = DocumentProcessingService._clean_text(extracted_text)
            
            # Update document with extracted text and metadata
            document.extracted_text = cleaned_text
            document.page_count = page_count
            document.is_processed = True
            document.save()
            
            return True
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {document.title}: {str(e)}")
            return False
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters (keep basic punctuation)
        text = re.sub(r'[^\w\s.,?!:;()\[\]{}\-\'"]', '', text)
        # Replace multiple periods with single periods
        text = re.sub(r'\.{2,}', '.', text)
        return text.strip()
    
    @staticmethod
    def get_document_metadata(document: Document) -> Dict[str, Any]:
        """
        Get metadata for a document
        
        Args:
            document: The Document model instance
            
        Returns:
            Dict with metadata about the document
        """
        return {
            'id': document.id,
            'title': document.title,
            'page_count': document.page_count,
            'file_size': document.file_size,
            'file_size_display': document.get_file_size_display(),
            'is_processed': document.is_processed,
            'created_at': document.created_at,
            'updated_at': document.updated_at,
        }
