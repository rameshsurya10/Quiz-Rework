import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import QuestionBatch, Question, Option
from .serializers import QuestionSerializer, QuestionBatchDetailSerializer
from quizzes.models import Quiz
from accounts.permissions import IsTeacherOrAdmin, IsOwnerOrAdminOrReadOnly

logger = logging.getLogger(__name__)


class QuizQuestionsView(APIView):
    """API view to get questions for a quiz, with filtering by page number"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, quiz_id):
        """Get questions for a quiz with optional page filtering"""
        try:
            # Get the quiz
            quiz = get_object_or_404(Quiz, pk=quiz_id)
            
            # Check if the user has permission to view this quiz
            if not (request.user.is_staff or request.user == quiz.creator):
                # For non-staff/non-creator, only allow viewing published quizzes
                if not quiz.is_published:
                    return Response(
                        {"error": "You don't have permission to view this quiz"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get questions from the question batch
            if not quiz.question_batch:
                return Response(
                    {"error": "This quiz has no questions"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            questions = Question.objects.filter(batch=quiz.question_batch)
            
            # Filter by page if requested
            page_filter = request.query_params.get('page')
            if page_filter:
                try:
                    # Handle single page filtering
                    if page_filter.isdigit():
                        page_num = int(page_filter)
                        questions = questions.filter(source_page__contains=str(page_num))
                    
                    # Handle page range filtering (e.g., "5-10")
                    elif '-' in page_filter:
                        start_page, end_page = map(int, page_filter.split('-'))
                        # Create a query to match any page in the range
                        page_query = Q()
                        for page_num in range(start_page, end_page + 1):
                            page_query |= Q(source_page__contains=str(page_num))
                        questions = questions.filter(page_query)
                except (ValueError, TypeError):
                    # Invalid page format, ignore the filter
                    pass
            
            # Get complexity filter
            complexity_filter = request.query_params.get('complexity')
            if complexity_filter:
                questions = questions.filter(difficulty=complexity_filter)
            
            # Serialize and return questions
            serializer = QuestionSerializer(questions, many=True)
            return Response({
                'quiz_id': quiz.id,
                'quiz_title': quiz.title,
                'question_count': questions.count(),
                'questions': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error retrieving quiz questions: {str(e)}")
            return Response(
                {"error": f"Failed to retrieve questions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizQuestionPageAnalyticsView(APIView):
    """API view to get analytics about questions by page source"""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get(self, request, quiz_id):
        """Get question distribution by source page"""
        try:
            # Get the quiz
            quiz = get_object_or_404(Quiz, pk=quiz_id)
            
            # Check permissions
            if not (request.user.is_staff or request.user == quiz.creator):
                return Response(
                    {"error": "You don't have permission to access this data"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get questions from the question batch
            if not quiz.question_batch:
                return Response(
                    {"error": "This quiz has no questions"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            questions = Question.objects.filter(batch=quiz.question_batch)
            
            # Analyze page distribution
            page_data = {}
            total_questions = 0
            
            for question in questions:
                source_page = question.source_page
                if not source_page:
                    # Handle questions without page data
                    if 'unknown' not in page_data:
                        page_data['unknown'] = 0
                    page_data['unknown'] += 1
                else:
                    if source_page not in page_data:
                        page_data[source_page] = 0
                    page_data[source_page] += 1
                total_questions += 1
            
            # Format the response
            page_distribution = [
                {'page': page, 'count': count, 'percentage': (count/total_questions)*100}
                for page, count in page_data.items()
            ]
            
            # Sort by page number if possible
            page_distribution.sort(
                key=lambda x: int(x['page']) if x['page'] != 'unknown' and str(x['page']).isdigit() else float('inf')
            )
            
            return Response({
                'quiz_id': quiz.id,
                'total_questions': total_questions,
                'page_distribution': page_distribution
            })
            
        except Exception as e:
            logger.error(f"Error retrieving page analytics: {str(e)}")
            return Response(
                {"error": f"Failed to retrieve analytics: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
