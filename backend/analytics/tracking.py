"""Recording activity events. Tracking must never break a request, so every write is guarded."""
import logging
import re
from urllib.parse import urlparse

from rest_framework.authtoken.models import Token

from .models import ActivityEvent

log = logging.getLogger(__name__)

_ID_SEGMENT = re.compile(r'^(\d+|[A-Za-z0-9_\-]{16,})$')


def normalize_path(path):
    """/cv/42/edit -> /cv/:id/edit ; /view/cv/<long token> -> /view/cv/:id"""
    path = (path or '').split('?')[0].split('#')[0][:300] or '/'
    parts = [':id' if _ID_SEGMENT.match(p) else p for p in path.split('/')]
    return '/'.join(parts) or '/'


def client_ip(request):
    fwd = request.META.get('HTTP_X_FORWARDED_FOR', '')
    ip = (fwd.split(',')[0] if fwd else request.META.get('REMOTE_ADDR', '')).strip()
    return ip or None


def referrer_host(ref):
    try:
        return (urlparse(ref).hostname or '')[:200] if ref else ''
    except ValueError:
        return ''


def user_from_token_header(request):
    """Token users are only known to DRF views; resolve them for plain Django views too."""
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth.startswith('Token '):
        return None
    tok = Token.objects.select_related('user').filter(key=auth[6:].strip()).first()
    return tok.user if tok else None


def record(request, event, user=None, **fields):
    try:
        if user is None:
            u = getattr(request, 'user', None)
            user = u if u is not None and u.is_authenticated else None
        ActivityEvent.objects.create(
            user=user,
            event=event[:64],
            ip=client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
            **fields,
        )
    except Exception:  # noqa: BLE001 - analytics must never break the site
        log.exception('Failed to record activity event %s', event)
