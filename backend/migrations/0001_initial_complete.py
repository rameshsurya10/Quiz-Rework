# Generated manually for Supabase integration - Complete Quiz Application Schema
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Department model
        migrations.CreateModel(
            name='Department',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(max_length=20, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Department',
                'verbose_name_plural': 'Departments',
                'ordering': ['name'],
            },
        ),
        
        # User Profiles with Role-based access
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('admin', 'Admin'), ('teacher', 'Teacher'), ('student', 'Student')], default='student', max_length=20)),
                ('bio', models.TextField(blank=True, null=True)),
                ('profile_picture', models.FileField(blank=True, null=True, upload_to='profile_pictures/')),
                ('phone_number', models.CharField(blank=True, max_length=20, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='members', to='Department')),
            ],
            options={
                'verbose_name': 'User Profile',
                'verbose_name_plural': 'User Profiles',
            },
        ),
        
        # Teacher model - extends UserProfile
        migrations.CreateModel(
            name='Teacher',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('employee_id', models.CharField(max_length=20, unique=True)),
                ('specialization', models.CharField(blank=True, max_length=100, null=True)),
                ('join_date', models.DateField(blank=True, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='teacher_profile', to=settings.AUTH_USER_MODEL)),
                ('departments', models.ManyToManyField(related_name='teachers', to='Department')),
            ],
            options={
                'verbose_name': 'Teacher',
                'verbose_name_plural': 'Teachers',
            },
        ),
        
        # Student model - extends UserProfile
        migrations.CreateModel(
            name='Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('student_id', models.CharField(max_length=20, unique=True)),
                ('enrollment_date', models.DateField(blank=True, null=True)),
                ('graduation_year', models.IntegerField(blank=True, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='student_profile', to=settings.AUTH_USER_MODEL)),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='students', to='Department')),
            ],
            options={
                'verbose_name': 'Student',
                'verbose_name_plural': 'Students',
            },
        ),
        
        # Document management
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('file', models.FileField(upload_to='documents/')),
                ('file_size', models.IntegerField(default=0)),
                ('file_type', models.CharField(max_length=50)),
                ('page_count', models.IntegerField(default=0)),
                ('is_processed', models.BooleanField(default=False)),
                ('is_public', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to=settings.AUTH_USER_MODEL)),
                ('departments', models.ManyToManyField(blank=True, related_name='department_documents', to='Department')),
            ],
            options={
                'verbose_name': 'Document',
                'verbose_name_plural': 'Documents',
                'ordering': ['-created_at'],
            },
        ),
        
        # Document chunks for AI processing
        migrations.CreateModel(
            name='DocumentChunk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chunk_index', models.IntegerField()),
                ('text_content', models.TextField()),
                ('page_number', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chunks', to='Document')),
            ],
            options={
                'verbose_name': 'Document Chunk',
                'verbose_name_plural': 'Document Chunks',
                'ordering': ['document', 'chunk_index'],
                'unique_together': {('document', 'chunk_index')},
            },
        ),
        
        # Question batches
        migrations.CreateModel(
            name='QuestionBatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('difficulty_level', models.CharField(choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')], default='medium', max_length=20)),
                ('question_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='question_batches', to=settings.AUTH_USER_MODEL)),
                ('document', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='question_batches', to='Document')),
                ('departments', models.ManyToManyField(blank=True, related_name='department_question_batches', to='Department')),
            ],
            options={
                'verbose_name': 'Question Batch',
                'verbose_name_plural': 'Question Batches',
                'ordering': ['-created_at'],
            },
        ),
        
        # Questions
        migrations.CreateModel(
            name='Question',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_text', models.TextField()),
                ('question_type', models.CharField(choices=[('multiple_choice', 'Multiple Choice'), ('true_false', 'True/False'), ('short_answer', 'Short Answer')], default='multiple_choice', max_length=20)),
                ('difficulty_level', models.CharField(choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')], default='medium', max_length=20)),
                ('explanation', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='questions', to='QuestionBatch')),
                ('document_chunk', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='questions', to='DocumentChunk')),
            ],
            options={
                'verbose_name': 'Question',
                'verbose_name_plural': 'Questions',
                'ordering': ['batch', 'id'],
            },
        ),
        
        # Options for multiple-choice questions
        migrations.CreateModel(
            name='Option',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('option_text', models.TextField()),
                ('is_correct', models.BooleanField(default=False)),
                ('explanation', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='options', to='Question')),
            ],
            options={
                'verbose_name': 'Option',
                'verbose_name_plural': 'Options',
                'ordering': ['question', 'id'],
            },
        ),
        
        # Answer model for questions
        migrations.CreateModel(
            name='Answer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('answer_text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('question', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='answer', to='Question')),
            ],
            options={
                'verbose_name': 'Answer',
                'verbose_name_plural': 'Answers',
            },
        ),
        
        # Quiz model
        migrations.CreateModel(
            name='Quiz',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('time_limit_minutes', models.IntegerField(default=30)),
                ('passing_score', models.FloatField(default=70.0)),
                ('is_active', models.BooleanField(default=True)),
                ('is_public', models.BooleanField(default=False)),
                ('shuffle_questions', models.BooleanField(default=True)),
                ('shuffle_options', models.BooleanField(default=True)),
                ('show_result_immediately', models.BooleanField(default=True)),
                ('allow_multiple_attempts', models.BooleanField(default=True)),
                ('max_attempts', models.IntegerField(default=3)),
                ('start_date', models.DateTimeField(blank=True, null=True)),
                ('end_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_quizzes', to=settings.AUTH_USER_MODEL)),
                ('question_batch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quizzes', to='QuestionBatch')),
                ('departments', models.ManyToManyField(blank=True, related_name='department_quizzes', to='Department')),
            ],
            options={
                'verbose_name': 'Quiz',
                'verbose_name_plural': 'Quizzes',
                'ordering': ['-created_at'],
            },
        ),
        
        # Questions in a quiz
        migrations.CreateModel(
            name='QuizQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.IntegerField(default=0)),
                ('points', models.FloatField(default=1.0)),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='Question')),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_questions', to='Quiz')),
            ],
            options={
                'verbose_name': 'Quiz Question',
                'verbose_name_plural': 'Quiz Questions',
                'ordering': ['quiz', 'order'],
                'unique_together': {('quiz', 'question')},
            },
        ),
        
        # Quiz attempts by students
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('attempt_number', models.IntegerField(default=1)),
                ('start_time', models.DateTimeField(auto_now_add=True)),
                ('end_time', models.DateTimeField(blank=True, null=True)),
                ('is_completed', models.BooleanField(default=False)),
                ('score', models.FloatField(default=0.0)),
                ('passed', models.BooleanField(default=False)),
                ('total_time_seconds', models.IntegerField(default=0)),
                ('quiz', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attempts', to='Quiz')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to='Student')),
            ],
            options={
                'verbose_name': 'Quiz Attempt',
                'verbose_name_plural': 'Quiz Attempts',
                'ordering': ['-start_time'],
                'unique_together': {('quiz', 'student', 'attempt_number')},
            },
        ),
        
        # Student responses to quiz questions
        migrations.CreateModel(
            name='QuizQuestionResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('selected_options', models.JSONField(blank=True, null=True)),
                ('text_response', models.TextField(blank=True, null=True)),
                ('is_correct', models.BooleanField(default=False)),
                ('points_earned', models.FloatField(default=0.0)),
                ('time_taken_seconds', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('attempt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='QuizAttempt')),
                ('quiz_question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='QuizQuestion')),
            ],
            options={
                'verbose_name': 'Quiz Question Response',
                'verbose_name_plural': 'Quiz Question Responses',
                'ordering': ['attempt', 'quiz_question'],
                'unique_together': {('attempt', 'quiz_question')},
            },
        ),
        
        # Quiz results and analytics
        migrations.CreateModel(
            name='QuizResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score_percentage', models.FloatField(default=0.0)),
                ('time_spent_seconds', models.IntegerField(default=0)),
                ('passed', models.BooleanField(default=False)),
                ('correct_answers', models.IntegerField(default=0)),
                ('incorrect_answers', models.IntegerField(default=0)),
                ('unanswered', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('attempt', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='result', to='QuizAttempt')),
            ],
            options={
                'verbose_name': 'Quiz Result',
                'verbose_name_plural': 'Quiz Results',
                'ordering': ['-created_at'],
            },
        ),
        
        # Dashboard Analytics
        migrations.CreateModel(
            name='DashboardAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(auto_now_add=True)),
                ('total_quizzes_taken', models.IntegerField(default=0)),
                ('average_score', models.FloatField(default=0.0)),
                ('passing_rate', models.FloatField(default=0.0)),
                ('total_time_spent_mins', models.IntegerField(default=0)),
                ('department', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='analytics', to='Department')),
                ('student', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='analytics', to='Student')),
                ('teacher', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='class_analytics', to='Teacher')),
            ],
            options={
                'verbose_name': 'Dashboard Analytics',
                'verbose_name_plural': 'Dashboard Analytics',
                'ordering': ['-date'],
            },
        ),
        
        # Notification system
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(choices=[('quiz', 'Quiz'), ('document', 'Document'), ('system', 'System')], default='system', max_length=20)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
                ('quiz', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='Quiz')),
                ('document', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='Document')),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
