from django.db import migrations, models
import uuid

class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='department',
            table='department',
        ),
        migrations.AddField(
            model_name='department',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
       
        migrations.RemoveField(
            model_name='department',
            name='id',
        ),
        migrations.AddField(
            model_name='department',
            name='department_id',
            field=models.AutoField(primary_key=True, serialize=False),
            preserve_default=False,
        ),
        
        migrations.RemoveField(
            model_name='department',
            name='code',
        ),
        
        migrations.AddField(
            model_name='department',
            name='code',
            field=models.CharField(max_length=20, unique=True, blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name='department',
            name='description',
        ),
        migrations.RemoveField(
            model_name='department',
            name='student_count',
        ),
        migrations.RemoveField(
            model_name='department',
            name='teacher_count',
        ),
        migrations.RemoveField(
            model_name='department',
            name='document_count',
        ),
        migrations.RemoveField(
            model_name='department',
            name='quiz_count',
        ),
        migrations.RemoveField(
            model_name='department',
            name='icon',
        ),
        migrations.RemoveField(
            model_name='department',
            name='color',
        ),
    ] 