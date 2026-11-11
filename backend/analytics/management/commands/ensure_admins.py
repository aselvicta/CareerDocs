from django.conf import settings
from django.core.management.base import BaseCommand

from accounts.models import User
from analytics.admins import promote_if_listed


class Command(BaseCommand):
    help = 'Grant admin access to existing accounts listed in the ADMIN_EMAILS env var (runs on deploy).'

    def handle(self, **opts):
        if not settings.ADMIN_EMAILS:
            self.stdout.write('ADMIN_EMAILS not set; nothing to do.')
            return
        for email in sorted(settings.ADMIN_EMAILS):
            user = User.objects.filter(email__iexact=email).first()
            if user is None:
                self.stdout.write(f'{email}: no account yet (will be granted admin on first sign-in).')
            elif promote_if_listed(user):
                self.stdout.write(self.style.SUCCESS(f'{email}: admin access granted.'))
            else:
                self.stdout.write(f'{email}: already an admin.')
