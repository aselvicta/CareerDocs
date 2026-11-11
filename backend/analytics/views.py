"""
Page-view tracking (public) and the staff-only admin dashboard API.
All admin endpoints require user.is_staff (DRF IsAdminUser).
"""
from datetime import datetime, time, timedelta

from django.db.models import Count, F, IntegerField, Max, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from accounts.models import Profile, User
from documents.models import CV, Application, Letter
from documents.serializers import ApplicationSerializer, CVSerializer, LetterSerializer

from .models import ActivityEvent
from .tracking import normalize_path, record, referrer_host

PAGE_VIEW = 'page.view'
PAGE_SIZE = 25


# ---------------------------------------------------------------- helpers
def _int(value, default, lo=1, hi=10_000):
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def _paginate(request, qs, serialize, size=PAGE_SIZE):
    page = _int(request.query_params.get('page'), 1)
    total = qs.count()
    rows = qs[(page - 1) * size: page * size]
    return {
        'results': [serialize(r) for r in rows],
        'page': page,
        'pages': max(1, -(-total // size)),
        'total': total,
    }


def _auth_method(user):
    return 'password' if user.has_usable_password() else 'google'


def _count_subquery(model, field='user'):
    return Coalesce(
        Subquery(
            model.objects.filter(**{field: OuterRef('pk')})
            .order_by()
            .values(field)
            .annotate(c=Count('pk'))
            .values('c'),
            output_field=IntegerField(),
        ),
        0,
    )


def _iso(dt):
    return dt.isoformat() if dt else None


def _event_json(e):
    return {
        'id': e.pk,
        'event': e.event,
        'user': {'id': e.user_id, 'email': e.user.email} if e.user_id and e.user else None,
        'visitor_id': e.visitor_id,
        'path': e.path,
        'method': e.method,
        'status_code': e.status_code,
        'object_id': e.object_id,
        'ip': e.ip,
        'user_agent': e.user_agent,
        'referrer': e.referrer,
        'metadata': e.metadata,
        'created_at': _iso(e.created_at),
    }


def _user_row(u):
    return {
        'id': u.pk,
        'email': u.email,
        'username': u.username,
        'name': u.get_full_name(),
        'date_joined': _iso(u.date_joined),
        'last_login': _iso(u.last_login),
        'last_seen': _iso(getattr(u, 'last_seen', None)),
        'is_active': u.is_active,
        'is_staff': u.is_staff,
        'is_superuser': u.is_superuser,
        'auth_method': _auth_method(u),
        'cv_count': getattr(u, 'cv_count', None),
        'letter_count': getattr(u, 'letter_count', None),
        'application_count': getattr(u, 'application_count', None),
        'event_count': getattr(u, 'event_count', None),
    }


def _breakdown(qs, field, limit=None):
    rows = qs.order_by().values(field).annotate(count=Count('pk')).order_by('-count')
    if limit:
        rows = rows[:limit]
    return [{'label': r[field] or '(none)', 'count': r['count']} for r in rows]


# ---------------------------------------------------------------- tracking
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def api_track(request):
    """Page views from the SPA. Body: {path, referrer?, visitor_id?}"""
    data = request.data if isinstance(request.data, dict) else {}
    raw_path = str(data.get('path') or '')[:300]
    if not raw_path.startswith('/') or raw_path.startswith('/admin'):
        return Response(status=status.HTTP_204_NO_CONTENT)
    ref_host = referrer_host(str(data.get('referrer') or ''))
    own_host = request.get_host().split(':')[0]
    record(
        request,
        PAGE_VIEW,
        path=normalize_path(raw_path),
        visitor_id=str(data.get('visitor_id') or '')[:64],
        referrer='' if ref_host in ('', own_host) else ref_host,
        metadata={'raw_path': raw_path},
    )
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- overview
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_overview(request):
    days = _int(request.query_params.get('days'), 30, 1, 365)
    now = timezone.now()
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)
    since = timezone.make_aware(datetime.combine(start_date, time.min))

    events = ActivityEvent.objects.filter(created_at__gte=since)
    views = events.filter(event=PAGE_VIEW)
    actions = events.exclude(event=PAGE_VIEW)
    users = User.objects.all()

    # Daily series (zero-filled)
    def daily(qs, distinct_field=None):
        agg = Count(distinct_field, distinct=True) if distinct_field else Count('pk')
        rows = qs.annotate(d=TruncDate('created_at')).order_by().values('d').annotate(v=agg)
        return {r['d']: r['v'] for r in rows}

    signups_by_day = {
        r['d']: r['v']
        for r in users.filter(date_joined__gte=since)
        .annotate(d=TruncDate('date_joined')).order_by().values('d').annotate(v=Count('pk'))
    }
    s_views = daily(views)
    s_visitors = daily(views.exclude(visitor_id=''), 'visitor_id')
    s_active = daily(events.exclude(user=None), 'user')
    s_actions = daily(actions)
    series = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        series.append({
            'date': d.isoformat(),
            'page_views': s_views.get(d, 0),
            'visitors': s_visitors.get(d, 0),
            'active_users': s_active.get(d, 0),
            'signups': signups_by_day.get(d, 0),
            'actions': s_actions.get(d, 0),
        })

    google_users = users.filter(password__startswith='!').count()
    mobile_views = views.filter(
        Q(user_agent__icontains='Mobi') | Q(user_agent__icontains='Android')
    ).count()
    total_views = views.count()

    top_users = (
        actions.exclude(user=None).order_by().values('user', 'user__email')
        .annotate(count=Count('pk')).order_by('-count')[:8]
    )

    return Response({
        'days': days,
        'generated_at': _iso(now),
        'totals': {
            'users': users.count(),
            'active_accounts': users.filter(is_active=True).count(),
            'staff': users.filter(is_staff=True).count(),
            'google_users': google_users,
            'password_users': users.count() - google_users,
            'cvs': CV.objects.count(),
            'shared_cvs': CV.objects.exclude(share_token__isnull=True).exclude(share_token='').count(),
            'letters': Letter.objects.count(),
            'applications': Application.objects.count(),
            'events': ActivityEvent.objects.count(),
        },
        'period': {
            'new_users': users.filter(date_joined__gte=since).count(),
            'active_users': events.exclude(user=None).values('user').distinct().count(),
            'visitors': views.exclude(visitor_id='').values('visitor_id').distinct().count(),
            'page_views': total_views,
            'actions': actions.count(),
            'logins': actions.filter(event__in=('auth.login', 'auth.google_login'), status_code__lt=400).count(),
            'ai_requests': actions.filter(event__startswith='ai.').count(),
            'exports': actions.filter(event__contains='.export_').count(),
            'emails_sent': actions.filter(Q(event__endswith='.email') | Q(event='email.compose')).count(),
            'cvs_created': CV.objects.filter(created_at__gte=since).count(),
            'letters_created': Letter.objects.filter(created_at__gte=since).count(),
            'failed_requests': actions.filter(status_code__gte=400).count(),
        },
        'series': series,
        'top_pages': _breakdown(views, 'path', 10),
        'top_events': _breakdown(actions, 'event', 12),
        'referrers': _breakdown(views.exclude(referrer=''), 'referrer', 8),
        'devices': [
            {'label': 'Desktop', 'count': total_views - mobile_views},
            {'label': 'Mobile', 'count': mobile_views},
        ],
        'top_users': [
            {'id': r['user'], 'email': r['user__email'], 'count': r['count']} for r in top_users
        ],
        'cv_templates': _breakdown(CV.objects.all(), 'template'),
        'letter_types': _breakdown(Letter.objects.all(), 'letter_type'),
        'application_statuses': _breakdown(Application.objects.all(), 'status'),
        'recent': [_event_json(e) for e in ActivityEvent.objects.select_related('user')[:15]],
    })


# ---------------------------------------------------------------- users
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_users(request):
    qs = User.objects.annotate(
        cv_count=_count_subquery(CV),
        letter_count=_count_subquery(Letter),
        application_count=_count_subquery(Application),
        event_count=_count_subquery(ActivityEvent),
        last_seen=Subquery(
            ActivityEvent.objects.filter(user=OuterRef('pk')).order_by('-created_at').values('created_at')[:1]
        ),
    )
    q = (request.query_params.get('q') or '').strip()
    if q:
        qs = qs.filter(
            Q(email__icontains=q) | Q(username__icontains=q)
            | Q(first_name__icontains=q) | Q(last_name__icontains=q)
        )
    role = request.query_params.get('filter')
    if role == 'staff':
        qs = qs.filter(is_staff=True)
    elif role == 'inactive':
        qs = qs.filter(is_active=False)
    elif role == 'google':
        qs = qs.filter(password__startswith='!')
    elif role == 'password':
        qs = qs.exclude(password__startswith='!')

    sort_map = {
        'newest': '-date_joined', 'oldest': 'date_joined', 'email': 'email',
        'last_seen': '-last_seen', 'activity': '-event_count', 'cvs': '-cv_count',
    }
    sort = sort_map.get(request.query_params.get('sort'), '-date_joined')
    if sort == '-last_seen':
        qs = qs.order_by(F('last_seen').desc(nulls_last=True), '-pk')
    else:
        qs = qs.order_by(sort, '-pk')
    return Response(_paginate(request, qs, _user_row))


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_user_detail(request, pk):
    user = get_object_or_404(User, pk=pk)

    if request.method == 'DELETE':
        if user.pk == request.user.pk:
            return Response({'error': 'You cannot delete your own account here.'}, status=400)
        if user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'Only a superuser can delete a superuser.'}, status=403)
        record(request, 'admin.user_delete', object_id=str(user.pk), metadata={'email': user.email})
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if request.method == 'PATCH':
        changes = {}
        for field in ('is_active', 'is_staff'):
            if field in request.data:
                value = bool(request.data[field])
                if user.pk == request.user.pk and not value:
                    return Response({'error': 'You cannot remove your own admin access or deactivate yourself.'}, status=400)
                if user.is_superuser and not request.user.is_superuser:
                    return Response({'error': 'Only a superuser can change a superuser.'}, status=403)
                setattr(user, field, value)
                changes[field] = value
        if changes:
            user.save(update_fields=list(changes))
            if changes.get('is_active') is False:
                Token.objects.filter(user=user).delete()  # sign them out everywhere
            record(request, 'admin.user_update', object_id=str(user.pk),
                   metadata={'email': user.email, **changes})

    profile = Profile.objects.filter(user=user).first()
    user_events = ActivityEvent.objects.filter(user=user)
    data = _user_row(user)
    data['last_seen'] = _iso(user_events.aggregate(m=Max('created_at'))['m'])
    data.update({
        'profile': {
            'full_name': profile.full_name, 'email': profile.email, 'phone': profile.phone,
            'location': profile.location, 'summary': profile.summary,
        } if profile else None,
        'cvs': [
            {'id': c.pk, 'title': c.title, 'template': c.template, 'shared': bool(c.share_token),
             'created_at': _iso(c.created_at), 'updated_at': _iso(c.updated_at)}
            for c in user.cvs.order_by('-updated_at')
        ],
        'letters': [
            {'id': l.pk, 'title': l.title, 'letter_type': l.letter_type, 'company': l.company,
             'created_at': _iso(l.created_at), 'updated_at': _iso(l.updated_at)}
            for l in user.letters.order_by('-updated_at')
        ],
        'applications': [
            {'id': a.pk, 'job_title': a.job_title, 'company': a.company, 'status': a.status,
             'deadline': a.deadline.isoformat() if a.deadline else None, 'updated_at': _iso(a.updated_at)}
            for a in user.applications.order_by('-updated_at')
        ],
        'event_breakdown': _breakdown(user_events, 'event'),
        'activity': [_event_json(e) for e in user_events.select_related('user')[:100]],
    })
    data['cv_count'], data['letter_count'], data['application_count'] = (
        len(data['cvs']), len(data['letters']), len(data['applications'])
    )
    data['event_count'] = user_events.count()
    return Response(data)


# ---------------------------------------------------------------- activity feed
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_activity(request):
    qs = ActivityEvent.objects.select_related('user')
    p = request.query_params
    if p.get('event'):
        ev = p['event']
        qs = qs.filter(event__startswith=ev[:-1]) if ev.endswith('*') else qs.filter(event=ev)
    if p.get('exclude_page_views') in ('1', 'true'):
        qs = qs.exclude(event=PAGE_VIEW)
    if p.get('user'):
        qs = qs.filter(user_id=_int(p['user'], 0, 0))
    if p.get('q'):
        q = p['q'].strip()
        qs = qs.filter(
            Q(user__email__icontains=q) | Q(path__icontains=q)
            | Q(ip__icontains=q) | Q(visitor_id__icontains=q)
        )
    if p.get('failed') in ('1', 'true'):
        qs = qs.filter(status_code__gte=400)
    data = _paginate(request, qs, _event_json, size=50)
    data['event_types'] = list(
        ActivityEvent.objects.order_by().values_list('event', flat=True).distinct().order_by('event')
    )
    return Response(data)


# ---------------------------------------------------------------- content
CONTENT = {
    'cvs': {
        'model': CV, 'serializer': CVSerializer,
        'search': ('title', 'full_name', 'email', 'user__email'),
        'row': lambda o: {'id': o.pk, 'title': o.title, 'subtitle': o.full_name, 'kind': o.template,
                          'shared': bool(o.share_token)},
    },
    'letters': {
        'model': Letter, 'serializer': LetterSerializer,
        'search': ('title', 'company', 'recipient_name', 'user__email'),
        'row': lambda o: {'id': o.pk, 'title': o.title or o.get_letter_type_display(),
                          'subtitle': o.company, 'kind': o.letter_type},
    },
    'applications': {
        'model': Application, 'serializer': ApplicationSerializer,
        'search': ('job_title', 'company', 'user__email'),
        'row': lambda o: {'id': o.pk, 'title': o.job_title, 'subtitle': o.company, 'kind': o.status},
    },
}


def _content_cfg(kind):
    cfg = CONTENT.get(kind)
    if cfg is None:
        from django.http import Http404
        raise Http404
    return cfg


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_content(request, kind):
    cfg = _content_cfg(kind)
    qs = cfg['model'].objects.select_related('user').order_by('-updated_at')
    q = (request.query_params.get('q') or '').strip()
    if q:
        cond = Q()
        for f in cfg['search']:
            cond |= Q(**{f'{f}__icontains': q})
        qs = qs.filter(cond)
    if request.query_params.get('user'):
        qs = qs.filter(user_id=_int(request.query_params['user'], 0, 0))

    def row(o):
        r = cfg['row'](o)
        r.update({'user': {'id': o.user_id, 'email': o.user.email},
                  'created_at': _iso(o.created_at), 'updated_at': _iso(o.updated_at)})
        return r

    return Response(_paginate(request, qs, row))


@api_view(['GET', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_content_detail(request, kind, pk):
    cfg = _content_cfg(kind)
    obj = get_object_or_404(cfg['model'].objects.select_related('user'), pk=pk)
    if request.method == 'DELETE':
        record(request, f'admin.{kind}_delete', object_id=str(pk), metadata={'owner': obj.user.email})
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    data = dict(cfg['serializer'](obj).data)
    data['_owner'] = {'id': obj.user_id, 'email': obj.user.email}
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_revoke_share(request, pk):
    cv = get_object_or_404(CV, pk=pk)
    cv.share_token = None
    cv.save(update_fields=['share_token'])
    record(request, 'admin.cv_revoke_share', object_id=str(pk), metadata={'owner': cv.user.email})
    return Response({'ok': True})
