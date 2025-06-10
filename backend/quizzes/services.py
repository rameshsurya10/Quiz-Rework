from typing import Dict, List, Any, Optional, Tuple
import logging
import random
from django.db import transaction
from django.conf import settings

from ai_processing.services import AIQuestionGenerator
from ai_processing.models import QuestionBatch, Question, Option
from ai_processing.processors import TextPreprocessor
from documents.models import Document
from .models import Quiz

logger = logging.getLogger(__name__)


class QuizService:
    """Service for managing quiz creation and processing"""
    
    @staticmethod
    @transaction.atomic
    def create_quiz_with_generated_questions(
        document_id: int,
        user_id: int,
        quiz_data: Dict[str, Any],
        num_questions: int = 10,
        complexity: str = 'medium',
        page_range: Optional[Tuple[int, int]] = None,
        is_published: bool = False
    ) -> Optional[Quiz]:
        """
        Creates a quiz with AI-generated questions from a document
        
        Args:
            document_id: ID of the document to generate questions from
            user_id: ID of the user creating the quiz
            quiz_data: Dictionary containing quiz details (title, description, etc.)
            num_questions: Number of questions to generate
            difficulty: Difficulty level (easy, medium, hard)
            
        Returns:
            Created Quiz object or None if an error occurs
        """
        try:
            # 1. Get document with specified page range if provided
            document = Document.objects.get(pk=document_id)
            
            # Process document with page range if specified
            processed_doc_data = TextPreprocessor.prepare_document_for_questions(
                document_id=document_id,
                page_range=page_range
            )
            
            if not processed_doc_data.get('success'):
                logger.error(f"Error processing document: {processed_doc_data.get('error')}")
                return None
            
            # 2. Create question batch with proper complexity
            batch = QuestionBatch.objects.create(
                document=document,
                user_id=user_id,
                name=f"Batch for {quiz_data.get('title', 'Untitled Quiz')}",
                description=f"Questions for {quiz_data.get('title', 'Untitled Quiz')}",
                difficulty=complexity,  # Use new complexity parameter
                page_range=f"{page_range[0]}-{page_range[1]}" if page_range else None
            )
            
            # 3. Generate questions using AI with page-specific text if available
            generator = AIQuestionGenerator()
            text_to_use = processed_doc_data.get('text', document.extracted_text)
            
            question_data = generator.generate_questions(
                text=text_to_use,
                num_questions=num_questions,
                question_types=['multiple_choice'],  # Default to multiple choice
                difficulty=complexity  # Use new complexity parameter
            )
            
            # 4. Save generated questions
            for q_data in question_data:
                question = Question.objects.create(
                    batch=batch,
                    question_text=q_data['question_text'],
                    question_type=q_data['question_type'],
                    explanation=q_data.get('explanation', ''),
                    difficulty=complexity,
                    source_page=q_data.get('source_page')
                )
                
                # Handle different question types
                if q_data['question_type'] == 'multiple_choice':
                    # Create options for multiple choice questions
                    for option_text in q_data['options']:
                        is_correct = option_text == q_data['correct_answer']
                        Option.objects.create(
                            question=question,
                            option_text=option_text,
                            is_correct=is_correct
                        )
                elif q_data['question_type'] in ['true_false', 'short_answer']:
                    # For true/false and short answer questions
                    Option.objects.create(
                        question=question,
                        option_text=str(q_data['correct_answer']),
                        is_correct=True
                    )
            
            # 5. Create quiz with generated questions
            quiz = Quiz.objects.create(
                title=quiz_data.get('title', 'Untitled Quiz'),
                description=quiz_data.get('description', ''),
                question_batch=batch,
                creator_id=user_id,
                time_limit_minutes=quiz_data.get('time_limit_minutes', 30),
                passing_score=quiz_data.get('passing_score', 70),
                max_attempts=quiz_data.get('max_attempts', 3),
                shuffle_questions=quiz_data.get('shuffle_questions', True),
                show_answers=quiz_data.get('show_answers', True),
                start_date=quiz_data.get('start_date'),
                end_date=quiz_data.get('end_date'),
                is_published=is_published,
                status='published' if is_published else 'draft'
            )
            
            # 6. Add departments if specified
            if 'departments' in quiz_data and quiz_data['departments']:
                quiz.departments.set(quiz_data['departments'])
            
            return quiz
            
        except Exception as e:
            logger.error(f"Error creating quiz with generated questions: {str(e)}")
            # Re-raise to trigger transaction rollback
            raise
