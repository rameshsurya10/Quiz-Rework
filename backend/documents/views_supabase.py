# """
# Alternative views for document handling using Supabase.
# These views can be used instead of the regular views when using Supabase for storage.
# """

# from rest_framework import status, permissions
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.parsers import MultiPartParser, FormParser
# from django.conf import settings
# from django.utils.decorators import method_decorator
# from django.views.decorators.csrf import csrf_exempt

# from accounts.permissions import IsTeacherOrAdmin
# from .supabase_utils import SupabaseDocumentHandler


# class SupabaseDocumentUploadView(APIView):
#     """API view for uploading documents to Supabase Storage"""
#     permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
#     parser_classes = [MultiPartParser, FormParser]
    
#     @method_decorator(csrf_exempt)
#     def post(self, request):
#         # Check if file is present
#         if 'file' not in request.FILES:
#             return Response(
#                 {'error': 'No file provided'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         file = request.FILES['file']
        
#         # Validate file size
#         if file.size > settings.MAX_UPLOAD_SIZE:
#             return Response(
#                 {'error': f'File size exceeds the limit of {settings.MAX_UPLOAD_SIZE} bytes'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         # Validate file type
#         if file.content_type not in settings.ALLOWED_DOCUMENT_TYPES:
#             return Response(
#                 {'error': f'File type not supported. Allowed types: {settings.ALLOWED_DOCUMENT_TYPES}'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         # Get form data
#         title = request.data.get('title', '')
#         description = request.data.get('description', '')
        
#         # Use Supabase document handler
#         handler = SupabaseDocumentHandler()
        
#         try:
#             # Upload document
#             document = handler.upload_document(
#                 file=file,
#                 filename=file.name,
#                 user_id=request.user.id,
#                 title=title,
#                 description=description
#             )
            
#             return Response(document, status=status.HTTP_201_CREATED)
        
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


# class SupabaseDocumentListView(APIView):
#     """API view for listing documents from Supabase"""
#     permission_classes = [permissions.IsAuthenticated]
    
#     def get(self, request):
#         handler = SupabaseDocumentHandler()
        
#         # Get query parameters
#         limit = int(request.query_params.get('limit', 50))
        
#         # Check if user is admin (can see all documents)
#         if request.user.is_admin:
#             documents = handler.list_documents(limit=limit)
#         else:
#             # Regular users can only see their own documents
#             documents = handler.list_documents(user_id=request.user.id, limit=limit)
        
#         return Response(documents)


# class SupabaseDocumentDetailView(APIView):
#     """API view for retrieving and deleting documents from Supabase"""
#     permission_classes = [permissions.IsAuthenticated]
    
#     def get(self, request, document_id):
#         handler = SupabaseDocumentHandler()
#         document = handler.get_document(document_id)
        
#         if not document:
#             return Response(
#                 {'error': 'Document not found'},
#                 status=status.HTTP_404_NOT_FOUND
#             )
        
#         # Check permissions
#         if not request.user.is_admin and document.get('user_id') != request.user.id:
#             return Response(
#                 {'error': 'You do not have permission to access this document'},
#                 status=status.HTTP_403_FORBIDDEN
#             )
        
#         return Response(document)
    
#     def delete(self, request, document_id):
#         handler = SupabaseDocumentHandler()
#         document = handler.get_document(document_id)
        
#         if not document:
#             return Response(
#                 {'error': 'Document not found'},
#                 status=status.HTTP_404_NOT_FOUND
#             )
        
#         # Check permissions
#         if not request.user.is_admin and document.get('user_id') != request.user.id:
#             return Response(
#                 {'error': 'You do not have permission to delete this document'},
#                 status=status.HTTP_403_FORBIDDEN
#             )
        
#         # Delete document
#         success = handler.delete_document(document_id)
        
#         if success:
#             return Response(status=status.HTTP_204_NO_CONTENT)
#         else:
#             return Response(
#                 {'error': 'Failed to delete document'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


# class SupabaseExtractTextView(APIView):
#     """API view for extracting text from documents in Supabase Storage"""
#     permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
#     def post(self, request):
#         document_id = request.data.get('document_id')
        
#         if not document_id:
#             return Response(
#                 {'error': 'Document ID is required'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
        
#         handler = SupabaseDocumentHandler()
#         document = handler.get_document(document_id)
        
#         if not document:
#             return Response(
#                 {'error': 'Document not found'},
#                 status=status.HTTP_404_NOT_FOUND
#             )
        
#         # Check permissions
#         if not request.user.is_admin and document.get('user_id') != request.user.id:
#             return Response(
#                 {'error': 'You do not have permission to access this document'},
#                 status=status.HTTP_403_FORBIDDEN
#             )
        
#         # Extract text
#         filename = document.get('filename')
#         extracted_text = handler.extract_full_text(document_id, filename)
        
#         if extracted_text:
#             return Response({
#                 'document_id': document_id,
#                 'extracted_text': extracted_text,
#                 'is_processed': True
#             })
#         else:
#             return Response(
#                 {'error': 'Failed to extract text from document'},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )
