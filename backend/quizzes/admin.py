from django.contrib import admin
from .models import Quiz, QuizAttempt, QuizQuestionResponse


class QuizQuestionResponseInline(admin.TabularInline):
    model = QuizQuestionResponse
    extra = 0
    readonly_fields = ('question', 'selected_option', 'text_response', 'is_correct')
    can_delete = False


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'creator', 'is_published', 'time_limit_minutes', 'passing_score', 'created_at')
    list_filter = ('is_published', 'creator', 'created_at')
    search_fields = ('title', 'description')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'question_batch', 'creator', 'is_published')
        }),
        ('Settings', {
            'fields': ('time_limit_minutes', 'passing_score', 'max_attempts', 'shuffle_questions', 'show_answers')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'quiz', 'user', 'status', 'score', 'started_at', 'completed_at')
    list_filter = ('status', 'quiz', 'user', 'started_at')
    search_fields = ('quiz__title', 'user__email')
    date_hierarchy = 'started_at'
    readonly_fields = ('quiz', 'user', 'started_at', 'time_taken_seconds')
    inlines = [QuizQuestionResponseInline]
    
    def has_add_permission(self, request):
        return False
