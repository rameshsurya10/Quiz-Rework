"""
Supabase utilities for document handling in the quiz application.
"""

import os
import uuid
from datetime import datetime
from django.conf import settings
from config.supabase import SupabaseStorage, SupabaseDB
from PyPDF2 import PdfReader
from io import BytesIO


class SupabaseDocumentHandler:
    """
    Handler for document operations using Supabase.
    This class provides utilities for uploading PDFs to Supabase Storage
    and storing document metadata in Supabase Database.
    """
    
    def __init__(self):
        self.storage = SupabaseStorage()
        self.db = SupabaseDB()
        self.bucket = 'documents'  # Bucket name for storing documents
    
    def upload_document(self, file, filename, user_id, title=None, description=None):
        """
        Upload a document to Supabase Storage and store metadata.
        
        Args:
            file: File object
            filename: Original filename
            user_id: ID of the user who uploaded the document
            title: Optional document title
            description: Optional document description
            
        Returns:
            dict: Document metadata
        """
        # Generate a unique filename to prevent collisions
        ext = os.path.splitext(filename)[1].lower()
        unique_filename = f"{uuid.uuid4()}{ext}"
        
        # Upload to Supabase Storage
        file.seek(0)  # Make sure we're at the beginning of the file
        upload_result = self.storage.upload_file(self.bucket, unique_filename, file.read())
        
        # Extract document metadata
        file.seek(0)  # Reset file pointer
        file_size = file.size
        title = title or os.path.splitext(filename)[0]
        
        # Extract page count and text if it's a PDF
        page_count = 0
        extracted_text = ""
        
        # Use the centralized text extraction utility
        from documents.utils import extract_text_from_file
        
        try:
            # Reset file pointer
            file.seek(0)
            
            # Extract text
            extracted_text = extract_text_from_file(file)
            
            # Get page count for PDF files
            if ext.lower() == '.pdf':
                file.seek(0)
                pdf = PdfReader(file)
                page_count = len(pdf.pages)
            
            # Create a preview of the extracted text
            if extracted_text:
                # Limit preview text length
                if len(extracted_text) > 1000:
                    extracted_text = extracted_text[:997] + "..."
                    
        except Exception as e:
            print(f"Error processing file: {str(e)}")
        
        # Create document metadata in database
        current_time = datetime.now().isoformat()
        document_data = {
            "filename": unique_filename,
            "original_filename": filename,
            "title": title,
            "description": description or "",
            "file_size": file_size,
            "page_count": page_count,
            "extracted_text_preview": extracted_text,
            "is_processed": False,
            "user_id": user_id,
            "created_at": current_time,
            "updated_at": current_time,
        }
        
        # Insert into Supabase database
        db_result = self.db.insert('documents', document_data)
        
        # Get the document ID from the result
        document_id = None
        if db_result and hasattr(db_result, 'data') and db_result.data:
            document_id = db_result.data[0].get('id')
            document_data['id'] = document_id
        
        # Generate download URL
        document_data['download_url'] = self.storage.get_download_url(self.bucket, unique_filename)
        
        return document_data
    
    def extract_full_text(self, document_id, filename):
        """
        Extract full text from a document and update the database.
        
        Args:
            document_id: ID of the document
            filename: Filename in Supabase Storage
            
        Returns:
            str: Extracted text
        """
        try:
            # Download the document from Supabase Storage
            file_data = self.storage.download_file(self.bucket, filename)
            
            # Use the centralized text extraction utility
            from documents.utils import extract_text_from_file
            from django.core.files.uploadedfile import InMemoryUploadedFile
            import io
            
            # Create a file-like object
            file_obj = InMemoryUploadedFile(
                io.BytesIO(file_data),
                'file',
                filename,
                'application/octet-stream',
                len(file_data),
                None
            )
            
            # Extract text
            extracted_text = extract_text_from_file(file_obj)
            
            # Update the document in the database
            self.db.update(
                'documents', 
                {
                    'extracted_text': extracted_text,
                    'is_processed': True,
                    'updated_at': datetime.now().isoformat()
                },
                id=document_id
            )
            
            return extracted_text
            
        except Exception as e:
            print(f"Error extracting text: {str(e)}")
            return None
    
    def get_document(self, document_id):
        """
        Get a document by ID.
        
        Args:
            document_id: ID of the document
            
        Returns:
            dict: Document data
        """
        result = self.db.select('documents', '*', eq=('id', document_id))
        if result and hasattr(result, 'data') and result.data:
            document = result.data[0]
            
            # Add download URL
            document['download_url'] = self.storage.get_download_url(
                self.bucket, document['filename']
            )
            return document
        return None
    
    def list_documents(self, user_id=None, limit=50):
        """
        List documents, optionally filtered by user ID.
        
        Args:
            user_id: Optional user ID to filter by
            limit: Maximum number of documents to return
            
        Returns:
            list: List of document data
        """
        if user_id:
            result = self.db.select('documents', '*', eq=('user_id', user_id), limit=limit)
        else:
            result = self.db.select('documents', '*', limit=limit)
        
        if result and hasattr(result, 'data'):
            documents = result.data
            
            # Add download URLs
            for doc in documents:
                doc['download_url'] = self.storage.get_download_url(
                    self.bucket, doc['filename']
                )
            
            return documents
        return []
    
    def delete_document(self, document_id):
        """
        Delete a document by ID.
        
        Args:
            document_id: ID of the document
            
        Returns:
            bool: Success status
        """
        # Get the document first to get the filename
        document = self.get_document(document_id)
        if not document:
            return False
        
        # Delete from Supabase Storage
        filename = document['filename']
        self.storage.remove_file(self.bucket, filename)
        
        # Delete from database
        self.db.delete('documents', id=document_id)
        
        return True
