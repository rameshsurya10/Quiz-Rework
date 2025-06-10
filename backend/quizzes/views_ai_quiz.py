import logging
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from documents.models import Document
from accounts.permissions import IsTeacherOrAdmin
from .models import Quiz
from .serializers import QuizSerializer, QuizDetailSerializer
from .services import QuizService
from ai_processing.models import QuestionBatch, Question

logger = logging.getLogger(__name__)


class AIGeneratedQuizCreateView(APIView):
    """
    API endpoint for creating a quiz with AI-generated questions from a document
    """
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def post(self, request):
        """Create a quiz with AI-generated questions from a document"""
        try:
            # Get required parameters
            document_id = request.data.get('document_id')
            if not document_id:
                return Response(
                    {"error": "document_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate document exists
            document = get_object_or_404(Document, pk=document_id)
            
            # Extract quiz parameters
            quiz_data = {
                'title': request.data.get('title', f"Quiz on {document.title}"),
                'description': request.data.get('description', ''),
                'time_limit_minutes': request.data.get('time_limit_minutes', 30),
                'passing_score': request.data.get('passing_score', 70),
                'max_attempts': request.data.get('max_attempts', 3),
                'shuffle_questions': request.data.get('shuffle_questions', True),
                'show_answers': request.data.get('show_answers', True),
                'start_date': request.data.get('start_date'),
                'end_date': request.data.get('end_date'),
                'departments': request.data.get('departments', [])
            }
            
            # Question generation parameters
            num_questions = int(request.data.get('num_questions', 10))
            complexity = request.data.get('complexity', 'medium')
            
            # Check if complexity is valid
            valid_complexities = [choice[0] for choice in QuestionBatch.DIFFICULTY_CHOICES]
            if complexity not in valid_complexities:
                complexity = 'medium'  # Default to medium if invalid
                
            # Page range parameters
            page_range = None
            if request.data.get('page_start') and request.data.get('page_end'):
                try:
                    page_start = int(request.data.get('page_start'))
                    page_end = int(request.data.get('page_end'))
                    # Ensure pages are in valid order
                    if page_start > 0 and page_end >= page_start:
                        page_range = (page_start, page_end)
                except (ValueError, TypeError):
                    pass  # Ignore invalid page ranges
            
            # Publishing status
            is_published = request.data.get('is_published', False)
            if isinstance(is_published, str):
                is_published = is_published.lower() == 'true'
            
            # Create quiz with generated questions
            quiz = QuizService.create_quiz_with_generated_questions(
                document_id=document_id,
                user_id=request.user.id,
                quiz_data=quiz_data,
                num_questions=num_questions,
                complexity=complexity,
                page_range=page_range,
                is_published=is_published
            )
            
            # Return the created quiz
            serializer = QuizDetailSerializer(quiz)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating AI-generated quiz: {str(e)}")
            return Response(
                {"error": f"Failed to create quiz: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIQuestionRegenerationView(APIView):
    """
    API endpoint for regenerating questions for an existing quiz using AI
    """
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def post(self, request, quiz_id):
        """Regenerate questions for an existing quiz"""
        try:
            # Get the quiz
            quiz = get_object_or_404(Quiz, pk=quiz_id)
            
            # Check permissions - only the creator or admin can regenerate questions
            if quiz.creator != request.user and not request.user.is_staff:
                return Response(
                    {"error": "You don't have permission to modify this quiz"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Extract parameters from request
            num_questions = int(request.data.get('num_questions', 10))
            complexity = request.data.get('complexity', quiz.question_batch.difficulty)
            
            # Check if complexity is valid
            valid_complexities = [choice[0] for choice in QuestionBatch.DIFFICULTY_CHOICES]
            if complexity not in valid_complexities:
                complexity = quiz.question_batch.difficulty  # Default to existing if invalid
                
            # Page range parameters
            page_range = None
            if request.data.get('page_start') and request.data.get('page_end'):
                try:
                    page_start = int(request.data.get('page_start'))
                    page_end = int(request.data.get('page_end'))
                    # Ensure pages are in valid order
                    if page_start > 0 and page_end >= page_start:
                        page_range = (page_start, page_end)
                except (ValueError, TypeError):
                    pass  # Ignore invalid page ranges
            
            # Publishing status - maintain existing status unless explicitly changed
            is_published = request.data.get('is_published', quiz.is_published)
            if isinstance(is_published, str):
                is_published = is_published.lower() == 'true'
            
            # Get the document from the existing question batch
            document = quiz.question_batch.document
            
            # Prepare quiz data from existing quiz
            quiz_data = {
                'title': quiz.title,
                'description': quiz.description,
                'time_limit_minutes': quiz.time_limit_minutes,
                'passing_score': quiz.passing_score,
                'max_attempts': quiz.max_attempts,
                'shuffle_questions': quiz.shuffle_questions,
                'show_answers': quiz.show_answers,
                'start_date': quiz.start_date,
                'end_date': quiz.end_date
            }
            
            # Create new batch and questions
            # Note: We'll create a new question batch rather than modifying the existing one
            # This preserves the history and any existing quiz attempts
            new_quiz = QuizService.create_quiz_with_generated_questions(
                document_id=document.id,
                user_id=request.user.id,
                quiz_data=quiz_data,
                num_questions=num_questions,
                complexity=complexity,
                page_range=page_range,
                is_published=is_published
            )
            
            # Update the original quiz with the new question batch
            quiz.question_batch = new_quiz.question_batch
            quiz.save()
            
            # Delete the temporary new quiz
            new_quiz.delete()
            
            # Return the updated quiz
            serializer = QuizDetailSerializer(quiz)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error regenerating questions for quiz {quiz_id}: {str(e)}")
            return Response(
                {"error": f"Failed to regenerate questions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
