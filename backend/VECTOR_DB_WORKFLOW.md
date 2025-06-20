# Vector Database Workflow with Supabase

This document outlines the complete workflow for setting up and using a vector database with Supabase in your Quiz-Rework project. This integration enables semantic search across various document types, including images, PDFs, and handwritten documents.

## Overview

The workflow consists of the following components:

1. **Supabase with pgvector**: The database that stores document vectors
2. **Folder Processor**: Monitors a folder for new files and processes them
3. **Vector Processor**: Extracts text and generates embeddings
4. **Django Integration**: API endpoints for vector database operations
5. **n8n Webhook**: Optional integration for automation workflows

## 1. Setting Up pgvector in Supabase

### 1.1 Enable the pgvector Extension

In your Supabase project's SQL Editor, run:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Check if the extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 1.2 Create Tables for Document Vectors

```sql
-- Create a table for document vectors
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  (SELECT is_admin FROM auth.users WHERE id = auth.uid()) = true
);
```

### 1.3 Create Helper Function for Similarity Search

```sql
-- Function to search for similar documents
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dv.id,
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
```

## 2. Django Integration

### 2.1 Install Required Packages

Add the following packages to your `requirements.txt`:

```
vecs>=0.3.0
openai>=1.0.0
pypdf>=3.15.1
pytesseract>=0.3.10
Pillow>=10.0.0
numpy>=1.24.3
```

Install with:

```bash
pip install -r requirements.txt
```

### 2.2 Set Up Environment Variables

Add the following to your `.env` file:

```
# Vector Database Configuration
OPENAI_API_KEY=your-openai-api-key
USE_VECTOR_DB=True
```

### 2.3 Run the Django Management Command

```bash
python manage.py setup_vector_db
```

### 2.4 Use the Vector Database API Endpoints

The following endpoints are available:

- `POST /api/documents/vector/upload/`: Upload a document to the vector database
- `POST /api/documents/vector/search/`: Search for similar documents

Example search request:

```json
{
  "query": "What is machine learning?",
  "limit": 5,
  "filters": {
    "user_id": "user-123"
  }
}
```

Example response:

```json
{
  "results": [
    {
      "id": "doc-123",
      "similarity": 0.89,
      "metadata": {
        "title": "Introduction to Machine Learning",
        "filename": "ml_intro.pdf",
        "text_preview": "Machine learning is a subset of artificial intelligence..."
      }
    },
    ...
  ],
  "count": 5
}
```

## 3. Folder Processor Integration

### 3.1 Set Up the Folder Processor

1. Navigate to the folder processor directory:
   ```bash
   cd backend/folder\ processor/
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with:
   ```
   # Webhook Configuration
   WEBHOOK_URL=https://your-n8n-webhook-url.com/webhook/path
   
   # Vector Database Configuration
   USE_VECTOR_DB=true
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_POSTGRES_URL=postgresql://postgres:your-password@your-project-db-host.supabase.co:5432/postgres
   OPENAI_API_KEY=your-openai-api-key
   ```

4. Create the required directories:
   ```bash
   mkdir -p New Sent
   ```

### 3.2 Run the Folder Monitor

```bash
python file_monitor.py
```

### 3.3 Test Vector Search

```bash
python search_vectors.py "your search query"
```

## 4. n8n Integration

### 4.1 Set Up n8n Webhook

1. Create a new workflow in n8n
2. Add an HTTP Request node as the trigger (webhook)
3. Configure the webhook to receive POST requests
4. Copy the webhook URL to your `.env` file

### 4.2 Process Incoming Data

Configure n8n to process the incoming data:

1. Add a "Function" node to extract the file content and metadata
2. Add a "Supabase" node to store additional metadata if needed
3. Add any additional processing nodes as needed

### 4.3 Complete Workflow

The complete workflow is:

1. File is placed in the "New" folder
2. Folder processor detects the file
3. Text is extracted from the file
4. Vector embedding is generated
5. File is sent to the webhook (n8n)
6. Vector embedding is stored in Supabase
7. File is moved to the "Sent" folder

## 5. Supported File Types

- **Images (JPG, PNG, etc.)**: Uses OCR for text extraction
- **PDFs**: Extracts text from all pages
- **Text files**: Uses the text content directly
- **Handwritten documents**: Uses OCR to extract text from images of handwritten content

## 6. Troubleshooting

### 6.1 Vector Database Connection Issues

If you encounter connection issues:

1. Check your Supabase connection string
2. Ensure the pgvector extension is enabled
3. Verify that your Supabase API key has the necessary permissions

### 6.2 Text Extraction Issues

If text extraction is not working:

1. Ensure pytesseract is installed correctly
2. For OCR, make sure Tesseract is installed on your system
3. Check the image quality for handwritten documents

### 6.3 Embedding Generation Issues

If embedding generation is not working:

1. Verify your OpenAI API key
2. Check if the extracted text is not empty
3. Ensure you have sufficient OpenAI API credits

## 7. Next Steps

- **Fine-tuning**: Adjust the vector index parameters for better performance
- **Custom Embeddings**: Implement custom embedding models for domain-specific applications
- **UI Integration**: Add a search interface to your frontend
- **Batch Processing**: Implement batch processing for large document collections 