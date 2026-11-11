"""
Google OAuth 2.0 (authorization code) for the React SPA.
Start URL and callback URL should use the same origin as FRONTEND_URL (e.g. Vite proxies /api).
"""
import secrets
import urllib.parse

import requests
from django.conf import settings
from django.contrib.auth import login
from django.http import HttpResponseRedirect
from django.views.decorators.http import require_GET
from rest_framework.authtoken.models import Token

from accounts.models import User, Profile
from analytics.tracking import record

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'


def _frontend_callback_path():
    return f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback"


def _redirect_error(code):
    return HttpResponseRedirect(f'{_frontend_callback_path()}?error={urllib.parse.quote(code)}')


def _unique_username(email_norm):
    base = (email_norm.split('@')[0] or 'user')[:140]
    username = base
    c = 0
    while User.objects.filter(username=username).exists():
        c += 1
        username = f'{base}{c}' if c < 100 else f'{base}_{secrets.token_hex(4)}'
    return username


@require_GET
def google_oauth_start(request):
    client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None) or '').strip()
    if not client_id:
        return _redirect_error('not_configured')

    state = secrets.token_urlsafe(32)
    request.session['google_oauth_state'] = state
    redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid email profile',
        'state': state,
        'access_type': 'online',
        'prompt': 'select_account',
    }
    url = GOOGLE_AUTH_URL + '?' + urllib.parse.urlencode(params)
    return HttpResponseRedirect(url)


@require_GET
def google_oauth_callback(request):
    next_url = _frontend_callback_path()
    err = request.GET.get('error')
    if err:
        return _redirect_error(err)
    code = request.GET.get('code')
    state = request.GET.get('state')
    if not code or not state:
        return _redirect_error('missing_params')
    saved = request.session.get('google_oauth_state')
    if not saved or saved != state:
        return _redirect_error('invalid_state')
    request.session.pop('google_oauth_state', None)

    client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None) or '').strip()
    client_secret = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', None) or '').strip()
    if not client_id or not client_secret:
        return _redirect_error('not_configured')

    redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
    try:
        token_resp = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            },
            timeout=30,
        )
    except requests.RequestException:
        return _redirect_error('token_exchange')
    if token_resp.status_code != 200:
        return _redirect_error('token_exchange')
    access_token = (token_resp.json() or {}).get('access_token')
    if not access_token:
        return _redirect_error('no_access_token')

    try:
        user_resp = requests.get(
            GOOGLE_USERINFO_URL,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=30,
        )
    except requests.RequestException:
        return _redirect_error('userinfo')
    if user_resp.status_code != 200:
        return _redirect_error('userinfo')
    info = user_resp.json() or {}
    email = (info.get('email') or '').strip()
    if not email or not info.get('verified_email'):
        return _redirect_error('email_not_verified')

    email_norm = email.lower()
    given = (info.get('given_name') or '').strip()[:150]
    family = (info.get('family_name') or '').strip()[:150]
    full_name = (info.get('name') or f'{given} {family}').strip()[:200]

    user = User.objects.filter(email__iexact=email_norm).first()
    is_new = user is None
    if user is not None and not user.is_active:
        return _redirect_error('account_disabled')
    if is_new:
        # Sign up: first Google login creates the account.
        user = User(
            username=_unique_username(email_norm),
            email=email_norm,
            first_name=given,
            last_name=family,
        )
        user.set_unusable_password()
        user.save()

    profile, _ = Profile.objects.get_or_create(user=user)
    changed = []
    if not profile.full_name and full_name:
        profile.full_name = full_name
        changed.append('full_name')
    if not profile.email:
        profile.email = email_norm
        changed.append('email')
    if changed:
        profile.save(update_fields=changed + ['updated_at'])

    token, _ = Token.objects.get_or_create(user=user)
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    record(request, 'auth.google_signup' if is_new else 'auth.google_login', user=user,
           path=request.path[:300], method='GET', status_code=302)
    # Token goes in the URL fragment so it is never sent to servers or logged.
    return HttpResponseRedirect(f'{next_url}#token={urllib.parse.quote(token.key, safe="")}')
