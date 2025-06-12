from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('students', '0003_remove_student_department_ids_student_department_id_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            -- Rename the old created_by column if it exists
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='student' AND column_name='created_by') THEN
                    ALTER TABLE student RENAME COLUMN created_by TO created_by_old;
                END IF;
            END $$;
            
            -- Rename the old last_modified_by column if it exists
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='student' AND column_name='last_modified_by') THEN
                    ALTER TABLE student RENAME COLUMN last_modified_by TO last_modified_by_old;
                END IF;
            END $$;
            
            -- Add the new foreign key columns
            ALTER TABLE student 
            ADD COLUMN IF NOT EXISTS created_by_id INTEGER 
                REFERENCES auth_user(id) ON DELETE SET NULL;
                
            ALTER TABLE student 
            ADD COLUMN IF NOT EXISTS last_modified_by_id INTEGER 
                REFERENCES auth_user(id) ON DELETE SET NULL;
            
            -- Copy data from old columns to new columns if they exist
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='student' AND column_name='created_by_old') THEN
                    UPDATE student SET created_by_id = auth_user.id 
                    FROM auth_user 
                    WHERE student.created_by_old = auth_user.email;
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name='student' AND column_name='last_modified_by_old') THEN
                    UPDATE student SET last_modified_by_id = auth_user.id 
                    FROM auth_user 
                    WHERE student.last_modified_by_old = auth_user.email;
                END IF;
            END $$;
            
            -- Drop the old columns if they exist
            ALTER TABLE student 
            DROP COLUMN IF EXISTS created_by_old,
            DROP COLUMN IF EXISTS last_modified_by_old;
            """,
            reverse_sql="""
            -- This is a simplified reverse migration
            -- Note: The reverse migration might lose data as we can't perfectly reconstruct the old state
            ALTER TABLE student 
            DROP COLUMN IF EXISTS created_by_id,
            DROP COLUMN IF EXISTS last_modified_by_id;
            """
        ),
    ]
