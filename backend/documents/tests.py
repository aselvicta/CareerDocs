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


class TemplateDesignTests(TestCase):
    """Templates, design settings, photo validation and template-aware exports."""

    def setUp(self):
        from rest_framework.authtoken.models import Token
        from rest_framework.test import APIClient
        from accounts.models import User
        self.user = User.objects.create_user(username='t', email='t@example.com', password='x')
        self.c = APIClient()
        self.c.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.user).key}')

    def _cv(self, **extra):
        data = {
            'title': 'T', 'template': 'professional', 'full_name': 'Sarah Kamau', 'headline': 'Analyst',
            'experience_structured': [{'role': 'Intern', 'company': 'Acme', 'start_date': '2024', 'current': True,
                                       'bullets': 'Did a thing\nDid another'}],
            'skills_structured': [{'category': 'Tools', 'items': 'SQL, Excel'}],
            'languages': [{'language': 'English', 'proficiency': 'Fluent'}],
        }
        data.update(extra)
        return self.c.post('/api/cvs/', data, format='json')

    def test_design_is_cleaned(self):
        r = self._cv(design={'accent': '#1D4ED8', 'font': 'serif', 'density': 'bogus',
                             'section_order': ['skills', 'nope', 'skills', 'summary'], 'show_photo': False, 'x': 1})
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['design'], {'accent': '#1d4ed8', 'font': 'serif', 'show_photo': False,
                                            'section_order': ['skills', 'summary']})

    def test_bad_accent_and_photo_rejected(self):
        self.assertEqual(self._cv(design={'accent': 'red'}).status_code, 400)
        self.assertEqual(self._cv(photo='javascript:alert(1)').status_code, 400)
        self.assertEqual(self._cv(photo='data:image/svg+xml;base64,PHN2Zz4=').status_code, 400)
        ok = self._cv(photo='data:image/png;base64,iVBORw0KGgo=')
        self.assertEqual(ok.status_code, 201)

    def test_unknown_template_rejected(self):
        self.assertEqual(self._cv(template='fancy').status_code, 400)

    def test_list_excludes_photo(self):
        self._cv(photo='data:image/png;base64,iVBORw0KGgo=')
        row = self.c.get('/api/cvs/').data[0]
        self.assertNotIn('photo', row)
        self.assertEqual(row['template'], 'professional')

    def test_every_template_exports_pdf_and_docx(self):
        from .catalog import TEMPLATE_IDS
        cv_id = self._cv(photo='data:image/png;base64,iVBORw0KGgo=').data['id']
        letter_id = self.c.post('/api/letters/', {'letter_type': 'cover', 'body': 'Hello.\n\nSecond.', 'sender_name': 'S K'},
                                format='json').data['id']
        for t in TEMPLATE_IDS:
            self.c.patch(f'/api/cvs/{cv_id}/', {'template': t}, format='json')
            self.c.patch(f'/api/letters/{letter_id}/', {'template': t}, format='json')
            for url in (f'/api/cvs/{cv_id}/export/pdf/', f'/api/cvs/{cv_id}/export/docx/',
                        f'/api/letters/{letter_id}/export/pdf/', f'/api/letters/{letter_id}/export/docx/'):
                r = self.c.get(url)
                self.assertEqual(r.status_code, 200, f'{t} {url}')

    def test_harvard_puts_education_first(self):
        from .catalog import resolve_design
        self.assertEqual(resolve_design('harvard', {})['section_order'][:3], ['summary', 'education', 'experience'])
        self.assertEqual(resolve_design('classic', {'section_order': ['skills']})['section_order'][0], 'skills')

    def test_revision_restores_design(self):
        cv_id = self._cv(design={'accent': '#0f766e'}).data['id']
        self.c.patch(f'/api/cvs/{cv_id}/', {'template': 'modern', 'design': {'accent': '#be123c'}}, format='json')
        from .models import CVRevision
        first = CVRevision.objects.filter(cv_id=cv_id).order_by('created_at', 'pk').first()
        r = self.c.post(f'/api/cvs/{cv_id}/revert/{first.pk}/')
        self.assertEqual((r.data['template'], r.data['design']['accent']), ('professional', '#0f766e'))
