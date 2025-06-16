from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('quiz', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='quiz',
            name='question_type',
            field=models.CharField(
                default='multiple_choice',
                help_text='Type of questions in the quiz (e.g., multiple_choice, fill_in_blank)',
                max_length=50
            ),
        ),
    ] 