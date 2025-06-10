from django.core.management.base import BaseCommand
from django.urls import get_resolver

class Command(BaseCommand):
    help = 'List all URLs in the project'

    def handle(self, *args, **options):
        resolver = get_resolver()
        self.list_urls(resolver)

    def list_urls(self, resolver, prefix=''):
        for url_pattern in resolver.url_patterns:
            if hasattr(url_pattern, 'url_patterns'):
                self.list_urls(url_pattern, prefix + str(url_pattern.pattern))
            else:
                self.stdout.write(f"{prefix}{url_pattern.pattern} -> {url_pattern.name or 'No name'}")
