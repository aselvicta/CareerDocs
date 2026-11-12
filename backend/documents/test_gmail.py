from email import message_from_bytes
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

from django.core import mail
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token

from accounts.models import Profile, User
from documents import gmail
from documents.models import Application, GmailAccount

SETTINGS = dict(
    GOOGLE_OAUTH_CLIENT_ID='cid',
    GOOGLE_OAUTH_CLIENT_SECRET='secret',
    GOOGLE_OAUTH_REDIRECT_URI='http://testserver/api/auth/google/callback',
    FRONTEND_URL='http://frontend.test',
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='CareerDocs <noreply@careerdocs.test>',
    GMAIL_SEND_ENABLED=True,
)


def _resp(status, data=None):
    r = MagicMock(status_code=status, content=b'{}')
    r.json.return_value = data or {}
    return r


@override_settings(**SETTINGS)
class GmailTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='amina', email='amina@example.com', password='pw-12345678')
        Profile.objects.create(user=self.user, full_name='Amina Njeri', email='amina.njeri@example.com')
        self.auth = {'HTTP_AUTHORIZATION': f'Token {Token.objects.create(user=self.user).key}'}

    def _connect_state(self):
        r = self.client.post('/api/gmail/connect/', **self.auth)
        self.assertEqual(r.status_code, 200)
        q = parse_qs(urlparse(r.json()['url']).query)
        self.assertIn(gmail.GMAIL_SEND_SCOPE, q['scope'][0])
        self.assertEqual(q['access_type'], ['offline'])
        return q['state'][0]

    def _account(self, email='amina.jobs@gmail.com'):
        return GmailAccount.objects.create(user=self.user, email=email, refresh_token=gmail.encrypt_token('refresh-1'))

    # ----- connect -----
    @patch('documents.gmail.requests')
    def test_connect_stores_encrypted_refresh_token(self, req):
        state = self._connect_state()
        req.post.return_value = _resp(200, {'access_token': 'at', 'refresh_token': 'rt-secret',
                                            'scope': f'openid email {gmail.GMAIL_SEND_SCOPE}'})
        req.get.return_value = _resp(200, {'email': 'Amina.Jobs@gmail.com'})
        r = self.client.get('/api/auth/google/callback', {'state': state, 'code': 'c'})
        self.assertEqual(r['Location'], 'http://frontend.test/profile?gmail=connected#email')
        acct = GmailAccount.objects.get(user=self.user)
        self.assertEqual(acct.email, 'amina.jobs@gmail.com')
        self.assertNotIn('rt-secret', acct.refresh_token)
        self.assertEqual(gmail.decrypt_token(acct.refresh_token), 'rt-secret')

    @patch('documents.gmail.requests')
    def test_connect_rejects_when_gmail_box_unticked(self, req):
        state = self._connect_state()
        req.post.return_value = _resp(200, {'access_token': 'at', 'refresh_token': 'rt', 'scope': 'openid email'})
        r = self.client.get('/api/auth/google/callback', {'state': state, 'code': 'c'})
        self.assertIn('gmail_error=scope_denied', r['Location'])
        self.assertFalse(GmailAccount.objects.exists())

    def test_connect_rejects_tampered_state(self):
        r = self.client.get('/api/auth/google/callback', {'state': 'gm.forged', 'code': 'c'})
        self.assertIn('gmail_error=invalid_state', r['Location'])

    def test_accounts_list_never_returns_token(self):
        self._account()
        r = self.client.get('/api/gmail/accounts/', **self.auth)
        self.assertTrue(r.json()['available'])
        self.assertEqual(r.json()['accounts'][0]['email'], 'amina.jobs@gmail.com')
        self.assertNotIn('refresh_token', r.json()['accounts'][0])

    # ----- send -----
    @patch('documents.gmail.requests')
    def test_send_from_gmail_links_application(self, req):
        acct = self._account()
        job = Application.objects.create(user=self.user, job_title='Data Analyst', company='Acme', status='draft')
        req.post.side_effect = [_resp(200, {'access_token': 'at'}), _resp(200, {'id': 'm1', 'threadId': 't1'})]
        r = self.client.post('/api/compose-email/', {
            'to_email': 'hr@acme.test', 'subject': 'Application', 'body': 'Hello',
            'from_account': acct.id, 'application': job.id,
        }, **self.auth)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['via'], 'gmail')
        raw = req.post.call_args_list[1].kwargs['data']
        msg = message_from_bytes(raw)
        self.assertEqual(msg['To'], 'hr@acme.test')
        self.assertIn('amina.jobs@gmail.com', msg['From'])
        self.assertIn('Amina Njeri', msg['From'])
        job.refresh_from_db()
        self.assertEqual((job.gmail_thread_id, job.email_sent_from, job.status), ('t1', 'amina.jobs@gmail.com', 'applied'))
        self.assertEqual(len(mail.outbox), 0)

    @patch('documents.gmail.requests')
    def test_revoked_token_asks_to_reconnect(self, req):
        acct = self._account()
        req.post.return_value = _resp(400, {'error': 'invalid_grant'})
        r = self.client.post('/api/compose-email/', {'to_email': 'hr@acme.test', 'from_account': acct.id}, **self.auth)
        self.assertEqual(r.status_code, 409)
        self.assertTrue(r.json()['reconnect'])
        acct.refresh_from_db()
        self.assertTrue(acct.needs_reconnect)

    def test_cannot_send_from_someone_elses_account(self):
        other = User.objects.create_user(username='x', email='x@example.com', password='pw-12345678')
        acct = GmailAccount.objects.create(user=other, email='x@gmail.com', refresh_token=gmail.encrypt_token('r'))
        r = self.client.post('/api/compose-email/', {'to_email': 'hr@acme.test', 'from_account': acct.id}, **self.auth)
        self.assertEqual(r.status_code, 400)

    def test_default_sender_sets_reply_to_user(self):
        r = self.client.post('/api/compose-email/', {'to_email': 'hr@acme.test', 'subject': 'Hi'}, **self.auth)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['via'], 'careerdocs')
        self.assertEqual(mail.outbox[0].reply_to, ['amina.njeri@example.com'])

    def test_invalid_recipient(self):
        r = self.client.post('/api/compose-email/', {'to_email': 'not-an-email'}, **self.auth)
        self.assertEqual(r.status_code, 400)

    @patch('documents.gmail.requests')
    def test_disconnect_revokes_and_deletes(self, req):
        acct = self._account()
        r = self.client.delete(f'/api/gmail/accounts/{acct.id}/', **self.auth)
        self.assertEqual(r.status_code, 204)
        self.assertEqual(req.post.call_args.kwargs['data'], {'token': 'refresh-1'})
        self.assertFalse(GmailAccount.objects.exists())

    @override_settings(GMAIL_SEND_ENABLED=False)
    def test_connect_is_off_by_default(self):
        self.assertFalse(self.client.get('/api/gmail/accounts/', **self.auth).json()['available'])
        self.assertEqual(self.client.post('/api/gmail/connect/', **self.auth).status_code, 400)

    def test_mark_sent_after_open_in_gmail(self):
        job = Application.objects.create(user=self.user, job_title='Data Analyst', status='draft')
        r = self.client.post(f'/api/applications/{job.id}/mark-sent/',
                             {'to_email': 'hr@acme.test', 'subject': 'Application'}, **self.auth)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual((r.json()['email_sent_via'], r.json()['status'], r.json()['email_sent_to']),
                         ('gmail_compose', 'applied', 'hr@acme.test'))

    def test_mark_sent_rejects_other_users_job(self):
        other = User.objects.create_user(username='y', email='y@example.com', password='pw-12345678')
        job = Application.objects.create(user=other, job_title='X')
        r = self.client.post(f'/api/applications/{job.id}/mark-sent/', {'to_email': 'hr@acme.test'}, **self.auth)
        self.assertEqual(r.status_code, 404)
