"""
Management command to generate missing embeddings for documents.
"""

import os
import logging
import pickle
import uuid
from django.core.management.base import BaseCommand
from django.conf import settings
from documents.models import Document, DocumentVector
from config.vector_db import VectorDB
from openai import OpenAI

class Command(BaseCommand):
    help = 'Generate missing embeddings for documents'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration of embeddings for all documents',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        try:
            # Get documents without embeddings
            if force:
                documents = Document.objects.all()
                self.stdout.write(self.style.SUCCESS(f'Processing all {documents.count()} documents'))
            else:
                # Get documents that don't have a corresponding DocumentVector
                documents = Document.objects.filter(vector__isnull=True)
                self.stdout.write(self.style.SUCCESS(f'Found {documents.count()} documents without embeddings'))
            
            # Initialize vector database
            vector_db = VectorDB()
            
            # Process each document
            success_count = 0
            error_count = 0
            
            for document in documents:
                try:
                    # Generate embedding
                    embedding = vector_db.generate_embedding(document.extracted_text)
                    
                    # If the vector_db couldn't generate an embedding, try directly with OpenAI
                    if not embedding:
                        try:
                            client = OpenAI(api_key=settings.OPENAI_API_KEY)
                            
                            # Handle large documents by chunking
                            text_for_embedding = document.extracted_text
                            approx_tokens = len(text_for_embedding) / 4
                            
                            if approx_tokens > 8000:  # Close to the 8192 limit
                                self.stdout.write(self.style.WARNING(f"Text too long (approx {approx_tokens:.0f} tokens), truncating to first 8000 tokens"))
                                # Truncate to approximately 8000 tokens (32000 chars)
                                text_for_embedding = text_for_embedding[:32000]
                            
                            response = client.embeddings.create(
                                input=text_for_embedding,
                                model="text-embedding-ada-002"
                            )
                            embedding = response.data[0].embedding
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'Error with direct OpenAI embedding: {e}'))
                    
                    if embedding:
                        # Generate a UUID for the document if needed
                        doc_uuid = str(uuid.uuid4())
                        
                        # Serialize embedding
                        binary_embedding = pickle.dumps(embedding)
                        
                        # Create or update DocumentVector
                        document_vector, created = DocumentVector.objects.update_or_create(
                            document=document,
                            defaults={
                                'vector_uuid': uuid.UUID(doc_uuid),
                                'embedding': binary_embedding,
                                'is_indexed': True,
                                'metadata': {
                                    'title': document.title,
                                    'description': document.description,
                                    'file_path': document.file.name,
                                    'file_size': document.file_size,
                                }
                            }
                        )
                        
                        # Try to store in vector database
                        try:
                            vector_db.upsert_document(
                                doc_uuid, 
                                document.extracted_text, 
                                {
                                    'title': document.title,
                                    'description': document.description,
                                    'file_path': document.file.name,
                                    'file_size': document.file_size,
                                }
                            )
                        except Exception as e:
                            self.stdout.write(self.style.WARNING(f'Error storing document {document.id} in vector database: {e}'))
                        
                        success_count += 1
                        self.stdout.write(self.style.SUCCESS(f'Generated embedding for document {document.id}: {document.title}'))
                    else:
                        error_count += 1
                        self.stdout.write(self.style.ERROR(f'Failed to generate embedding for document {document.id}: {document.title}'))
                
                except Exception as e:
                    error_count += 1
                    self.stdout.write(self.style.ERROR(f'Error processing document {document.id}: {e}'))
            
            # Close vector database connection
            vector_db.close()
            
            # Print summary
            self.stdout.write(self.style.SUCCESS(f'Processed {success_count + error_count} documents'))
            self.stdout.write(self.style.SUCCESS(f'Successfully generated {success_count} embeddings'))
            self.stdout.write(self.style.WARNING(f'Failed to generate {error_count} embeddings'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error generating embeddings: {e}'))
            logging.error(f'Error generating embeddings: {e}')
            raise 