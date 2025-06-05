# AI-Powered Quiz Generator

A modern web application that generates quizzes from PDF documents using AI.

## Core Features

- PDF Upload and Text Extraction
- AI-Generated Questions from PDF Content
- Role-Based Authentication (Admin/Teacher/Student)
- Quiz Creation and Management
- Analytics and Performance Tracking

## Tech Stack

### Backend
- Django/Django REST Framework
- PostgreSQL
- OpenAI API & LangChain
- PyPDF2 for PDF processing

### Frontend
- React.js
- TypeScript
- Tailwind CSS
- React Query
- React Router

### Infrastructure
- Supabase for database, storage, and authentication (primary)
- AWS S3 for alternative file storage
- Docker for containerization (optional)

## Project Structure

```
quiz-app/
├── backend/               # Django backend
│   ├── accounts/          # User authentication & profiles
│   ├── departments/       # Department & bulk student management
│   ├── documents/         # PDF document handling
│   ├── quizzes/           # Quiz management
│   ├── ai_processing/     # AI question generation
│   ├── notifications/     # Email & SMS notifications
│   ├── migrations/        # Consolidated migrations
│   ├── templates/         # Sample templates and email templates
│   └── config/            # Project settings
│
└── frontend/              # React frontend
    ├── public/
    └── src/
        ├── components/    # Reusable UI components
        ├── pages/         # Application pages
        ├── api/           # API integration
        ├── hooks/         # Custom React hooks
        ├── context/       # React context providers
        └── utils/         # Helper functions
```

## Backend Architecture

### Key Components

- **User Management**: Role-based access control with Admin, Teacher, and Student roles
- **Document Processing**: PDF upload and text extraction with AI processing capability
- **Quiz Generation**: AI-powered quiz question generation and management
- **Department Management**: Organization structure with bulk student management 
- **Notification System**: Email and SMS notifications for quiz assignments

### Storage Strategy

The application implements a dual storage strategy:

- **Default**: Django's standard file storage system
- **Supabase**: Cloud-based storage when enabled via settings

The implementation is toggled via the `USE_SUPABASE_STORAGE` setting in `.env`. No code changes are required to switch between storage backends.

### Database Migrations

Migrations are consolidated in a central `migrations` app, which simplifies schema evolution across tightly coupled models. To apply migrations, use `python manage.py migrate migrations`.

### Sample Templates

Sample data templates are stored in the `backend/templates/samples/` directory:
- `sample_students_upload.csv`: Template for bulk student uploads

## Getting Started

### Backend Setup

1. Copy `.env.sample` to `.env` and configure your environment variables
2. Install dependencies: `pip install -r requirements.txt`
3. Apply migrations: `python manage.py migrate migrations`
4. Create superuser: `python manage.py createsuperuser`
5. Run development server: `python manage.py runserver`

## Supabase Integration

This application supports Supabase for database, storage, and authentication services.

### Setting Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new Supabase project
3. Set up the following tables in the Supabase database (via SQL Editor):

```sql
-- Documents table for storing uploaded PDFs metadata
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_size BIGINT NOT NULL,
  page_count INTEGER,
  extracted_text_preview TEXT,
  extracted_text TEXT,
  is_processed BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own documents and admins to read all documents
CREATE POLICY "Users can read their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

4. Configure Storage in Supabase: 
   - Go to Storage in the Supabase dashboard
   - Create buckets named `documents`, `public`, and `private`
   - Set appropriate permissions for each bucket

### Configuring the Application for Supabase

1. Copy `.env.sample` to `.env` in the backend directory
2. Update the following variables in your `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SECRET=your-supabase-service-role-key
USE_SUPABASE_STORAGE=True

# Direct PostgreSQL connection details (find these in Supabase settings)
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-postgres-db-password
SUPABASE_DB_HOST=your-project-db-host.supabase.co
SUPABASE_DB_PORT=5432
```

### Switching Between Storage Providers

You can toggle between Supabase Storage and AWS S3:

- To use Supabase Storage, set `USE_SUPABASE_STORAGE=True` in your `.env` file
- To use AWS S3, set `USE_SUPABASE_STORAGE=False` and `USE_S3=True`
=======
# Jumbo_Quiz
>>>>>>> ff944bbd16af5d65b039a535551d197e4209f1a6
