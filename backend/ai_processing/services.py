import logging
import json
from typing import List, Dict, Union, Any
import openai
from django.conf import settings
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


class AIQuestionGenerator:
    """Service for generating questions from text using AI"""
    
    def __init__(self, api_key=None):
        """Initialize the question generator with API key"""
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.client = openai.OpenAI(api_key=self.api_key)
    
    def _split_text(self, text: str, chunk_size: int = 4000) -> List[str]:
        """Split text into smaller chunks for processing"""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=200,
            length_function=len,
        )
        return text_splitter.split_text(text)
    
    def generate_questions(
        self, 
        text: str, 
        num_questions: int = 5, 
        question_types: List[str] = None,
        difficulty: str = 'medium',
    ) -> List[Dict[str, Any]]:
        """
        Generate questions from text using OpenAI's API
        
        Args:
            text: The text to generate questions from
            num_questions: Number of questions to generate
            question_types: Types of questions (multiple_choice, true_false, short_answer)
            difficulty: Difficulty level (easy, medium, hard)
        
        Returns:
            List of questions with answers and metadata
        """
        # Default question types
        if question_types is None:
            question_types = ['multiple_choice']
        
        # Split text into manageable chunks
        chunks = self._split_text(text)
        all_questions = []
        
        # Calculate questions per chunk
        total_chunks = len(chunks)
        questions_per_chunk = max(1, num_questions // total_chunks)
        remainder = num_questions % total_chunks
        
        for i, chunk in enumerate(chunks):
            # Adjust number of questions for last chunk
            chunk_questions = questions_per_chunk
            if i == total_chunks - 1:
                chunk_questions += remainder
            
            if chunk_questions <= 0:
                continue
            
            # Generate questions for this chunk
            chunk_result = self._generate_chunk_questions(
                chunk=chunk,
                num_questions=chunk_questions,
                question_types=question_types,
                difficulty=difficulty
            )
            
            all_questions.extend(chunk_result)
        
        return all_questions[:num_questions]  # Ensure we return exactly num_questions
    
    def _generate_chunk_questions(
        self, 
        chunk: str, 
        num_questions: int, 
        question_types: List[str],
        difficulty: str
    ) -> List[Dict[str, Any]]:
        """Generate questions for a single text chunk"""
        try:
            # Prepare the prompt for OpenAI
            prompt = self._prepare_question_prompt(
                chunk, num_questions, question_types, difficulty
            )
            
            # Call the OpenAI API
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert educator creating quiz questions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                top_p=1.0,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            # Parse the response
            result_text = response.choices[0].message.content
            
            # Try to parse the JSON response
            try:
                questions = json.loads(result_text)
                return questions
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract the JSON part
                try:
                    # Look for JSON array in the text
                    start_idx = result_text.find('[')
                    end_idx = result_text.rfind(']') + 1
                    
                    if start_idx >= 0 and end_idx > 0:
                        json_str = result_text[start_idx:end_idx]
                        return json.loads(json_str)
                    else:
                        logger.error(f"Failed to extract JSON from response: {result_text}")
                        return []
                except Exception as e:
                    logger.error(f"Error parsing AI response: {str(e)}")
                    return []
                
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return []
    
    def _prepare_question_prompt(
        self, 
        text: str, 
        num_questions: int, 
        question_types: List[str],
        difficulty: str
    ) -> str:
        """Prepare the prompt for the OpenAI API"""
        question_type_str = ", ".join(question_types)
        
        return f"""
        Generate {num_questions} {difficulty} difficulty quiz questions based on the following text.
        Include questions of these types: {question_type_str}.
        
        For each question:
        1. Create a clear question based on the content
        2. For multiple choice questions, provide 4 options with exactly one correct answer
        3. Clearly indicate the correct answer
        4. Add an explanation for why the answer is correct
        
        Return the questions as a JSON array where each question is an object with the following structure:
        - For multiple choice questions:
          {{
            "question_type": "multiple_choice",
            "question_text": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "The correct option (exact text)",
            "explanation": "Explanation of why this is the correct answer",
            "difficulty": "easy/medium/hard"
          }}
        
        - For true/false questions:
          {{
            "question_type": "true_false",
            "question_text": "Statement to evaluate as true or false",
            "correct_answer": true or false,
            "explanation": "Explanation of why this is correct",
            "difficulty": "easy/medium/hard"
          }}
        
        - For short answer questions:
          {{
            "question_type": "short_answer",
            "question_text": "Question requiring a short answer",
            "correct_answer": "The correct answer",
            "explanation": "Explanation of the answer",
            "difficulty": "easy/medium/hard"
          }}
        
        Text to generate questions from:
        {text}
        
        Return only the JSON array without any additional text or explanation.
        """
