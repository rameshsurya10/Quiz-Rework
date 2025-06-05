from django.contrib import admin
from .models import QuestionBatch, Question, Option, Answer


class OptionInline(admin.TabularInline):
    model = Option
    extra = 4


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 1


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'question_text', 'question_type', 'difficulty', 'batch')
    list_filter = ('question_type', 'difficulty', 'batch')
    search_fields = ('question_text',)
    inlines = [OptionInline, AnswerInline]


@admin.register(QuestionBatch)
class QuestionBatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'document', 'user', 'difficulty', 'created_at')
    list_filter = ('difficulty', 'user', 'created_at')
    search_fields = ('name', 'description')
    date_hierarchy = 'created_at'
