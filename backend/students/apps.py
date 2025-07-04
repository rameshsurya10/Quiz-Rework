from django.apps import AppConfig


class StudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'students'

    def ready(self):
        # ✅ Move import here to delay until apps are ready
        from students import quizattempt_deleted_schedulerjob
        quizattempt_deleted_schedulerjob.start()
