#!/usr/bin/env python
"""
Setup script to initialize the Quiz Rework project
"""
import os
import platform
import subprocess
import sys

def run_command(command):
    """Run a command and return its output"""
    result = subprocess.run(command, 
                           capture_output=True, 
                           text=True, 
                           shell=True)
    return result.stdout, result.stderr, result.returncode

def install_dependencies():
    """Install all required dependencies"""
    print("Installing dependencies...")
    
    # Install required packages
    packages = [
        "django==4.2.7",
        "djangorestframework==3.14.0",
        "django-cors-headers==4.3.0",
        "djangorestframework-simplejwt==5.3.0",
        "django-filter==23.3",
        "djoser==2.2.0",
        "drf-yasg==1.21.7",
        "django-phonenumber-field==7.1.0",
        "phonenumbers==8.13.19",
        "psycopg2-binary==2.9.9",
        "pypdf2==3.0.1",
        "langchain==0.0.335",
        "openai==1.3.3",
        "django-storages==1.14.2",
        "boto3==1.33.6",
        "supabase==1.0.3",
        "python-dotenv==1.0.0",
    ]
    
    for package in packages:
        print(f"Installing {package}...")
        stdout, stderr, returncode = run_command(f"{sys.executable} -m pip install {package}")
        if returncode != 0:
            print(f"Error installing {package}: {stderr}")
            return False
    
    return True

def check_db_connection():
    """Check if we can connect to the database"""
    print("Checking database connection...")
    
    # Test database connection
    stdout, stderr, returncode = run_command(f"{sys.executable} manage.py check")
    
    if returncode != 0:
        print(f"Database connection failed: {stderr}")
        return False
    
    print("Database connection successful!")
    return True

def apply_migrations():
    """Apply database migrations"""
    print("Applying migrations...")
    
    # First make migrations for all apps
    stdout, stderr, returncode = run_command(f"{sys.executable} manage.py makemigrations")
    if returncode != 0:
        print(f"Error making migrations: {stderr}")
        return False
    
    # Apply migrations
    stdout, stderr, returncode = run_command(f"{sys.executable} manage.py migrate")
    if returncode != 0:
        print(f"Error applying migrations: {stderr}")
        return False
    
    # Then apply our consolidated migrations
    stdout, stderr, returncode = run_command(f"{sys.executable} manage.py migrate migrations")
    if returncode != 0:
        print(f"Error applying consolidated migrations: {stderr}")
        return False
    
    print("Migrations applied successfully!")
    return True

def create_superuser():
    """Create a superuser if needed"""
    create = input("Do you want to create a superuser? (y/n): ")
    if create.lower() == 'y':
        os.system(f"{sys.executable} manage.py createsuperuser")

def main():
    """Main function to set up the project"""
    print("Setting up Quiz Rework project...")
    
    # Install dependencies
    if not install_dependencies():
        print("Failed to install dependencies. Please check the error messages above.")
        return
    
    # Check database connection
    if not check_db_connection():
        print("Failed to connect to database. Please check your database settings.")
        return
    
    # Apply migrations
    if not apply_migrations():
        print("Failed to apply migrations. Please check the error messages above.")
        return
    
    # Create superuser
    create_superuser()
    
    print("\nSetup completed successfully!")
    print("You can now run the development server with: python manage.py runserver")

if __name__ == "__main__":
    main()
