import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)
print(f"Loading environment variables from: {env_path}")
print(f"OPENAI_API_KEY exists: {os.getenv('OPENAI_API_KEY') is not None}")

# Supabase settings
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SECRET = os.getenv('SUPABASE_SECRET')
USE_SUPABASE_STORAGE = os.getenv('USE_SUPABASE_STORAGE', 'False') == 'True'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-default-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'storages',
    'django_extensions',
    
    # Local apps
    'accounts',
    'documents',
    'teacher',
    'students',
    # 'quize',
    'dashboard',
    'departments',
    'notifications',
    'reports',
    'settings',
    'quiz',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'postgres'),
        'USER': os.getenv('DB_USER', 'postgres.jlrirnwhigtmognookoe'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'Jumbo@quiz08'),
        'HOST': os.getenv('DB_HOST', 'aws-0-ap-south-1.pooler.supabase.com'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'require',
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'upload')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS settings
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True  # More permissive for development
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
CORS_ALLOW_HEADERS = ['*']
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']

# Frontend URL for generating share links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Media files (user-uploaded files)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'upload')

# Create upload directory if it doesn't exist
os.makedirs(MEDIA_ROOT, exist_ok=True)

# File Storage Configuration (Vector DB, AWS S3, or Supabase)
# Use Vector DB by default for documents
USE_VECTOR_DB = os.getenv('USE_VECTOR_DB', 'True') == 'True'

# Default to Vector Storage for document uploads
DEFAULT_FILE_STORAGE = 'config.vector_storage.VectorStorage'

# Use Supabase if configured and not using Vector DB exclusively
if os.getenv('USE_SUPABASE_STORAGE', 'False') == 'True' and SUPABASE_URL and SUPABASE_KEY:
    # Supabase Storage settings
    SUPABASE_URL_EXPIRY_SECONDS = int(os.getenv('SUPABASE_URL_EXPIRY_SECONDS', 3600))
    
    # Static files will still be served locally or by whitenoise in production
    STATIC_URL = 'static/'
    STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
    
    # Media files will be stored in Supabase
    MEDIA_URL = '/media/'
    PRIVATE_FILE_STORAGE = 'config.supabase_storage.SupabasePrivateStorage'

# Use AWS S3 if configured and not using Vector DB or Supabase
elif os.getenv('USE_S3', 'False') == 'True':
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.getenv('AWS_REGION', 'us-east-1')
    AWS_DEFAULT_ACL = 'private'
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    
    # S3 static settings
    STATIC_LOCATION = 'static'
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{STATIC_LOCATION}/'
    STATICFILES_STORAGE = 'config.storage_backends.StaticStorage'
    
    # S3 media settings
    PUBLIC_MEDIA_LOCATION = 'media/public'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{PUBLIC_MEDIA_LOCATION}/'
    DEFAULT_FILE_STORAGE = 'config.storage_backends.PublicMediaStorage'
    
    # S3 private media settings
    PRIVATE_MEDIA_LOCATION = 'media/private'
    PRIVATE_FILE_STORAGE = 'config.storage_backends.PrivateMediaStorage'

# OpenAI API Key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
if not OPENAI_API_KEY:
    print("WARNING: OPENAI_API_KEY not found in environment variables")
    print("Please set OPENAI_API_KEY in your .env file")
elif not OPENAI_API_KEY.startswith('sk-'):
    print("WARNING: Invalid OpenAI API key format")
    print("API key should start with 'sk-'")
    print("Please get a valid API key from: https://platform.openai.com/account/api-keys")
    print("Current key starts with:", OPENAI_API_KEY[:10] + "...")
else:
    print("OpenAI API Key found:", OPENAI_API_KEY[:10] + "...")

# Supabase settings
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SECRET = os.getenv('SUPABASE_SECRET')

# If Supabase is configured, use it instead of local PostgreSQL
if SUPABASE_URL and SUPABASE_KEY:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('SUPABASE_DB_NAME', 'postgres'),
            'USER': os.getenv('SUPABASE_DB_USER', 'postgres'),
            'PASSWORD': os.getenv('SUPABASE_DB_PASSWORD'),
            'HOST': os.getenv('SUPABASE_DB_HOST'),
            'PORT': os.getenv('SUPABASE_DB_PORT', '5432'),
        }
    }

# PDF settings
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_DOCUMENT_TYPES = ['application/pdf']

# Import local settings
try:
    from .local_settings import *
except ImportError:
    pass

# OpenAI Settings
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY not found in environment variables")

# Webhook configuration
WEBHOOK_SECRET_KEY = os.environ.get('WEBHOOK_SECRET_KEY', 'your-webhook-secret-key-here')