from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='Question',
            name='question_type',
            field=models.CharField(
                choices=[
                    ('multiple_choice', 'Multiple Choice'),
                    ('one_line', 'One Line'),
                    ('fill_in_blank', 'Fill in the Blank'),
                    ('true_false', 'True/False'),
                    ('mixed', 'Mixed')
                ],
                default='multiple_choice',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='Question',
            name='difficulty',
            field=models.CharField(
                choices=[
                    ('easy', 'Easy'),
                    ('medium', 'Medium'),
                    ('hard', 'Hard')
                ],
                default='easy',
                max_length=10
            ),
        ),
        migrations.AddField(
            model_name='Question',
            name='correct_answer',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='Question',
            name='explanation',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='Question',
            name='options',
            field=models.JSONField(
                blank=True,
                help_text='For multiple choice questions, stores options and correct answer',
                null=True
            ),
        ),
    ] 