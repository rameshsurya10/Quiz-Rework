from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
import logging

from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer, ExtractedTextSerializer
from accounts.permissions import IsOwnerOrAdminOrReadOnly, IsTeacherOrAdmin
from .utils import extract_text_from_pdf

logger = logging.getLogger(__name__)

class DocumentListCreateView(generics.ListCreateAPIView):
    """API view to list and create documents"""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get_queryset(self):
        """Only return documents owned by the user or all documents for admins"""
        user = self.request.user
        if user.is_admin:
            return Document.objects.all()
        return Document.objects.filter(user=user)
    
    def perform_create(self, serializer):
        """Save the document with the current user as owner"""
        try:
            document = serializer.save(user=self.request.user)
            
            # Get file size and basic metadata
            if document.file:
                document.file_size = document.file.size
                # Determine file type from content type
                if hasattr(document.file, 'content_type'):
                    document.file_type = document.file.content_type
                document.save()
                
                # Process the document if requested
                logger.info(f"Processing document: {document.title}")
                success = extract_text_from_pdf(document)
                if not success:
                    logger.warning(f"Text extraction failed for document: {document.title}")
            else:
                logger.warning(f"No file attached to document: {document.title}")
                
        except Exception as e:
            logger.error(f"Error creating document: {str(e)}")
            raise


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API view to retrieve, update, or delete a document"""
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    lookup_field = 'pk'
    
    def get_queryset(self):
        """Only return documents owned by the user or all documents for admins"""
        user = self.request.user
        if user.is_admin:
            return Document.objects.all()
        return Document.objects.filter(user=user)


class DocumentUploadView(APIView):
    """API view for uploading and optionally processing documents"""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Create a new document
                file = serializer.validated_data['file']
                document = Document.objects.create(
                    title=serializer.validated_data['title'],
                    description=serializer.validated_data.get('description', ''),
                    file=file,
                    user=request.user,
                    file_size=file.size,
                    file_type=getattr(file, 'content_type', 'application/octet-stream')
                )
                
                # Process document if requested
                if serializer.validated_data.get('process_immediately', True):
                    logger.info(f"Processing uploaded document: {document.title}")
                    success = extract_text_from_pdf(document)
                    if not success:
                        logger.warning(f"Text extraction failed for uploaded document: {document.title}")
                
                return Response(
                    DocumentSerializer(
                        document,
                        context={'request': request}
                    ).data,
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                logger.error(f"Error uploading document: {str(e)}")
                return Response(
                    {'error': f'Failed to upload document: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExtractTextView(APIView):
    """API view for extracting text from a document"""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def post(self, request):
        serializer = ExtractedTextSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                document_id = serializer.validated_data['document_id']
                document = get_object_or_404(Document, pk=document_id)
                
                # Check permission
                self.check_object_permissions(request, document)
                
                # Extract text from the document
                logger.info(f"Extracting text from document: {document.title}")
                success = extract_text_from_pdf(document)
                
                if success:
                    return Response(
                        {
                            'document_id': document.id,
                            'extracted_text': document.extracted_text,
                            'message': 'Text extracted successfully',
                            'is_processed': document.is_processed
                        },
                        status=status.HTTP_200_OK
                    )
                else:
                    return Response(
                        {
                            'error': 'Failed to extract text from the document',
                            'document_id': document.id,
                            'extracted_text': document.extracted_text  # May contain error message
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                    
            except Exception as e:
                logger.error(f"Error in ExtractTextView: {str(e)}")
                return Response(
                    {'error': f'Internal server error: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
