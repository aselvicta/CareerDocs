from django.contrib import admin
from .models import CV, Letter


@admin.register(CV)
class CVAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'template', 'updated_at')
    list_filter = ('template',)
    search_fields = ('title', 'full_name', 'user__email')


@admin.register(Letter)
class LetterAdmin(admin.ModelAdmin):
    list_display = ('letter_type', 'title', 'user', 'recipient_name', 'company', 'updated_at')
    list_filter = ('letter_type',)
    search_fields = ('title', 'recipient_name', 'company', 'user__email')
