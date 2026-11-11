from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = 'Give an existing account (e.g. one created via Google) access to the admin dashboard.'

    def add_arguments(self, parser):
        parser.add_argument('email')
        parser.add_argument('--superuser', action='store_true', help='Also grant superuser (full Django /admin/ access).')
        parser.add_argument('--revoke', action='store_true', help='Remove admin access instead.')

    def handle(self, email, superuser=False, revoke=False, **opts):
        user = User.objects.filter(email__iexact=email.strip()).first()
        if user is None:
            raise CommandError(f'No user with email {email}. Sign up on the site first.')
        user.is_staff = not revoke
        if superuser or revoke:
            user.is_superuser = superuser and not revoke
        user.save(update_fields=['is_staff', 'is_superuser'])
        state = 'revoked from' if revoke else 'granted to'
        self.stdout.write(self.style.SUCCESS(f'Admin access {state} {user.email} (superuser={user.is_superuser}).'))
