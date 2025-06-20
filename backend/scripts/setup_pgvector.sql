-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Check if the extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Create a table for document vectors if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  document_id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text TEXT,
  embedding VECTOR(1536), -- Dimension size for OpenAI embeddings
  metadata JSONB DEFAULT '{}'::jsonb,
  is_processed BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON public.documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Set up Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can access their own documents" 
ON public.documents 
FOR ALL 
USING (auth.uid() = user_id);

-- Create policy for admins to access all documents
CREATE POLICY "Admins can access all documents" 
ON public.documents 
FOR ALL 
USING (
  (SELECT role FROM auth.users WHERE id = auth.uid()) = 'ADMIN'
);

-- Function to search for similar documents
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  document_id INTEGER,
  filename TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dv.document_id,
    dv.filename,
    1 - (dv.embedding <=> query_embedding) AS similarity
  FROM
    public.documents dv
  WHERE
    1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$; 