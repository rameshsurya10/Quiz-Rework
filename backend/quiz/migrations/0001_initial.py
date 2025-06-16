from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('departments', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Quiz',
            fields=[
                ('quiz_id', models.AutoField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, null=True)),
                ('no_of_questions', models.IntegerField(default=10)),
                ('quiz_type', models.CharField(default='easy', max_length=50)),
                ('question_type', models.CharField(default='multiple_choice', help_text='Type of questions in the quiz (e.g., multiple_choice, fill_in_blank)', max_length=50)),
                ('uploadedfiles', models.JSONField(blank=True, default=list, help_text='List of uploaded files with their metadata', null=True)),
                ('pages', models.JSONField(blank=True, default=list, help_text='List of page ranges to generate questions from', null=True)),
                ('quiz_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('is_published', models.BooleanField(default=False)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('creator', models.CharField(blank=True, help_text='Name of the user who created the quiz', max_length=255, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.CharField(blank=True, help_text='Email of the user who created the quiz', max_length=255, null=True)),
                ('last_modified_at', models.DateTimeField(auto_now=True)),
                ('last_modified_by', models.CharField(blank=True, help_text='Email of the user who last modified the quiz', max_length=255, null=True)),
                ('time_limit_minutes', models.IntegerField(blank=True, null=True)),
                ('passing_score', models.IntegerField(blank=True, null=True)),
                ('department', models.ForeignKey(db_column='department_id', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='department_quizzes', to='departments.department')),
            ],
            options={
                'verbose_name_plural': 'Quizzes',
                'ordering': ['quiz_date'],
                'db_table': 'quizzes',
            },
        ),
    ] 