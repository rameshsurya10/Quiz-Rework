"""
Vector database integration for Django using Supabase and pgvector.
This module provides utilities to interact with vector databases in Supabase.
"""

import os
import numpy as np
from typing import List, Dict, Any, Union, Optional, Tuple
from functools import lru_cache
import logging

from django.conf import settings
from .supabase import get_supabase_client

# Try to import vecs for direct pgvector operations
try:
    import vecs
    VECS_AVAILABLE = True
except ImportError:
    VECS_AVAILABLE = False
    logging.warning("vecs package not available. Install with: pip install vecs")

# Try to import OpenAI for generating embeddings
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("openai package not available. Install with: pip install openai")


@lru_cache(maxsize=1)
def get_vector_client():
    """
    Get a cached vector client instance.
    
    Returns:
        vecs.Client: A vector client instance.
    """
    if not VECS_AVAILABLE:
        raise ImportError("vecs package is required for vector operations")
    
    try:
        # Connection string format: postgresql://user:password@host:port/db_name?sslmode=require
        db_connection = f"postgresql://{settings.DATABASES['default']['USER']}:{settings.DATABASES['default']['PASSWORD']}@{settings.DATABASES['default']['HOST']}:{settings.DATABASES['default']['PORT']}/{settings.DATABASES['default']['NAME']}?sslmode=require"
        
        return vecs.create_client(db_connection)
    except Exception as e:
        logging.error(f"Error connecting to vector database: {e}")
        # Return a dummy client for development/testing
        return None


class VectorDB:
    """
    Utility class for interacting with vector databases in Supabase.
    
    Example usage:
        vector_db = VectorDB()
        vector_db.upsert_document('document_uuid', 'Document text content', {'metadata': 'value'})
        results = vector_db.search('search query', limit=5)
    """
    
    def __init__(self, collection_name="documents", dimension=1536):
        """
        Initialize the VectorDB with a collection name and vector dimension.
        
        Args:
            collection_name (str): Name of the vector collection
            dimension (int): Dimension of the vectors (1536 for OpenAI embeddings)
        """
        if not VECS_AVAILABLE:
            raise ImportError("vecs package is required for VectorDB")
        
        self.client = get_vector_client()
        self.collection_name = collection_name
        self.dimension = dimension
        
        # Handle case when client is None (connection failed)
        if self.client is None:
            logging.warning("Vector database connection failed. Using local file storage only.")
            self.collection = None
            return
            
        # Get or create the collection
        try:
            self.collection = self.client.get_or_create_collection(
                name=collection_name,
                dimension=dimension
            )
        except Exception as e:
            logging.error(f"Error creating collection: {e}")
            self.collection = None
        
        # Set up OpenAI if available
        if OPENAI_AVAILABLE:
            openai.api_key = getattr(settings, 'OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY'))
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding vector for the given text using OpenAI.
        
        Args:
            text (str): Text to generate embedding for
            
        Returns:
            List[float]: Embedding vector
        """
        if not OPENAI_AVAILABLE:
            logging.error("OpenAI package is required for generating embeddings")
            return None
        
        # If text is empty or just whitespace, use a placeholder
        if not text or not text.strip():
            text = "[This document contains no extractable text]"
        
        try:
            # Check if API key is available
            api_key = getattr(settings, 'OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY'))
            if not api_key:
                logging.error("OpenAI API key not found")
                return None
                
            # Set API key - new OpenAI client style
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            
            # Handle large documents by chunking
            # Approximate token count (1 token ~= 4 chars in English)
            approx_tokens = len(text) / 4
            
            if approx_tokens > 8000:  # Close to the 8192 limit
                logging.warning(f"Text too long (approx {approx_tokens:.0f} tokens), truncating to first 8000 tokens")
                # Truncate to approximately 8000 tokens (32000 chars)
                text = text[:32000]
                
            # Generate embedding - new API style
            response = client.embeddings.create(
                input=text,
                model="text-embedding-ada-002"
            )
            return response.data[0].embedding
        except Exception as e:
            logging.error(f"Error generating embedding: {e}")
            return None
    
    def upsert_document(self, doc_uuid: str, text: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Insert or update a document with its embedding vector.
        
        Args:
            doc_uuid (str): Unique document UUID
            text (str): Document text content to generate embedding from
            metadata (dict, optional): Additional metadata for the document
            
        Returns:
            bool: Success status
        """
        try:
            # If collection is None, just store metadata locally
            if self.collection is None:
                logging.warning(f"Vector collection not available. Document {doc_uuid} stored only locally.")
                return True
                
            # Generate embedding
            embedding = self.generate_embedding(text)
            
            # Prepare metadata
            if metadata is None:
                metadata = {}
                
            # Add text preview to metadata
            if text and len(text) > 1000:
                metadata['text_preview'] = text[:1000] + "..."
            else:
                metadata['text_preview'] = text
                
            # Store in vector database
            self.collection.upsert(
                records=[
                    (doc_uuid, embedding, metadata)
                ]
            )
            
            # Create index if it doesn't exist
            # This is a no-op if the index already exists
            self.collection.create_index()
            
            return True
        except Exception as e:
            logging.error(f"Error upserting document: {e}")
            return False
    
    def upsert_file(self, doc_uuid: str, file_path: str, extracted_text: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Insert or update a file with its extracted text and embedding vector.
        
        Args:
            doc_uuid (str): Unique document UUID
            file_path (str): Path to the file (for metadata)
            extracted_text (str): Extracted text content from the file
            metadata (dict, optional): Additional metadata for the document
            
        Returns:
            bool: Success status
        """
        try:
            if metadata is None:
                metadata = {}
                
            # Add file info to metadata
            metadata['file_path'] = file_path
            metadata['file_name'] = os.path.basename(file_path)
            
            # If collection is None, just log the metadata
            if self.collection is None:
                logging.info(f"File {file_path} saved locally. Vector storage not available.")
                return True
                
            # Use the extracted text to generate embedding and store
            return self.upsert_document(doc_uuid, extracted_text, metadata)
        except Exception as e:
            logging.error(f"Error upserting file: {e}")
            return False
    
    def search(self, query_text: str, limit: int = 5, include_metadata: bool = True, 
              filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Search for documents similar to the query text.
        
        Args:
            query_text (str): Query text to search for
            limit (int): Maximum number of results to return
            include_metadata (bool): Whether to include metadata in results
            filters (dict): Metadata filters to apply
            
        Returns:
            List[Dict]: Search results
        """
        try:
            # If collection is None, return empty results
            if self.collection is None:
                logging.warning("Vector collection not available. Search returning empty results.")
                return []
                
            # Generate embedding for query
            query_embedding = self.generate_embedding(query_text)
            
            # Query the vector database
            results = self.collection.query(
                data=query_embedding,
                limit=limit,
                include_metadata=include_metadata,
                include_value=True,
                filters=filters
            )
            
            # Format results
            formatted_results = []
            for doc_uuid, similarity, metadata in results:
                result = {
                    'uuid': doc_uuid,
                    'similarity': similarity
                }
                if include_metadata:
                    result['metadata'] = metadata
                formatted_results.append(result)
                
            return formatted_results
        except Exception as e:
            logging.error(f"Error searching documents: {e}")
            return []
    
    def delete_document(self, doc_uuid: str) -> bool:
        """
        Delete a document from the vector database.
        
        Args:
            doc_uuid (str): Document UUID to delete
            
        Returns:
            bool: Success status
        """
        try:
            # If collection is None, just return success
            if self.collection is None:
                logging.warning(f"Vector collection not available. Cannot delete document {doc_uuid}.")
                return False
                
            deleted = self.collection.delete(ids=[doc_uuid])
            return len(deleted) > 0
        except Exception as e:
            logging.error(f"Error deleting document: {e}")
            return False
    
    def close(self):
        """Close the vector database connection."""
        if hasattr(self, 'client') and self.client is not None:
            try:
                self.client.disconnect()
            except Exception as e:
                logging.error(f"Error closing vector database connection: {e}") 