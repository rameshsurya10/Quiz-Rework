from django.core.management.base import BaseCommand
from django.urls import get_resolver

class Command(BaseCommand):
    help = 'List all URLs in the project with their patterns and names'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('--- Attempting to list URLs ---'))
        resolver = get_resolver()
        if resolver.url_patterns:
            for pattern in resolver.url_patterns:
                try:
                    # Attempt to print the pattern directly
                    self.stdout.write(str(pattern.pattern))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error processing a pattern: {e}'))
        else:
            self.stdout.write(self.style.WARNING('No URL patterns found by resolver.'))
        self.stdout.write(self.style.SUCCESS('--- Finished listing URLs ---'))
