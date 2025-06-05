from django.apps import AppConfig


class DepartmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'departments'
    
    def ready(self):
        """Import signals when app is ready"""
        # import departments.signals  # Uncomment if you add signals later
        pass
