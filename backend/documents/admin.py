from django.contrib import admin

from .models import CV, Application, CVRevision, Letter, LetterRevision


@admin.register(CV)
class CVAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'template', 'is_shared', 'updated_at')
    list_filter = ('template', 'created_at')
    search_fields = ('title', 'full_name', 'user__email')
    list_select_related = ('user',)
    actions = ['revoke_share']

    @admin.display(boolean=True, description='Shared')
    def is_shared(self, obj):
        return bool(obj.share_token)

    @admin.action(description='Revoke public share link')
    def revoke_share(self, request, queryset):
        queryset.update(share_token=None)


@admin.register(Letter)
class LetterAdmin(admin.ModelAdmin):
    list_display = ('letter_type', 'title', 'user', 'recipient_name', 'company', 'updated_at')
    list_filter = ('letter_type', 'created_at')
    search_fields = ('title', 'recipient_name', 'company', 'user__email')
    list_select_related = ('user',)


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('job_title', 'company', 'user', 'status', 'deadline', 'updated_at')
    list_filter = ('status',)
    search_fields = ('job_title', 'company', 'user__email')
    list_select_related = ('user',)


@admin.register(CVRevision)
class CVRevisionAdmin(admin.ModelAdmin):
    list_display = ('cv', 'created_at')
    list_select_related = ('cv',)


@admin.register(LetterRevision)
class LetterRevisionAdmin(admin.ModelAdmin):
    list_display = ('letter', 'created_at')
    list_select_related = ('letter',)
