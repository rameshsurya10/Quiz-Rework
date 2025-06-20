import logging
from typing import Dict, Any, Optional
from PyPDF2 import PdfReader
import re
import io
from django.conf import settings
from .models import Document
from .utils import extract_text_from_file

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
            # Use the centralized text extraction utility
            if document.file:
                # Reset file position
                document.file.seek(0)
                
                # Get the file content and page count
                file_content = document.file.read()
                document.file.seek(0)  # Reset file pointer
                
                pdf_reader = PdfReader(io.BytesIO(file_content))
                document.page_count = len(pdf_reader.pages)
                
                # Extract text using centralized utility
                extracted_text = extract_text_from_file(document.file)
                
                # Clean and preprocess text
                cleaned_text = DocumentProcessingService._clean_text(extracted_text)
                
                # Update document with the extracted text and metadata
                document.extracted_text = cleaned_text
                document.is_processed = True
                document.save()
                
                logger.info(f"Successfully processed document: {document.title}")
                return True
            else:
                logger.error(f"No file available for document {document.title}")
                document.is_processed = False
                document.save()
                return False
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {document.title}: {str(e)}")
            document.is_processed = False
            document.extracted_text = f"[Error processing document: {str(e)}]"
            document.save()
            return False
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize extracted text"""
        if not text or text.startswith('['):
            return text  # Don't clean error messages
            
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
            'storage_type': document.storage_type,
            'created_at': document.created_at,
            'updated_at': document.updated_at,
        }
