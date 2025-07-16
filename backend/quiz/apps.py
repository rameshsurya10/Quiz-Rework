from django.apps import AppConfig

class QuizConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quiz'

    # def ready(self):
    #     # ✅ Move import here to delay until apps are ready
    #     from quiz import publish_schedulerjob
    #     publish_schedulerjob.start()
