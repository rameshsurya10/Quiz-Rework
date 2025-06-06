from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework import permissions

# Set default authentication class
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ]
}
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# API documentation setup
schema_view = get_schema_view(
   openapi.Info(
      title="Quiz App API",
      default_version='v1',
      description="AI-powered quiz generator API",
      terms_of_service="https://www.example.com/terms/",
      contact=openapi.Contact(email="contact@example.com"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT token endpoints for frontend authentication (now handled in accounts app)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints
    path('api/accounts/', include('accounts.urls')),  # User and authentication endpoints
    # path('api/accounts/', include('accounts.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/quizzes/', include('quizzes.urls')),
    path('api/ai/', include('ai_processing.urls')),
    path('api/departments/', include('departments.urls')),
    path('api/notifications/', include('notifications.urls')),
    # path('api/teachers/', include('accounts.urls')),

    
    # JWT Authentication
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # Dashboard endpoints
    # Dashboard endpoints
    path('api/dashboard/', include('dashboard.urls')),
    path('api/dashboards/', include('dashboard.urls')),  # Add this line for plural form
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
