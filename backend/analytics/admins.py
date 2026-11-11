"""Grant admin access to the accounts listed in settings.ADMIN_EMAILS (env var)."""
import logging

from django.conf import settings

log = logging.getLogger(__name__)


def is_listed_admin(user):
    return bool(user and user.email and user.email.strip().lower() in settings.ADMIN_EMAILS)


def promote_if_listed(user):
    """Make the user staff + superuser if their email is in ADMIN_EMAILS. Returns True if changed."""
    if not is_listed_admin(user) or (user.is_staff and user.is_superuser):
        return False
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=['is_staff', 'is_superuser'])
    log.warning('Granted admin access to %s (listed in ADMIN_EMAILS)', user.email)
    return True


def on_user_logged_in(sender, request, user, **kwargs):
    try:
        promote_if_listed(user)
    except Exception:  # noqa: BLE001 - never block a login
        log.exception('ADMIN_EMAILS promotion failed for %s', getattr(user, 'email', '?'))
