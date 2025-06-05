from django.core.management.base import BaseCommand
from django.db import connections
from django.db.migrations.recorder import MigrationRecorder


class Command(BaseCommand):
    help = 'Mark all migrations as applied without running them'

    def add_arguments(self, parser):
        parser.add_argument(
            '--app',
            help='Specify a specific app to mark migrations for (default: all apps)',
        )
        parser.add_argument(
            '--fake-initial',
            action='store_true',
            help='Only mark initial migrations as applied',
        )

    def handle(self, *args, **options):
        connection = connections['default']
        recorder = MigrationRecorder(connection)
        
        # Create the django_migrations table if it doesn't exist
        if not recorder.has_table():
            self.stdout.write(self.style.MIGRATE_HEADING("Creating migrations table..."))
            recorder.ensure_schema()
        
        # Get applied migrations
        applied = set(tuple(x) for x in recorder.migration_qs.values_list('app', 'name'))
        
        # Get all migration files from disk
        from django.db.migrations.loader import MigrationLoader
        loader = MigrationLoader(connection, ignore_no_migrations=True)
        
        # Filter by app if specified
        app = options.get('app')
        disk_migrations = loader.disk_migrations
        
        if app:
            disk_migrations = {k: v for k, v in disk_migrations.items() if k[0] == app}
        
        # Track which migrations to apply
        to_apply = []
        
        for migration_key, migration in disk_migrations.items():
            if migration_key not in applied:
                app_name, migration_name = migration_key
                
                # If --fake-initial is passed, only mark initial migrations
                if options['fake_initial'] and not migration_name.startswith('0001_'):
                    continue
                
                to_apply.append((app_name, migration_name, migration))
        
        # Sort migrations by dependencies
        to_apply.sort(key=lambda m: len(m[2].dependencies))
        
        # Mark migrations as applied
        for app_name, migration_name, migration in to_apply:
            self.stdout.write(f"Marking {app_name}.{migration_name} as applied")
            recorder.record_applied(app_name, migration_name)
        
        if to_apply:
            self.stdout.write(self.style.SUCCESS(f"Successfully marked {len(to_apply)} migrations as applied"))
        else:
            self.stdout.write("No migrations to mark as applied")
