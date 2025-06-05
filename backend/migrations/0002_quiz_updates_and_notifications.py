# Generated manually for Quiz distribution and notifications
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('migrations', '0001_initial_complete'),
    ]

    operations = [
        # Add new fields to Quiz model
        migrations.AddField(
            model_name='Quiz',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # Create UUID id field as primary key for Quiz model
        migrations.AlterField(
            model_name='Quiz',
            name='id',
            field=models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False),
        ),
        
        # Notification model for email/SMS notifications
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(choices=[('quiz', 'Quiz Assignment'), ('feedback', 'Feedback'), ('announcement', 'Announcement'), ('reminder', 'Reminder')], default='announcement', max_length=20)),
                ('is_read', models.BooleanField(default=False)),
                ('email_sent', models.BooleanField(default=False)),
                ('email_sent_at', models.DateTimeField(blank=True, null=True)),
                ('sms_sent', models.BooleanField(default=False)),
                ('sms_sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                
                # Generic foreign key fields
                ('content_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype')),
                ('object_id', models.UUIDField(blank=True, null=True)),
                
                # User relationship
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'ordering': ['-created_at'],
            },
        ),
        
        # Update Department model with cached counts
        migrations.AddField(
            model_name='Department',
            name='student_count',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='Department',
            name='teacher_count',
            field=models.IntegerField(default=0),
        ),
    ],
