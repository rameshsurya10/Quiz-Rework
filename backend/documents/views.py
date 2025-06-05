from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Document
from .serializers import DocumentSerializer, DocumentUploadSerializer, ExtractedTextSerializer
from accounts.permissions import IsOwnerOrAdminOrReadOnly, IsTeacherOrAdmin
from .utils import extract_text_from_pdf


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
        document = serializer.save(user=self.request.user)
        
        # Get file size
        document.file_size = document.file.size
        document.save()
        
        # Process the document if requested
        extract_text_from_pdf(document)


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
            # Create a new document
            document = Document.objects.create(
                title=serializer.validated_data['title'],
                description=serializer.validated_data.get('description', ''),
                file=serializer.validated_data['file'],
                user=request.user,
                file_size=serializer.validated_data['file'].size
            )
            
            # Process document if requested
            if serializer.validated_data.get('process_immediately', True):
                extract_text_from_pdf(document)
            
            return Response(
                DocumentSerializer(
                    document,
                    context={'request': request}
                ).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExtractTextView(APIView):
    """API view for extracting text from a document"""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def post(self, request):
        serializer = ExtractedTextSerializer(data=request.data)
        
        if serializer.is_valid():
            document_id = serializer.validated_data['document_id']
            document = get_object_or_404(Document, pk=document_id)
            
            # Check permission
            self.check_object_permissions(request, document)
            
            # Extract text from the document
            success = extract_text_from_pdf(document)
            
            if success:
                return Response(
                    {
                        'document_id': document.id,
                        'extracted_text': document.extracted_text,
                        'message': 'Text extracted successfully'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Failed to extract text from the document'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
