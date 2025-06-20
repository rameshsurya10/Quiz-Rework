# Generated by Django 5.2.1 on 2025-06-19 12:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0003_document_quiz'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='question_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='document',
            name='question_types',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='document',
            name='questions_generated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='document',
            name='generation_status',
            field=models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='pending', max_length=20),
        ),
        migrations.AddField(
            model_name='document',
            name='storage_type',
            field=models.CharField(choices=[('local', 'Local Storage'), ('supabase', 'Supabase Storage'), ('s3', 'AWS S3')], default='local', max_length=20),
        ),
        migrations.AddField(
            model_name='document',
            name='storage_path',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='document',
            name='storage_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='document',
            name='file_type',
            field=models.CharField(blank=True, max_length=50),
        ),
    ] 