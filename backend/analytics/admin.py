from django.contrib import admin

from .models import ActivityEvent


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'event', 'user', 'path', 'status_code', 'ip')
    list_filter = ('event', 'created_at')
    search_fields = ('event', 'path', 'user__email', 'ip', 'visitor_id')
    date_hierarchy = 'created_at'
    list_select_related = ('user',)
    readonly_fields = [f.name for f in ActivityEvent._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
