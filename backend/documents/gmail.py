"""
Send email from the user's own Gmail (Phase 1: send only).

Flow
- POST /api/gmail/connect/ returns a Google consent URL. The OAuth `state` is a signed, short lived
  value that names the user, so the browser redirect does not need our API token.
- Google redirects to the same callback as Google sign-in (GOOGLE_OAUTH_REDIRECT_URI). The callback
  sees the `gm.` state prefix and hands over to `connect_callback` here, so no extra redirect URI
  has to be registered in Google Cloud.
- We keep only the refresh token, encrypted with Fernet. Each send swaps it for a short lived access
  token and posts the raw RFC 822 message to the Gmail API. The message then sits in the user's
  Gmail "Sent" folder and replies arrive in their inbox as normal.

Scope is `gmail.send` only (Google "sensitive", not "restricted"): we can send but cannot read mail.
"""
import base64
import hashlib
import secrets
import urllib.parse

import requests
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core import signing
from django.http import HttpResponseRedirect
from django.utils import timezone

from accounts.models import User

from .models import GmailAccount

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
GMAIL_SEND_URL = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media'
GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send'

STATE_PREFIX = 'gm.'
STATE_SALT = 'careerdocs.gmail.connect'
STATE_MAX_AGE = 15 * 60
MAX_ACCOUNTS = 5


class GmailError(Exception):
    """Shown to the user as is, so keep messages plain."""

    def __init__(self, message, code='gmail_error', reconnect=False):
        super().__init__(message)
        self.code = code
        self.reconnect = reconnect


# ---------- config + crypto ----------
def _client():
    cid = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or '').strip()
    secret = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '') or '').strip()
    return cid, secret


def is_configured():
    """True when Connect Gmail is switched on (GMAIL_SEND_ENABLED) and Google credentials exist."""
    cid, secret = _client()
    return bool(getattr(settings, 'GMAIL_SEND_ENABLED', False) and cid and secret)


def _fernet():
    # GMAIL_TOKEN_KEY (a Fernet key) lets you rotate SECRET_KEY without losing connections.
    key = (getattr(settings, 'GMAIL_TOKEN_KEY', '') or '').strip()
    if not key:
        digest = hashlib.sha256(f'{settings.SECRET_KEY}|gmail-refresh-token'.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token):
    return _fernet().encrypt(token.encode()).decode()


def decrypt_token(blob):
    try:
        return _fernet().decrypt(blob.encode()).decode()
    except (InvalidToken, ValueError):
        return None


# ---------- connect ----------
def _frontend(path):
    return f"{settings.FRONTEND_URL.rstrip('/')}{path}"


def _back_to_settings(error=None):
    if error:
        return HttpResponseRedirect(_frontend(f'/profile?gmail_error={urllib.parse.quote(error)}#email'))
    return HttpResponseRedirect(_frontend('/profile?gmail=connected#email'))


def is_connect_state(state):
    return bool(state) and state.startswith(STATE_PREFIX)


def build_connect_url(user):
    cid, _ = _client()
    if not cid or not is_configured():
        raise GmailError('Gmail sending is not set up on this server yet.', 'not_configured')
    state = STATE_PREFIX + signing.dumps({'u': user.pk, 'n': secrets.token_urlsafe(8)}, salt=STATE_SALT)
    params = {
        'client_id': cid,
        'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI,
        'response_type': 'code',
        'scope': f'openid email {GMAIL_SEND_SCOPE}',
        'state': state,
        'access_type': 'offline',       # we need a refresh token to send later
        'prompt': 'consent select_account',  # consent forces a fresh refresh token every time
        'include_granted_scopes': 'false',
    }
    if user.email:
        params['login_hint'] = user.email
    return GOOGLE_AUTH_URL + '?' + urllib.parse.urlencode(params)


def connect_callback(request):
    """Second half of the connect flow. Called from google_oauth.google_oauth_callback."""
    if request.GET.get('error'):
        return _back_to_settings('access_denied' if request.GET['error'] == 'access_denied' else 'google_error')
    try:
        data = signing.loads(request.GET.get('state', '')[len(STATE_PREFIX):], salt=STATE_SALT, max_age=STATE_MAX_AGE)
    except signing.BadSignature:  # includes SignatureExpired
        return _back_to_settings('invalid_state')
    user = User.objects.filter(pk=data.get('u'), is_active=True).first()
    code = request.GET.get('code')
    if not user or not code:
        return _back_to_settings('invalid_state')

    cid, secret = _client()
    if not is_configured():
        return _back_to_settings('not_configured')
    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data={
            'code': code, 'client_id': cid, 'client_secret': secret,
            'redirect_uri': settings.GOOGLE_OAUTH_REDIRECT_URI, 'grant_type': 'authorization_code',
        }, timeout=30)
    except requests.RequestException:
        return _back_to_settings('token_exchange')
    if resp.status_code != 200:
        return _back_to_settings('token_exchange')
    tokens = resp.json() or {}
    if GMAIL_SEND_SCOPE not in (tokens.get('scope') or '').split():
        # The consent screen lets people untick the Gmail box.
        return _back_to_settings('scope_denied')
    refresh = tokens.get('refresh_token')
    if not refresh:
        return _back_to_settings('no_refresh_token')
    try:
        info = requests.get(GOOGLE_USERINFO_URL, headers={'Authorization': f"Bearer {tokens.get('access_token')}"}, timeout=30)
    except requests.RequestException:
        return _back_to_settings('userinfo')
    email = ((info.json() or {}).get('email') or '').strip().lower() if info.status_code == 200 else ''
    if not email:
        return _back_to_settings('userinfo')

    existing = GmailAccount.objects.filter(user=user, email=email).first()
    if not existing and GmailAccount.objects.filter(user=user).count() >= MAX_ACCOUNTS:
        return _back_to_settings('too_many')
    acct = existing or GmailAccount(user=user, email=email)
    acct.refresh_token = encrypt_token(refresh)
    acct.needs_reconnect = False
    acct.save()
    return _back_to_settings()


def disconnect(acct):
    """Revoke at Google (best effort) and forget the token."""
    token = decrypt_token(acct.refresh_token)
    if token:
        try:
            requests.post(GOOGLE_REVOKE_URL, data={'token': token}, timeout=10)
        except requests.RequestException:
            pass
    acct.delete()


# ---------- send ----------
def _access_token(acct):
    refresh = decrypt_token(acct.refresh_token)
    cid, secret = _client()
    if not refresh or not cid:
        _mark_reconnect(acct)
        raise GmailError(f'Reconnect {acct.email} in Settings to keep sending from it.', 'reconnect', reconnect=True)
    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data={
            'client_id': cid, 'client_secret': secret, 'refresh_token': refresh, 'grant_type': 'refresh_token',
        }, timeout=30)
    except requests.RequestException as exc:
        raise GmailError('Could not reach Google. Please try again.', 'network') from exc
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or not body.get('access_token'):
        if body.get('error') in ('invalid_grant', 'unauthorized_client'):
            # Revoked in Google account settings, password change, or 6 months unused.
            _mark_reconnect(acct)
            raise GmailError(f'Google no longer allows CareerDocs to send from {acct.email}. Reconnect it in Settings.', 'reconnect', reconnect=True)
        raise GmailError('Google refused the request. Please try again.', 'token_refresh')
    return body['access_token']


def _mark_reconnect(acct):
    if not acct.needs_reconnect:
        acct.needs_reconnect = True
        acct.save(update_fields=['needs_reconnect'])


def send_message(acct, email_message):
    """Send a django EmailMessage through Gmail. Returns {'id', 'threadId'}."""
    token = _access_token(acct)
    raw = email_message.message().as_bytes()
    try:
        resp = requests.post(GMAIL_SEND_URL, data=raw, headers={
            'Authorization': f'Bearer {token}', 'Content-Type': 'message/rfc822',
        }, timeout=60)
    except requests.RequestException as exc:
        raise GmailError('Could not reach Gmail. Please try again.', 'network') from exc
    if resp.status_code == 401 or resp.status_code == 403:
        _mark_reconnect(acct)
        raise GmailError(f'Gmail refused to send from {acct.email}. Reconnect it in Settings.', 'reconnect', reconnect=True)
    if resp.status_code == 413:
        raise GmailError('Attachments are too large for Gmail (25 MB limit).', 'too_large')
    if resp.status_code >= 400:
        raise GmailError('Gmail could not send this email. Check the address and try again.', 'send_failed')
    data = resp.json() or {}
    acct.last_used_at = timezone.now()
    acct.save(update_fields=['last_used_at'])
    return {'id': data.get('id', ''), 'threadId': data.get('threadId', '')}
