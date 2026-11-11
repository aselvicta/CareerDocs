from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'
    verbose_name = 'Analytics & activity'

    def ready(self):
        from django.contrib.auth.signals import user_logged_in

        from .admins import on_user_logged_in

        user_logged_in.connect(on_user_logged_in, dispatch_uid='analytics_admin_emails')
