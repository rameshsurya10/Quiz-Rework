# AI-Powered Quiz Generator

A modern web application that generates quizzes from PDF documents and other file types using AI. This project features a Django backend and a React frontend, providing a seamless experience for administrators, teachers, and students.

## Core Features

-   **AI-Powered Quiz Generation**: Create quizzes from PDF, DOCX, TXT, and other file formats.
-   **Multiple Question Types**: Supports MCQ, Fill in the Blanks, True/False, and One-Line questions.
-   **Role-Based Access Control**: Separate interfaces and functionality for Admins, Teachers, and Students.
-   **Isolated Authentication**: Secure and independent authentication flows for admins (password-based) and users (OTP-based).
-   **File and Document Management**: Upload documents and associate them with quizzes.
-   **Quiz Management**: Create, edit, publish, and share quizzes with unique URLs.
-   **Student and Department Management**: Organize students into departments and manage their data.
-   **Bulk User Upload**: Easily add multiple students at once using CSV/XLSX templates.
-   **Analytics and Reporting**: Track quiz performance and student results.
-   **Pluggable Storage**: Supports local file storage, Supabase, and AWS S3.

## Technology Stack

| Category      | Technology                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| **Backend**   | Django, Django REST Framework                                                                               |
| **Frontend**  | React, Material-UI                                                                                          |
| **Database**  | PostgreSQL with pgvector extension                                                                          |
| **AI**        | OpenAI API for question generation                                                                          |
| **Auth**      | JWT (for admins) and OTP (for teachers/students)                                                            |
| **Storage**   | Supabase Storage, AWS S3, Local File Storage                                                                |
| **Deployment**| Docker (optional)                                                                                           |

## Project Architecture

The application is structured as a monorepo with a `backend` (Django) and a `frontend` (React) directory.

### Backend Structure

The Django backend is organized into several apps, each responsible for a specific domain:

-   `accounts`: Manages user authentication (Admin, Teacher, Student) and profiles.
-   `quiz`: Core application for creating, managing, and taking quizzes. Handles file uploads associated with quizzes.
-   `departments`: Manages organizational units and student groupings.
-   `students`: Manages student profiles and data.
-   `teacher`: Manages teacher-specific functionalities.
-   `dashboard`: Provides data for analytics dashboards.
-   `notifications`: Handles user notifications.
-   `settings`: Manages application-level settings.
-   `documents`: *Note: This app appears to be partially deprecated. Core document/file handling is managed by the `quiz` app.*

### Frontend Structure

The React frontend is built with functional components and hooks:

-   `components`: Contains reusable UI components for different features (auth, quiz, dashboard, etc.).
-   `services`: Manages API interactions, separating data-fetching logic from UI components (`quizService.js` is a key service).
-   `contexts`: Provides global state management for features like snackbar notifications and theming.
-   `routes`: Defines the application's routing using React Router.
-   `utils`: Contains helper functions and utilities.

## User Flows

### 1. Teacher: Creating a Quiz

The primary workflow for a teacher involves creating a quiz from a document:

1.  **Login**: The teacher logs in using an OTP sent to their registered email.
2.  **Navigate to Quiz Section**: The teacher accesses the quiz management dashboard.
3.  **Initiate Quiz Creation**: The teacher clicks "Create New Quiz".
4.  **Fill Quiz Details**: The teacher provides a title, description, number of questions, time limit, etc.
5.  **Upload Document**: The teacher uses the `FileUpload` component to upload a relevant document (e.g., a PDF textbook chapter). The component allows for drag-and-drop or browsing files.
6.  **Submit Form**: Upon submission, the following occurs:
    a. The frontend (`TeacherQuizSection.js`) calls the `quizService.createQuizWithFiles` function.
    b. The `quizService` first sends a request to the backend to create the quiz metadata.
    c. If the quiz is created successfully, the service then uploads the associated file(s) to the `/api/quiz/<quiz_id>/upload/` endpoint.
7.  **Backend Processing**:
    a. The backend's `QuizFileUploadView` receives the file.
    b. The file is saved to the configured storage (e.g., Supabase).
    c. An AI-powered process is triggered to extract text from the document and generate questions.
8.  **Review and Publish**: The teacher can review the generated questions, edit them if needed, and then publish the quiz to make it available for students.

```
quiz-app/
├── backend/               # Django backend
│   ├── accounts/          # User authentication & profiles
│   ├── departments/       # Department & bulk student management
│   ├── documents/         # PDF document handling
│   ├── quiz/              # Quiz management
│   ├── notifications/     # Email & SMS notifications
│   ├── students/          # Student records
│   ├── teacher/           # Teacher records
│   ├── reports/           # Analytics & PDF exports
│   ├── migrations/        # Consolidated migrations
│   ├── templates/         # Sample templates and email templates
│   └── config/            # Project settings
│
└── frontend/              # React frontend
    ├── public/
    └── src/
        ├── components/    # Reusable UI components
        ├── hooks/         # Custom React hooks
        ├── services/      # API & Supabase integrations
        ├── routes/        # Application routes
        ├── contexts/      # React context providers
        └── utils/         # Helper functions
```

## Backend Architecture

### Key Components

- **User Management**: Role-based access control with Admin, Teacher, and Student roles
- **Document Processing**: PDF upload and text extraction with AI processing capability
- **Quiz Generation**: AI-powered quiz question generation and management
- **Quiz Sharing**: Share quizzes via unique URLs for easy distribution to students
- **Department Management**: Organization structure with bulk student management 
- **Notification System**: Email and SMS notifications for quiz Assigns

### Storage Strategy

The application implements a dual storage strategy:

- **Default**: Django's standard file storage system
- **Supabase**: Cloud-based storage when enabled via settings
- **Vector Database**: pgvector extension for PostgreSQL to store document embeddings

The implementation is toggled via the `USE_SUPABASE_STORAGE` setting in `.env`. No code changes are required to switch between storage backends.

### Database Migrations

Migrations are consolidated in a central `migrations` app, which simplifies schema evolution across tightly coupled models. To apply migrations, use `python manage.py migrate migrations`.

1.  **Login**: The student logs in using OTP.
2.  **Access Quiz**: The student can access the quiz through their dashboard or via a direct shareable link provided by the teacher.
3.  **Take Quiz**: The student answers the questions within the given time limit.
4.  **View Results**: Upon completion, the student can view their score and results.

### 3. Admin: Managing the Platform

1.  **Login**: The admin logs in using a username and password.
2.  **Dashboard**: The admin has access to a dashboard with an overview of platform usage.
3.  **User Management**: Admins can create, edit, and manage teacher and student accounts.
4.  **Department Management**: Admins can create and manage departments.

## Setup and Installation

### Prerequisites

-   Python 3.8+
-   Node.js 14+
-   PostgreSQL

### Backend Setup

1.  Navigate to the `backend` directory: `cd backend`
2.  Create a virtual environment: `python -m venv venv` and activate it.
3.  Install dependencies: `pip install -r requirements.txt`
4.  Create a `.env` file (see [Configuration](#configuration)) and add your environment variables.
5.  Run database migrations: `python manage.py migrate`
6.  Start the server: `python manage.py runserver`

### Frontend Setup

1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Start the development server: `npm start`

## Configuration

Create a `.env` file in the `backend` directory with the following variables.

```
# Django Settings
SECRET_KEY=your_django_secret_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# OpenAI API for AI features
OPENAI_API_KEY=your_openai_api_key

# Supabase (optional, for storage)
USE_SUPABASE_STORAGE=False
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SECRET=your_supabase_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## API Documentation

API documentation is generated using `drf-yasg` and is available at `/api/docs/` (Swagger) and `/api/redoc/` when the backend server is running.
