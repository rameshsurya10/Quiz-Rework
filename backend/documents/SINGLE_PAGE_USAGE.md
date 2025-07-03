# Single Page Question Generation

This document explains how to generate quiz questions from a specific page of a PDF document.

## Overview

The system now supports generating questions from specific pages of PDF documents. This is useful when you want to create focused quizzes based on particular sections or chapters of a document.

## Usage

### 1. API Endpoint Usage

When uploading a file to generate questions, you can specify a single page number in the `page_range` parameter:

```bash
# Upload file and generate questions from page 3 only
curl -X POST \
  http://your-api-url/api/quiz/{quiz_id}/upload-file/ \
  -H 'Authorization: Bearer your-token' \
  -F 'file=@document.pdf' \
  -F 'page_range=3'
```

### 2. Programming Usage

#### Using DocumentProcessingService directly:

```python
from documents.services import DocumentProcessingService

# Initialize the service
service = DocumentProcessingService()

# Generate questions from a single page (page 5)
result = service.process_single_document(
    uploaded_file=uploaded_file,
    quiz=quiz_instance,
    user=user_instance,
    page_range="5"  # Single page number as string
)

# Or use the dedicated single page method
result = service.generate_questions_from_single_page(
    uploaded_file=uploaded_file,
    quiz=quiz_instance,
    user=user_instance,
    page_number=5  # Can be int or string
)
```

#### Response format:

```python
{
    "success": True,
    "document_id": 123,
    "questions_generated": 10,
    "pages_processed": "5",
    "page_ranges_used": "[5]",
    "questions_with_page_attribution": 10,
    "single_page_mode": True,  # Only when using generate_questions_from_single_page
    "target_page": 5          # Only when using generate_questions_from_single_page
}
```

### 3. Supported Page Range Formats

The system supports various page range formats:

- **Single page**: `"3"` - Generate questions from page 3 only
- **Multiple pages**: `"1,3,5"` - Generate questions from pages 1, 3, and 5
- **Page ranges**: `"1-5"` - Generate questions from pages 1 through 5
- **Mixed**: `"1-3,7,10-12"` - Generate questions from pages 1-3, 7, and 10-12

## Features

### Page Validation

The system automatically validates that the requested pages exist in the PDF:

```python
# If you request page 10 but the PDF only has 5 pages, you'll get an error:
{
    "success": False,
    "error": "Invalid pages for document with 5 pages: 10"
}
```

### Question Attribution

Each generated question includes information about which page it came from:

```python
{
    "question": "What is the main concept discussed in this section?",
    "type": "mcq",
    "options": {"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"},
    "correct_answer": "A",
    "explanation": "According to the text content...",
    "source_page": "5"  # The page this question was generated from
}
```

### Content Verification

The system verifies that the requested pages actually contain extractable text:

- Checks for page markers in extracted content
- Validates that at least one requested page has readable content
- Provides detailed logging for debugging

## Error Handling

Common error scenarios and their responses:

1. **Invalid page number**:
   ```python
   {
       "success": False,
       "error": "Invalid pages for document with 10 pages: 15"
   }
   ```

2. **No text on requested page**:
   ```python
   {
       "success": False,
       "error": "No content found for requested pages: 5"
   }
   ```

3. **PDF processing error**:
   ```python
   {
       "success": False,
       "error": "Failed to extract text from file."
   }
   ```

## Best Practices

1. **Validate page numbers** before sending requests to avoid errors
2. **Check response success** before assuming questions were generated
3. **Use appropriate page ranges** - single pages for focused content, ranges for broader topics
4. **Monitor question attribution** to ensure questions come from the expected pages
5. **Handle errors gracefully** in your frontend/client code

## Logging

The system provides detailed logging for debugging:

```
INFO: Generating questions from single page 5
INFO: Parsed page ranges '5' into: [5]
INFO: Successfully found content for pages: [5]
INFO: Successfully generated 10 questions (10 with page attribution) from specified pages
```

## Frontend Integration Example

```javascript
// Frontend form submission
const formData = new FormData();
formData.append('file', selectedFile);
formData.append('page_range', '3'); // Single page

fetch(`/api/quiz/${quizId}/upload-file/`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    },
    body: formData
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        console.log(`Generated ${data.questions_generated} questions from page ${data.pages_processed}`);
    } else {
        console.error('Error:', data.error);
    }
});
```

This system ensures that when you specify a page number, questions are generated exclusively from that page's content, making your quizzes more targeted and relevant to specific sections of your documents. 