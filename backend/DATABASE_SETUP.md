# Database Setup Guide for Quiz App

This guide walks you through setting up the database for your Quiz Application with Supabase integration.

## Prerequisites

1. **PostgreSQL** - Make sure PostgreSQL is installed and running
2. **Python Environment** - Python 3.8+ with pip installed
3. **Environment Variables** - A properly configured `.env` file

## Setting Up PostgreSQL Database

### Option 1: Local PostgreSQL Database

1. Create a database:
   ```sql
   CREATE DATABASE quizapp;
   CREATE USER quizapp_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE quizapp TO quizapp_user;
   ```

2. Update `.env` file with your local credentials:
   ```
   DB_NAME=quizapp
   DB_USER=quizapp_user
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```

### Option 2: Supabase Integration

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get connection details from Supabase dashboard
4. Update `.env` file:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_SECRET=your-supabase-service-role-key
   USE_SUPABASE_STORAGE=True
   
   # Direct PostgreSQL connection details
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your-postgres-db-password
   DB_HOST=your-project-db-host.supabase.co
   DB_PORT=5432
   ```

## Running Setup Script

The included `setup.py` script will:
1. Install all dependencies
2. Check database connection
3. Apply migrations
4. Create a superuser

Run it with:

```
python setup.py
```

## Applying Migrations Manually

If you prefer to apply migrations manually:

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Apply standard Django migrations:
   ```
   python manage.py migrate
   ```

3. Apply consolidated project migrations:
   ```
   python manage.py migrate migrations
   ```

4. Create a superuser:
   ```
   python manage.py createsuperuser
   ```

## Verifying Setup

1. Start the development server:
   ```
   python manage.py runserver
   ```

2. Visit admin panel at http://127.0.0.1:8000/admin/
3. Log in with your superuser credentials
4. Verify that all models are visible in the admin panel

## Required Tables

The setup will create the following key tables:
- Users and authentication tables
- Department and related models
- Document storage and processing
- Question batches and AI-generated questions
- Quizzes and attempts
- Notifications

## Troubleshooting

- **Database connection errors**: Check your PostgreSQL credentials in `.env`
- **Missing tables**: Verify migrations were applied correctly
- **Module errors**: Ensure all dependencies are installed
