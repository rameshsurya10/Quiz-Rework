from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework import permissions
from django.db.models import Max, Min

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

# Debug view to test URL routing
def debug_view(request):
    from django.http import JsonResponse
    from django.urls import get_resolver
    
    resolver = get_resolver()
    urls = []
    for url_pattern in resolver.url_patterns:
        urls.append(str(url_pattern.pattern))
    
    return JsonResponse({
        'message': 'Debug URL resolver',
        'request_path': request.path,
        'resolved_urls': urls
    })

urlpatterns = [
    path('debug/', debug_view, name='debug'),
    path('admin/', admin.site.urls),
    
    # JWT token endpoints for frontend authentication (now handled in accounts app)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints - Include accounts URLs with namespace
    path('api/accounts/', include(('accounts.urls', 'accounts'), namespace='accounts')),  # User and authentication endpoints
    # path('api/accounts/', include('accounts.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/quizzes/', include('quizzes.urls')),
    path('api/quiz/', include('quiz.urls')),  # Add this line for the quiz app
    path('api/ai/', include('ai_processing.urls')),
    path('api/departments/', include('departments.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/students/', include('students.urls')),
    path('api/', include('teacher.urls')),

    
    # JWT Authentication
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # Dashboard endpoints
    path('api/dashboard/', include('dashboard.urls')),
    path('api/dashboards/', include('dashboard.urls')),  # Add this line for plural form
    
    # Settings endpoints
    path('api/settings/', include('settings.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
