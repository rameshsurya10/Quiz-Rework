"""
Example script demonstrating single page question generation.
This is for testing and demonstration purposes only.
"""

import os
import sys
import django
from django.core.files.uploadedfile import SimpleUploadedFile

# Add the parent directory to the path so we can import Django models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.services import DocumentProcessingService
from quiz.models import Quiz
from accounts.models import User
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_single_page_question_generation():
    """
    Example function showing how to generate questions from a single page.
    
    NOTE: This is for demonstration purposes. In real usage, you would:
    1. Receive the file through an API endpoint
    2. Have valid quiz and user instances
    3. Handle errors appropriately
    """
    
    # Example: Generate questions from page 3 of a PDF
    try:
        # You would get these from your API request/database
        # quiz = Quiz.objects.get(pk=some_quiz_id)
        # user = User.objects.get(pk=some_user_id)
        # uploaded_file = request.FILES['file']
        
        # For demonstration, we'll show the method call structure
        service = DocumentProcessingService()
        
        # Method 1: Using process_single_document with page range
        print("\n=== Method 1: Using process_single_document ===")
        print("Example call:")
        print("""
result = service.process_single_document(
    uploaded_file=uploaded_file,
    quiz=quiz,
    user=user,
    page_range="3"  # Single page number
)
        """)
        
        # Method 2: Using dedicated single page method
        print("\n=== Method 2: Using generate_questions_from_single_page ===")
        print("Example call:")
        print("""
result = service.generate_questions_from_single_page(
    uploaded_file=uploaded_file,
    quiz=quiz,
    user=user,
    page_number=3  # Can be int or string
)
        """)
        
        # Show expected response structure
        print("\n=== Expected Response Structure ===")
        example_response = {
            "success": True,
            "document_id": 123,
            "questions_generated": 10,
            "pages_processed": "3",
            "page_ranges_used": "[3]",
            "questions_with_page_attribution": 10
        }
        print(f"Success response: {example_response}")
        
        example_error = {
            "success": False,
            "error": "Invalid pages for document with 5 pages: 10"
        }
        print(f"Error response: {example_error}")
        
        print("\n=== API Usage Example ===")
        print("""
# In your API view:
class YourQuizFileUploadView(APIView):
    def post(self, request, quiz_id):
        uploaded_file = request.FILES.get('file')
        page_number = request.POST.get('page_range')  # e.g., "3"
        
        quiz = Quiz.objects.get(pk=quiz_id)
        
        service = DocumentProcessingService()
        result = service.process_single_document(
            uploaded_file=uploaded_file,
            quiz=quiz,
            user=request.user,
            page_range=page_number
        )
        
        if result.get('success'):
            return Response({
                "message": f"Generated {result['questions_generated']} questions from page {page_number}",
                "document_id": result['document_id']
            })
        else:
            return Response({"error": result.get('error')}, status=400)
        """)
        
        print("\n=== Frontend Usage Example ===")
        print("""
// JavaScript frontend code:
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('page_range', '3'); // Single page

fetch(`/api/quiz/${quizId}/upload-file/`, {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        alert(`Questions generated from page ${data.pages_processed}`);
    } else {
        alert(`Error: ${data.error}`);
    }
});
        """)
        
        print("\n=== Key Features ===")
        features = [
            "✓ Page validation - checks if page exists in PDF",
            "✓ Content verification - ensures page has extractable text",
            "✓ Question attribution - each question tagged with source page",
            "✓ Error handling - clear error messages for invalid pages",
            "✓ Flexible input - accepts page numbers as string or int",
            "✓ Detailed logging - for debugging and monitoring"
        ]
        
        for feature in features:
            print(f"  {feature}")
            
        print("\n=== Supported Page Range Formats ===")
        formats = [
            "Single page: '3'",
            "Multiple pages: '1,3,5'", 
            "Page range: '1-5'",
            "Mixed: '1-3,7,10-12'"
        ]
        
        for fmt in formats:
            print(f"  • {fmt}")
            
    except Exception as e:
        logger.error(f"Error in example: {str(e)}")
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("=== Single Page Question Generation Example ===")
    test_single_page_question_generation() 