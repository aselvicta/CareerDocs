from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import User
from documents.models import CV

from .models import ActivityEvent
from .tracking import normalize_path


def _client(user=None):
    c = APIClient()
    if user:
        c.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.get_or_create(user=user)[0].key}')
    return c


class TrackingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@example.com', password='Str0ng-pass!')

    def test_normalize_path(self):
        self.assertEqual(normalize_path('/cv/42/edit?x=1'), '/cv/:id/edit')
        self.assertEqual(normalize_path('/view/cv/AbCdEfGhIjKlMnOpQrSt'), '/view/cv/:id')
        self.assertEqual(normalize_path('/letters/new'), '/letters/new')

    def test_page_view_anonymous_and_authenticated(self):
        _client().post('/api/track/', {'path': '/login', 'visitor_id': 'v1', 'referrer': 'https://google.com/x'}, format='json')
        _client(self.user).post('/api/track/', {'path': '/cv/5', 'visitor_id': 'v1'}, format='json')
        anon, auth = ActivityEvent.objects.order_by('pk')
        self.assertIsNone(anon.user)
        self.assertEqual((anon.path, anon.referrer, anon.visitor_id), ('/login', 'google.com', 'v1'))
        self.assertEqual((auth.user, auth.path), (self.user, '/cv/:id'))

    def test_admin_pages_not_tracked(self):
        _client().post('/api/track/', {'path': '/admin/users'}, format='json')
        self.assertFalse(ActivityEvent.objects.exists())

    def test_middleware_records_login_and_cv_actions(self):
        _client().post('/api/auth/login/', {'email': 'u@example.com', 'password': 'Str0ng-pass!'}, format='json')
        c = _client(self.user)
        cv_id = c.post('/api/cvs/', {'title': 'Mine'}, format='json').data['id']
        c.delete(f'/api/cvs/{cv_id}/')
        c.get('/api/cvs/')  # plain reads are not recorded
        events = list(ActivityEvent.objects.order_by('pk').values_list('event', 'user', 'object_id'))
        self.assertEqual(events, [
            ('auth.login', self.user.pk, ''),
            ('cv.create', self.user.pk, ''),
            ('cv.delete', self.user.pk, str(cv_id)),
        ])

    def test_logout_attributed_to_token_user(self):
        _client(self.user).post('/api/auth/logout/')
        self.assertEqual(ActivityEvent.objects.get().user, self.user)

    def test_failed_login_recorded_without_user(self):
        _client().post('/api/auth/login/', {'email': 'u@example.com', 'password': 'nope'}, format='json')
        e = ActivityEvent.objects.get()
        self.assertEqual((e.event, e.status_code, e.user), ('auth.login', 401, None))

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save()
        r = _client().post('/api/auth/login/', {'email': 'u@example.com', 'password': 'Str0ng-pass!'}, format='json')
        self.assertEqual(r.status_code, 403)


class AdminApiTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.admin = User.objects.create_user(username='a', email='admin@example.com', password='x', is_staff=True)
        self.user = User.objects.create_user(username='u', email='u@example.com', password='x')
        self.cv = CV.objects.create(user=self.user, title='CV 1', share_token='tok123')
        ActivityEvent.objects.create(user=self.user, event='page.view', path='/', visitor_id='v')
        ActivityEvent.objects.create(user=self.user, event='cv.export_pdf', status_code=200)

    def test_non_staff_forbidden(self):
        for url in ('/api/admin/overview/', '/api/admin/users/', '/api/admin/activity/', '/api/admin/content/cvs/'):
            self.assertEqual(_client(self.user).get(url).status_code, 403, url)
            self.assertIn(_client().get(url).status_code, (401, 403), url)

    def test_overview(self):
        r = _client(self.admin).get('/api/admin/overview/?days=7')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['totals']['users'], 2)
        self.assertEqual(r.data['totals']['shared_cvs'], 1)
        self.assertEqual(r.data['period']['page_views'], 1)
        self.assertEqual(r.data['period']['exports'], 1)
        self.assertEqual(len(r.data['series']), 7)
        self.assertEqual(r.data['series'][-1]['page_views'], 1)
        self.assertEqual(r.data['top_users'][0]['email'], 'u@example.com')
        # cached for a minute; ?refresh=1 bypasses
        ActivityEvent.objects.create(user=self.user, event='page.view', path='/x', visitor_id='v2')
        self.assertEqual(_client(self.admin).get('/api/admin/overview/?days=7').data['period']['page_views'], 1)
        self.assertEqual(_client(self.admin).get('/api/admin/overview/?days=7&refresh=1').data['period']['page_views'], 2)

    def test_users_list_and_detail(self):
        c = _client(self.admin)
        r = c.get('/api/admin/users/?q=u@exa')
        self.assertEqual(r.data['total'], 1)
        row = r.data['results'][0]
        self.assertEqual((row['cv_count'], row['event_count']), (1, 2))
        r = c.get(f'/api/admin/users/{self.user.pk}/')
        self.assertEqual(r.data['cvs'][0]['title'], 'CV 1')
        self.assertEqual(len(r.data['activity']), 2)
        self.assertEqual(c.get('/api/admin/users/?sort=last_seen').status_code, 200)

    def test_deactivate_signs_user_out(self):
        Token.objects.create(user=self.user)
        r = _client(self.admin).patch(f'/api/admin/users/{self.user.pk}/', {'is_active': False}, format='json')
        self.assertFalse(r.data['is_active'])
        self.assertFalse(Token.objects.filter(user=self.user).exists())

    def test_cannot_demote_or_delete_self(self):
        c = _client(self.admin)
        self.assertEqual(c.patch(f'/api/admin/users/{self.admin.pk}/', {'is_staff': False}, format='json').status_code, 400)
        self.assertEqual(c.delete(f'/api/admin/users/{self.admin.pk}/').status_code, 400)

    def test_content_and_revoke_share(self):
        c = _client(self.admin)
        self.assertEqual(c.get('/api/admin/content/cvs/').data['results'][0]['user']['email'], 'u@example.com')
        self.assertEqual(c.get(f'/api/admin/content/cvs/{self.cv.pk}/').data['title'], 'CV 1')
        self.assertEqual(c.get('/api/admin/content/nope/').status_code, 404)
        c.post(f'/api/admin/cvs/{self.cv.pk}/revoke-share/')
        self.cv.refresh_from_db()
        self.assertIsNone(self.cv.share_token)

    def test_activity_feed_filters(self):
        r = _client(self.admin).get('/api/admin/activity/?exclude_page_views=1')
        self.assertEqual([e['event'] for e in r.data['results']], ['cv.export_pdf'])
        self.assertIn('page.view', r.data['event_types'])


class AdminEmailsTests(TestCase):
    @staticmethod
    def _login(email, password):
        return APIClient().post('/api/auth/login/', {'email': email, 'password': password}, format='json')

    def test_listed_account_promoted_on_login(self):
        from django.test import override_settings
        User.objects.create_user(username='v', email='Boss@Example.com', password='Str0ng-pass!')
        with override_settings(ADMIN_EMAILS={'boss@example.com'}):
            r = self._login('boss@example.com', 'Str0ng-pass!')
        self.assertTrue(r.json()['user']['is_staff'])
        u = User.objects.get(email__iexact='boss@example.com')
        self.assertTrue(u.is_staff and u.is_superuser)

    def test_unlisted_account_not_promoted(self):
        from django.test import override_settings
        User.objects.create_user(username='n', email='normal@example.com', password='Str0ng-pass!')
        with override_settings(ADMIN_EMAILS={'boss@example.com'}):
            r = self._login('normal@example.com', 'Str0ng-pass!')
        self.assertFalse(r.json()['user']['is_staff'])

    def test_ensure_admins_command(self):
        from io import StringIO
        from django.core.management import call_command
        from django.test import override_settings
        User.objects.create_user(username='v', email='boss@example.com', password='x')
        out = StringIO()
        with override_settings(ADMIN_EMAILS={'boss@example.com', 'later@example.com'}):
            call_command('ensure_admins', stdout=out)
        self.assertTrue(User.objects.get(email='boss@example.com').is_superuser)
        self.assertIn('later@example.com: no account yet', out.getvalue())


class ClientListPaginationTests(TestCase):
    def setUp(self):
        from documents.models import Letter
        self.user = User.objects.create_user(username='p', email='p@example.com', password='x')
        other = User.objects.create_user(username='o', email='o@example.com', password='x')
        for i in range(15):
            CV.objects.create(user=self.user, title=f'CV {i}', summary='long text ' * 200)
        CV.objects.create(user=other, title='not mine')
        Letter.objects.create(user=self.user, letter_type='cover', title='L', body='body ' * 500)
        self.c = _client(self.user)

    def test_default_is_full_array_of_light_rows(self):
        r = self.c.get('/api/cvs/')
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), 15)
        self.assertNotIn('summary', r.data[0])
        self.assertEqual(r.data[0]['title'], 'CV 14')  # newest first

    def test_limit(self):
        self.assertEqual(len(self.c.get('/api/cvs/?limit=5').data), 5)

    def test_page(self):
        r = self.c.get('/api/cvs/?page=2&page_size=12')
        self.assertEqual((r.data['page'], r.data['pages'], r.data['total']), (2, 2, 15))
        self.assertEqual(len(r.data['results']), 3)
        r = self.c.get('/api/cvs/?page=99')  # clamps to last page
        self.assertEqual(r.data['page'], 2)

    def test_letters_list_has_no_body_but_detail_does(self):
        rows = self.c.get('/api/letters/').data
        self.assertNotIn('body', rows[0])
        self.assertIn('body', self.c.get(f"/api/letters/{rows[0]['id']}/").data)

    def test_gzip(self):
        r = self.c.get('/api/cvs/', HTTP_ACCEPT_ENCODING='gzip')
        self.assertEqual(r.get('Content-Encoding'), 'gzip')
