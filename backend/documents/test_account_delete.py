from unittest.mock import patch

from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import Profile, User
from analytics.models import ActivityEvent
from documents import gmail
from documents.models import CV, Application, GmailAccount, Letter


class DeleteAccountTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@example.com', password='pw-123456!')
        self.other = User.objects.create_user(username='o', email='o@example.com', password='pw-123456!')
        Profile.objects.create(user=self.user, full_name='U')
        CV.objects.create(user=self.user, title='Mine')
        CV.objects.create(user=self.other, title='Theirs')
        Letter.objects.create(user=self.user, letter_type='cover', body='hi')
        Application.objects.create(user=self.user, job_title='Analyst')
        GmailAccount.objects.create(user=self.user, email='u@gmail.com', refresh_token=gmail.encrypt_token('rt'))
        ActivityEvent.objects.create(user=self.user, event='page.view', ip='1.2.3.4')
        ActivityEvent.objects.create(user=self.other, event='page.view')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_requires_matching_email(self):
        r = self.client.post('/api/auth/delete-account/', {'confirm': 'wrong@example.com'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_requires_auth(self):
        r = APIClient().post('/api/auth/delete-account/', {'confirm': 'u@example.com'}, format='json')
        self.assertIn(r.status_code, (401, 403))

    @patch('documents.gmail.requests.post')
    def test_deletes_everything_for_user_only(self, post):
        r = self.client.post('/api/auth/delete-account/', {'confirm': ' U@Example.com '}, format='json')
        self.assertEqual(r.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(CV.objects.filter(title='Mine').exists())
        self.assertFalse(Letter.objects.exists())
        self.assertFalse(Application.objects.exists())
        self.assertFalse(GmailAccount.objects.exists())
        self.assertFalse(Token.objects.filter(key=self.token.key).exists())
        self.assertEqual(ActivityEvent.objects.count(), 1)
        self.assertTrue(CV.objects.filter(title='Theirs').exists())
        # Gmail token revoked at Google
        self.assertEqual(post.call_args.kwargs['data'], {'token': 'rt'})
