from django.urls import path
from django.conf import settings

from .views import (
    DocumentListCreateView,
    DocumentDetailView,
    DocumentUploadView,
    ExtractTextView,
)

# Import Supabase views if Supabase is configured
if settings.SUPABASE_URL and settings.SUPABASE_KEY and settings.SUPABASE_SECRET:
    from .views_supabase import (
        SupabaseDocumentUploadView,
        SupabaseDocumentListView,
        SupabaseDocumentDetailView,
        SupabaseExtractTextView,
    )
    use_supabase = settings.SUPABASE_URL and settings.SUPABASE_KEY and \
                  getattr(settings, 'USE_SUPABASE_STORAGE', False)
else:
    use_supabase = False

app_name = 'documents'

# Use the appropriate views based on configuration
if use_supabase:
    # Supabase storage views
    urlpatterns = [
        path('', SupabaseDocumentListView.as_view(), name='document_list'),
        path('<int:document_id>/', SupabaseDocumentDetailView.as_view(), name='document_detail'),
        path('upload/', SupabaseDocumentUploadView.as_view(), name='document_upload'),
        path('extract-text/', SupabaseExtractTextView.as_view(), name='extract_text'),
    ]
else:
    # Default Django storage views
    urlpatterns = [
        path('', DocumentListCreateView.as_view(), name='document_list_create'),
        path('<int:pk>/', DocumentDetailView.as_view(), name='document_detail'),
        path('upload/', DocumentUploadView.as_view(), name='document_upload'),
        path('extract-text/', ExtractTextView.as_view(), name='extract_text'),
    ]
