import io
import zipfile
from openai import OpenAI
from django.conf import settings
from documents.models import DocumentVector
import tiktoken

def compress_file_if_needed(file_obj, max_size_mb=100):
    file_size_mb = file_obj.size / (1024 * 1024)
    if file_size_mb <= max_size_mb:
        return file_obj, file_obj.name  # No compression neede  d

    # Compress the file into a ZIP
    compressed_io = io.BytesIO()
    with zipfile.ZipFile(compressed_io, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(file_obj.name, file_obj.read())
    compressed_io.seek(0)

    # Check compressed size
    compressed_size_mb = len(compressed_io.getvalue()) / (1024 * 1024)
    if compressed_size_mb > max_size_mb:
        raise ValidationError(f"File is too large even after compression (>{max_size_mb} MB). Please upload a smaller file.")

    # Create a pseudo file-like object for Supabase upload
    compressed_file = compressed_io.read()
    compressed_name = f"{file_obj.name.rsplit('.', 1)[0]}.zip"
    return compressed_file, compressed_name

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def chunk_text(text: str, max_tokens: int = 500) -> list[str]:
    enc = tiktoken.encoding_for_model("gpt-4o")
    tokens = enc.encode(text)
    chunks = []
    i = 0
    while i < len(tokens):
        chunk = tokens[i:i + max_tokens]
        chunks.append(enc.decode(chunk))
        i += max_tokens
    return chunks

def embed_and_store(document, page_number, text: str):
    chunks = chunk_text(text)
    for idx, chunk in enumerate(chunks):
        try:
            response = client.embeddings.create(
                input=chunk,
                model="text-embedding-3-small"
            )
            embedding = response.data[0].embedding

            DocumentVector.objects.create(
                document=document,
                page_number=page_number,
                chunk_index=idx,
                content=chunk,
                embedding=embedding,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Embedding failed for page {page_number}, chunk {idx}: {str(e)}")

# class QuizJoinView(APIView):
#     def get(self, request, quiz_id):
#         quiz = get_object_or_404(Quiz, quiz_id=quiz_id)

#         now = timezone.now()
#         quiz_start = quiz.quiz_date
#         quiz_end = quiz_start + timezone.timedelta(minutes=quiz.time_limit_minutes)

#         if not (quiz_start <= now <= quiz_end):
#             return Response({
#                 "status": "error",
#                 "message": f"You can access this quiz only on {quiz.quiz_date.strftime('%Y-%m-%d %I:%M %p')}"
#             }, status=status.HTTP_403_FORBIDDEN)

#         # Proceed to show/join the quiz
#         return Response({
#             "status": "success",
#             "quiz_id": quiz.quiz_id,
#             "title": quiz.title,
#             "instructions": quiz.instructions,
#             # add more quiz details as needed
#         })