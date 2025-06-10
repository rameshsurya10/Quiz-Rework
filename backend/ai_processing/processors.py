import logging
import json
from typing import List, Dict, Any, Optional
import nltk
from nltk.tokenize import sent_tokenize
import random

from django.conf import settings
from documents.models import Document
from documents.services import DocumentProcessingService

# Ensure NLTK resources are available
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

logger = logging.getLogger(__name__)


class TextPreprocessor:
    """Preprocessor for document text to prepare it for AI question generation"""
    
    @staticmethod
    def split_into_paragraphs(text: str) -> List[str]:
        """Split text into meaningful paragraphs"""
        # Split by double newlines or significant spaces
        paragraphs = text.split('\n\n')
        # Filter out very short paragraphs (likely headers, page numbers, etc.)
        return [p.strip() for p in paragraphs if len(p.strip()) > 100]
    
    @staticmethod
    def extract_key_sentences(text: str, num_sentences: int = 30) -> List[str]:
        """Extract key sentences from text that are good candidates for questions"""
        try:
            # Split into sentences
            all_sentences = sent_tokenize(text)
            
            # Filter sentences that are too short
            filtered_sentences = [s for s in all_sentences if len(s.split()) >= 10]
            
            # Look for sentences with potential information value
            good_candidates = []
            
            for sentence in filtered_sentences:
                # Indicators of informative content
                has_numbers = any(char.isdigit() for char in sentence)
                has_keywords = any(keyword in sentence.lower() for keyword in 
                                 ["important", "significant", "defined as", "refers to", 
                                  "known as", "example", "definition", "concept"])
                
                if has_numbers or has_keywords or len(sentence.split()) > 20:
                    good_candidates.append(sentence)
            
            # If we don't have enough good candidates, add more from the filtered sentences
            if len(good_candidates) < num_sentences:
                remaining_needed = num_sentences - len(good_candidates)
                remaining_sentences = [s for s in filtered_sentences if s not in good_candidates]
                additional_sentences = remaining_sentences[:remaining_needed]
                good_candidates.extend(additional_sentences)
            
            # Shuffle to get a good distribution
            random.shuffle(good_candidates)
            
            return good_candidates[:num_sentences]
            
        except Exception as e:
            logger.error(f"Error extracting key sentences: {str(e)}")
            # Return original sentences if processing fails
            return sent_tokenize(text)[:num_sentences]
    
    @staticmethod
    def prepare_document_for_questions(document_id: int, page_range: tuple = None) -> Dict[str, Any]:
        """
        Prepare a document's text for question generation
        
        Args:
            document_id: ID of the document to process
            
        Returns:
            Dictionary with document info and processed text
        """
        try:
            # Get the document
            document = Document.objects.get(pk=document_id)
            
            # If document hasn't been processed yet, or we need specific pages, extract the text
            if not document.is_processed or not document.extracted_text or page_range:
                success = DocumentProcessingService.extract_text_from_pdf(document, page_range)
                if not success:
                    return {
                        'success': False,
                        'error': 'Failed to extract text from document'
                    }
            
            # Get the extracted text
            text = document.extracted_text
            
            # Extract key sentences
            key_sentences = TextPreprocessor.extract_key_sentences(text, num_sentences=50)
            
            return {
                'success': True,
                'document': {
                    'id': document.id,
                    'title': document.title,
                    'page_count': document.page_count
                },
                'text': text,
                'key_sentences': key_sentences
            }
            
        except Document.DoesNotExist:
            return {
                'success': False,
                'error': 'Document not found'
            }
        except Exception as e:
            logger.error(f"Error preparing document for questions: {str(e)}")
            return {
                'success': False,
                'error': f'Error processing document: {str(e)}'
            }
