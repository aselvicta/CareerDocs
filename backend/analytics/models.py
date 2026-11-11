from django.conf import settings
from django.db import models


class ActivityEvent(models.Model):
    """One tracked thing that happened on the site: a page view, login, export, AI request, ..."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_events',
    )
    event = models.CharField(max_length=64, db_index=True)  # e.g. page.view, auth.login, cv.export_pdf
    path = models.CharField(max_length=300, blank=True)  # normalized, ids replaced with :id
    method = models.CharField(max_length=8, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    object_id = models.CharField(max_length=64, blank=True)
    visitor_id = models.CharField(max_length=64, blank=True, db_index=True)  # anonymous browser id
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True)
    referrer = models.CharField(max_length=200, blank=True)  # host only
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        who = self.user.email if self.user_id and self.user else (self.visitor_id or 'anonymous')
        return f'{self.event} by {who} at {self.created_at:%Y-%m-%d %H:%M}'
