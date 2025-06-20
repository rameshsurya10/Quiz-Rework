from django.core.management.base import BaseCommand
from documents.models import Document

class Command(BaseCommand):
    help = 'Updates all documents to use vector database storage'

    def handle(self, *args, **options):
        # Get all documents
        docs = Document.objects.all()
        self.stdout.write(f"Found {docs.count()} documents")
        
        # Update storage type for all documents
        updated = 0
        for doc in docs:
            # Skip documents that are already using vector_db storage type
            if doc.storage_type == 'vector_db':
                continue
                
            # Update document
            doc.storage_type = 'vector_db'
            
            # Create a vector storage path if one doesn't exist
            if not doc.storage_path.startswith('vector_documents/'):
                doc.storage_path = f"vector_documents/{doc.file.name.split('/')[-1]}" if doc.file else f"vector_documents/doc-{doc.id}.pdf"
            
            # Save document
            doc.save(update_fields=['storage_type', 'storage_path'])
            updated += 1
            
        self.stdout.write(self.style.SUCCESS(f"Updated {updated} documents to use vector database storage")) 