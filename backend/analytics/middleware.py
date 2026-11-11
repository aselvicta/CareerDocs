"""
Records every meaningful API action (create/update/delete, exports, AI, email, auth)
as an ActivityEvent. Page views come from the frontend via POST /api/track/.
"""
from .tracking import record, user_from_token_header

# (route relative to /api/, method) -> event name
ROUTE_EVENTS = {
    ('auth/register/', 'POST'): 'auth.signup',
    ('auth/login/', 'POST'): 'auth.login',
    ('auth/logout/', 'POST'): 'auth.logout',
    ('profile/', 'PATCH'): 'profile.update',
    ('cvs/', 'POST'): 'cv.create',
    ('cvs/<int:pk>/', 'PUT'): 'cv.update',
    ('cvs/<int:pk>/', 'PATCH'): 'cv.update',
    ('cvs/<int:pk>/', 'DELETE'): 'cv.delete',
    ('cvs/<int:pk>/duplicate/', 'POST'): 'cv.duplicate',
    ('cvs/<int:pk>/revert/<int:rev_id>/', 'POST'): 'cv.revert',
    ('cvs/<int:pk>/export/pdf/', 'GET'): 'cv.export_pdf',
    ('cvs/<int:pk>/export/docx/', 'GET'): 'cv.export_docx',
    ('cvs/<int:pk>/share/', 'POST'): 'cv.share',
    ('cvs/<int:pk>/share/', 'DELETE'): 'cv.unshare',
    ('cvs/<int:pk>/send-email/', 'POST'): 'cv.email',
    ('view/cv/<str:token>/', 'GET'): 'cv.public_view',
    ('letters/', 'POST'): 'letter.create',
    ('letters/<int:pk>/', 'PUT'): 'letter.update',
    ('letters/<int:pk>/', 'PATCH'): 'letter.update',
    ('letters/<int:pk>/', 'DELETE'): 'letter.delete',
    ('letters/<int:pk>/duplicate/', 'POST'): 'letter.duplicate',
    ('letters/<int:pk>/revert/<int:rev_id>/', 'POST'): 'letter.revert',
    ('letters/<int:pk>/export/pdf/', 'GET'): 'letter.export_pdf',
    ('letters/<int:pk>/export/docx/', 'GET'): 'letter.export_docx',
    ('letters/<int:pk>/send-email/', 'POST'): 'letter.email',
    ('ai/enhance/', 'POST'): 'ai.enhance',
    ('ai/suggest-alternatives/', 'POST'): 'ai.suggest',
    ('ai/generate-letter-body/', 'POST'): 'ai.generate_letter',
    ('ai/write-email/', 'POST'): 'ai.write_email',
    ('ai/help/', 'POST'): 'ai.help',
    ('ai/tailor-cv/', 'POST'): 'ai.tailor_cv',
    ('ai/tailor-letter/', 'POST'): 'ai.tailor_letter',
    ('ai/ats/', 'POST'): 'ai.ats',
    ('applications/', 'POST'): 'application.create',
    ('applications/<int:pk>/', 'PUT'): 'application.update',
    ('applications/<int:pk>/', 'PATCH'): 'application.update',
    ('applications/<int:pk>/', 'DELETE'): 'application.delete',
    ('compose-email/', 'POST'): 'email.compose',
}

_TRACKED_PREFIXES = ('/api/',)


class ActivityTrackingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith(_TRACKED_PREFIXES) or request.method == 'OPTIONS':
            return self.get_response(request)

        # Resolve the token user *before* the view runs (logout deletes the token).
        token_user = None
        if request.method != 'GET' or '/export/' in request.path:
            try:
                token_user = user_from_token_header(request)
            except Exception:  # noqa: BLE001
                token_user = None

        response = self.get_response(request)

        match = getattr(request, 'resolver_match', None)
        route = (match.route if match else '') or ''
        route = route[4:] if route.startswith('api/') else route
        event = ROUTE_EVENTS.get((route, request.method))
        if not event:
            return response

        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            user = token_user
        kwargs = match.kwargs if match else {}
        record(
            request,
            event,
            user=user,
            path=request.path[:300],
            method=request.method,
            status_code=response.status_code,
            object_id=str(kwargs.get('pk', ''))[:64],
            metadata={'ok': response.status_code < 400},
        )
        return response
