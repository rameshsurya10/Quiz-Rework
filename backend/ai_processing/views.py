from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import QuestionBatch, Question
from .serializers import (
    QuestionBatchSerializer,
    QuestionBatchDetailSerializer,
    QuestionSerializer,
    GenerateQuestionsSerializer
)
from documents.models import Document
from accounts.permissions import IsOwnerOrAdminOrReadOnly, IsTeacherOrAdmin
from .services import AIQuestionGenerator


class QuestionBatchListView(generics.ListAPIView):
    """API view to list question batches"""
    serializer_class = QuestionBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return batches created by the user or all batches for admins"""
        user = self.request.user
        if user.is_admin:
            return QuestionBatch.objects.all()
        return QuestionBatch.objects.filter(user=user)


class QuestionBatchDetailView(generics.RetrieveDestroyAPIView):
    """API view to retrieve or delete a question batch"""
    serializer_class = QuestionBatchDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def get_queryset(self):
        """Return batches created by the user or all batches for admins"""
        user = self.request.user
        if user.is_admin:
            return QuestionBatch.objects.all()
        return QuestionBatch.objects.filter(user=user)


class QuestionDetailView(generics.RetrieveAPIView):
    """API view to retrieve a question"""
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return questions from batches created by the user or all for admins"""
        user = self.request.user
        if user.is_admin:
            return Question.objects.all()
        return Question.objects.filter(batch__user=user)


class GenerateQuestionsView(APIView):
    """API view to generate questions from a document"""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def post(self, request):
        serializer = GenerateQuestionsSerializer(data=request.data)
        
        if serializer.is_valid():
            # Get the document and extracted text
            document_id = serializer.validated_data['document_id']
            document = Document.objects.get(pk=document_id)
            
            # Generate questions using the AI service
            question_generator = AIQuestionGenerator()
            generated_questions = question_generator.generate_questions(
                text=document.extracted_text,
                num_questions=serializer.validated_data['num_questions'],
                question_types=serializer.validated_data['question_types'],
                difficulty=serializer.validated_data['difficulty']
            )
            
            if not generated_questions:
                return Response(
                    {'error': 'Failed to generate questions'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Create a batch with the generated questions
            batch = serializer.create_batch_with_questions(
                validated_data=serializer.validated_data,
                user=request.user,
                generated_questions=generated_questions
            )
            
            # Return the created batch with questions
            return Response(
                QuestionBatchDetailSerializer(batch).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
