"""
Management command to set up the vector database.
"""

import os
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection

class Command(BaseCommand):
    help = 'Set up the vector database in Supabase'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force setup even if the extension is already enabled',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        try:
            # Check if pgvector extension is already enabled
            with connection.cursor() as cursor:
                cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
                extension_exists = cursor.fetchone() is not None
                
                if extension_exists and not force:
                    self.stdout.write(self.style.SUCCESS('pgvector extension is already enabled.'))
                else:
                    # Enable pgvector extension
                    cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                    self.stdout.write(self.style.SUCCESS('Enabled pgvector extension.'))
                    
                # Create the documents table
                sql_file_path = os.path.join(settings.BASE_DIR, 'scripts', 'setup_pgvector.sql')
                
                if os.path.exists(sql_file_path):
                    with open(sql_file_path, 'r') as f:
                        sql = f.read()
                        cursor.execute(sql)
                    self.stdout.write(self.style.SUCCESS('Set up vector database tables and functions.'))
                else:
                    self.stdout.write(self.style.WARNING(f'SQL file not found: {sql_file_path}'))
                    
                    # Create the table directly
                    cursor.execute("""
                    CREATE TABLE IF NOT EXISTS public.documents (
                      document_id SERIAL PRIMARY KEY,
                      uuid UUID DEFAULT gen_random_uuid(),
                      filename TEXT NOT NULL,
                      original_filename TEXT NOT NULL,
                      content_type TEXT NOT NULL,
                      file_size BIGINT NOT NULL,
                      extracted_text TEXT,
                      embedding VECTOR(1536),
                      metadata JSONB DEFAULT '{}'::jsonb,
                      is_processed BOOLEAN DEFAULT FALSE,
                      user_id UUID REFERENCES auth.users(id),
                      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    """)
                    
                    # Create index
                    cursor.execute("""
                    CREATE INDEX IF NOT EXISTS documents_embedding_idx 
                    ON public.documents 
                    USING ivfflat (embedding vector_cosine_ops) 
                    WITH (lists = 100);
                    """)
                    
                    self.stdout.write(self.style.SUCCESS('Created documents table and index.'))
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error setting up vector database: {e}'))
            logging.error(f'Error setting up vector database: {e}')
            raise 