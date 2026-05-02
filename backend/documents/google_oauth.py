"""
Google OAuth 2.0 (authorization code) for the React SPA.
Start URL and callback URL should use the same origin as FRONTEND_URL (e.g. Vite proxies /api).
"""
import secrets
import urllib.parse

import requests
from django.conf import settings
from django.contrib.auth import login
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.authtoken.models import Token

from accounts.models import User, Profile

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'


def _frontend_callback_path():
    return f"{settings.FRONTEND_URL.rstrip('/')}/oauth/callback"


@require_GET
def google_oauth_start(request):
    client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None) or '').strip()
    if not client_id:
        return JsonResponse({'error': 'Google OAuth is not configured'}, status=503)

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
        return HttpResponseRedirect(f'{next_url}?error={urllib.parse.quote(err)}')
    code = request.GET.get('code')
    state = request.GET.get('state')
    if not code or not state:
        return HttpResponseRedirect(f'{next_url}?error=missing_params')
    saved = request.session.get('google_oauth_state')
    if not saved or saved != state:
        return HttpResponseRedirect(f'{next_url}?error=invalid_state')
    request.session.pop('google_oauth_state', None)

    client_id = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None) or '').strip()
    client_secret = (getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', None) or '').strip()
    if not client_id or not client_secret:
        return HttpResponseRedirect(f'{next_url}?error=not_configured')

    redirect_uri = settings.GOOGLE_OAUTH_REDIRECT_URI
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
    if token_resp.status_code != 200:
        return HttpResponseRedirect(f'{next_url}?error=token_exchange')
    access_token = (token_resp.json() or {}).get('access_token')
    if not access_token:
        return HttpResponseRedirect(f'{next_url}?error=no_access_token')

    user_resp = requests.get(
        GOOGLE_USERINFO_URL,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=30,
    )
    if user_resp.status_code != 200:
        return HttpResponseRedirect(f'{next_url}?error=userinfo')
    info = user_resp.json() or {}
    email = (info.get('email') or '').strip()
    if not email or not info.get('verified_email'):
        return HttpResponseRedirect(f'{next_url}?error=email_not_verified')

    email_norm = email.lower()
    user = User.objects.filter(email__iexact=email_norm).first()
    if user is None:
        base_username = email_norm.split('@')[0] or 'user'
        username = base_username
        c = 0
        while User.objects.filter(username=username).exists():
            c += 1
            username = f'{base_username}{c}' if c < 100 else f'{base_username}_{email_norm[:8]}'
        user = User(username=username, email=email_norm)
        user.set_unusable_password()
        user.save()

    Profile.objects.get_or_create(user=user)
    token, _ = Token.objects.get_or_create(user=user)
    login(request, user)
    return HttpResponseRedirect(f'{next_url}?token={urllib.parse.quote(token.key, safe="")}')
