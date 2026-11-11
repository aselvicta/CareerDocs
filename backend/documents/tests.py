from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token

from accounts.models import Profile, User

OAUTH_SETTINGS = dict(
    GOOGLE_OAUTH_CLIENT_ID='cid',
    GOOGLE_OAUTH_CLIENT_SECRET='secret',
    GOOGLE_OAUTH_REDIRECT_URI='http://testserver/api/auth/google/callback',
    FRONTEND_URL='http://frontend.test',
)


def _resp(status, data):
    r = MagicMock(status_code=status)
    r.json.return_value = data
    return r


@override_settings(**OAUTH_SETTINGS)
class GoogleOAuthTests(TestCase):
    userinfo = {
        'email': 'Jane.Doe@Example.com',
        'verified_email': True,
        'name': 'Jane Doe',
        'given_name': 'Jane',
        'family_name': 'Doe',
    }

    def _start(self):
        r = self.client.get('/api/auth/google/')
        self.assertEqual(r.status_code, 302)
        q = parse_qs(urlparse(r['Location']).query)
        self.assertEqual(q['client_id'], ['cid'])
        return q['state'][0]

    def _callback(self, state, userinfo=None, path='/api/auth/google/callback'):
        with patch('documents.google_oauth.requests.post', return_value=_resp(200, {'access_token': 'at'})), \
             patch('documents.google_oauth.requests.get', return_value=_resp(200, userinfo or self.userinfo)):
            return self.client.get(path, {'code': 'c', 'state': state})

    def test_sign_up_creates_user_and_returns_token_in_fragment(self):
        r = self._callback(self._start())
        self.assertEqual(r.status_code, 302)
        loc = urlparse(r['Location'])
        self.assertEqual(f'{loc.scheme}://{loc.netloc}{loc.path}', 'http://frontend.test/oauth/callback')
        self.assertEqual(loc.query, '')
        token = parse_qs(loc.fragment)['token'][0]

        user = User.objects.get(email='jane.doe@example.com')
        self.assertEqual(Token.objects.get(user=user).key, token)
        self.assertFalse(user.has_usable_password())
        self.assertEqual((user.first_name, user.last_name), ('Jane', 'Doe'))
        profile = Profile.objects.get(user=user)
        self.assertEqual(profile.full_name, 'Jane Doe')
        self.assertEqual(profile.email, 'jane.doe@example.com')

    def test_sign_in_existing_account_by_email(self):
        user = User.objects.create_user(username='jane', email='jane.doe@example.com', password='pw-123456!')
        r = self._callback(self._start(), path='/api/auth/google/callback/')
        token = parse_qs(urlparse(r['Location']).fragment)['token'][0]
        self.assertEqual(Token.objects.get(key=token).user, user)
        self.assertEqual(User.objects.count(), 1)
        user.refresh_from_db()
        self.assertTrue(user.has_usable_password())  # password login keeps working

    def test_username_collision_gets_suffix(self):
        User.objects.create_user(username='jane.doe', email='other@example.com', password='x')
        self._callback(self._start())
        self.assertEqual(User.objects.get(email='jane.doe@example.com').username, 'jane.doe1')

    def test_invalid_state_rejected(self):
        self._start()
        r = self._callback('wrong')
        self.assertIn('error=invalid_state', r['Location'])
        self.assertFalse(User.objects.filter(email='jane.doe@example.com').exists())

    def test_unverified_email_rejected(self):
        r = self._callback(self._start(), userinfo={**self.userinfo, 'verified_email': False})
        self.assertIn('error=email_not_verified', r['Location'])

    def test_user_cancelled(self):
        r = self.client.get('/api/auth/google/callback', {'error': 'access_denied'})
        self.assertEqual(r['Location'], 'http://frontend.test/oauth/callback?error=access_denied')

    @override_settings(GOOGLE_OAUTH_CLIENT_ID='')
    def test_not_configured_redirects_to_frontend(self):
        r = self.client.get('/api/auth/google/')
        self.assertEqual(r['Location'], 'http://frontend.test/oauth/callback?error=not_configured')
