# Webhook Integration for Document Analysis

This document describes how to use the webhook integration for document analysis in the Quiz application.

## Overview

The webhook integration allows external systems like n8n to trigger document analysis processes and receive structured JSON responses. This enables automation of document processing, question generation, and other analysis tasks.

## Available Endpoints

### Document Analysis Webhook

**URL**: `/api/documents/webhook/analyze/`

**Method**: `POST`

**Authentication**: Webhook key

**Request Body**:

```json
{
  "document_id": "uuid-of-document",
  "webhook_key": "your-webhook-secret-key",
  "analysis_type": "metadata_extraction",
  "user_email": "optional-user-email"
}
```

**Analysis Types**:

1. `metadata_extraction` - Extract metadata from the document
2. `code_analysis` - Analyze code in the document and generate a JSON structure
3. `question_generation` - Generate questions based on document content
4. `content_summary` - Generate a summary of the document content

**Additional Parameters for Question Generation**:

```json
{
  "question_count": 10,
  "question_type": "mixed",
  "save_to_database": true
}
```

**Response**:

```json
{
  "status": "success",
  "document_id": "uuid-of-document",
  "analysis_result": {
    "metadata": { ... },
    "generated_at": "2023-06-15T12:34:56.789Z"
  }
}
```

## Configuration

Set the webhook secret key in your environment variables:

```
WEBHOOK_SECRET_KEY=your-secure-random-key
```

Or update it in `settings.py`:

```python
WEBHOOK_SECRET_KEY = os.environ.get('WEBHOOK_SECRET_KEY', 'your-webhook-secret-key-here')
```

## Testing the Webhook

You can use the included test script to test the webhook:

```bash
python test_webhook.py --document-id your-document-id --analysis-type metadata_extraction
```

See `python test_webhook.py --help` for more options.

## Integration with n8n

See the [n8n workflow example](n8n_workflow_example.md) for detailed instructions on setting up an n8n workflow to use this webhook.

## Security Considerations

- Keep your webhook key secure and rotate it regularly
- Consider implementing IP whitelisting for additional security
- Monitor webhook usage for unusual patterns
- Use HTTPS for all webhook communications

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your webhook key
2. **404 Not Found**: Verify document ID and endpoint URL
3. **400 Bad Request**: Check request parameters
4. **500 Internal Server Error**: Check server logs for details

### Debugging

Enable debug logging in your Django settings:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'documents.views_webhook': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
``` 