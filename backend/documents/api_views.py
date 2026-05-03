"""
REST API for React frontend. Token auth (Header: Authorization: Token <key>).
"""
import json

from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.http import JsonResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from accounts.models import User, Profile
from .models import CV, Letter, CVRevision, LetterRevision, Application
from .serializers import CVSerializer, LetterSerializer, ApplicationSerializer
from .services.deepseek import (
    deepseek_enhance_text,
    deepseek_suggest_alternatives,
    deepseek_generate_letter_body,
    deepseek_write_email,
    deepseek_help_answer,
    deepseek_tailor_cv,
    deepseek_tailor_cover_letter,
    deepseek_ats_analyze,
)
from .services.export_pdf import build_cv_pdf, build_letter_pdf
from .services.export_docx import build_cv_docx, build_letter_docx


def _user_json(user):
    return {'id': user.pk, 'email': user.email, 'username': getattr(user, 'username', '')}


# ---------- Auth ----------
@ensure_csrf_cookie
@require_GET
def api_csrf(request):
    return JsonResponse({'ok': True})


@csrf_exempt
@require_POST
def api_register(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError as e:
        return JsonResponse({'error': f'Invalid JSON: {e}'}, status=400)
    try:
        email = (data.get('email') or '').strip().lower()
        username = ((data.get('username') or '').strip() or email)
        password = (data.get('password') or data.get('password1') or '').strip()
        password2 = data.get('password2')
        if password2 not in (None, '') and password != str(password2).strip():
            return JsonResponse({'error': 'Passwords do not match'}, status=400)
        if not email:
            return JsonResponse({'error': 'Email is required'}, status=400)
        if not password:
            return JsonResponse({'error': 'Password is required'}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({'error': 'Email already registered'}, status=400)
        if len(username) > 150:
            username = (email.split('@')[0] if '@' in email else email)[:150] or 'user'
        # Ensure username is unique (email may equal username across users differently)
        base_username = username
        c = 0
        while User.objects.filter(username=username).exists():
            c += 1
            username = (
                f"{base_username}_{c}"
                if c < 500
                else f"u{c}_{email.split('@')[0]}"[:140]
            )
        candidate = User(username=username, email=email)
        try:
            validate_password(password, candidate)
        except DjangoValidationError as e:
            return JsonResponse({'error': ' '.join(e.messages)}, status=400)
        user = User.objects.create_user(username=username, email=email, password=password)
        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)
        return JsonResponse({'user': _user_json(user), 'token': token.key})
    except IntegrityError:
        return JsonResponse(
            {'error': 'This email or username is already taken. Try signing in.'},
            status=400,
        )
    except DjangoValidationError as e:
        return JsonResponse({'error': ' '.join(e.messages)}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_POST
def api_login(request):
    try:
        data = json.loads(request.body) if request.body else {}
        email_raw = (data.get('email', '') or '').strip()
        password = data.get('password', '')
        if not email_raw or not password:
            return JsonResponse({'error': 'email and password required'}, status=400)
        user = User.objects.filter(email__iexact=email_raw).first()
        if user is None or not user.check_password(password):
            return JsonResponse({'error': 'Invalid email or password'}, status=401)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        token, _ = Token.objects.get_or_create(user=user)
        return JsonResponse({'user': _user_json(user), 'token': token.key})
    except json.JSONDecodeError as e:
        return JsonResponse({'error': f'Invalid JSON: {e}'}, status=400)
    except Exception as e:
        from django.conf import settings
        if settings.DEBUG:
            return JsonResponse({'error': str(e)}, status=500)
        return JsonResponse({'error': 'An error occurred'}, status=500)


@csrf_exempt
@require_POST
def api_logout(request):
    if getattr(request, 'user', None) and request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
    logout(request)
    return JsonResponse({'ok': True})


@api_view(['GET'])
@permission_classes([AllowAny])
def api_me(request):
    try:
        if not request.user.is_authenticated:
            return Response({'user': None}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'user': _user_json(request.user)})
    except Exception as e:
        from django.conf import settings
        if settings.DEBUG:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        raise


# ---------- Profile (default info for CVs/letters) ----------
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def api_profile(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        return Response({
            'full_name': profile.full_name or '',
            'email': profile.email or '',
            'phone': profile.phone or '',
            'location': profile.location or '',
            'summary': profile.summary or '',
            'references': profile.references or [],
        })
    # PATCH
    for field in ('full_name', 'email', 'phone', 'location', 'summary'):
        if field in request.data:
            setattr(profile, field, request.data.get(field, '') or '')
    if 'references' in request.data:
        refs = request.data.get('references')
        profile.references = refs if isinstance(refs, list) else []
    profile.save()
    return Response({
        'full_name': profile.full_name or '',
        'email': profile.email or '',
        'phone': profile.phone or '',
        'location': profile.location or '',
        'summary': profile.summary or '',
        'references': profile.references or [],
    })


# ---------- CV ----------
def _cv_snapshot(cv):
    return {
        'title': cv.title or '',
        'template': cv.template or 'classic',
        'full_name': cv.full_name or '',
        'email': cv.email or '',
        'phone': cv.phone or '',
        'location': cv.location or '',
        'summary': cv.summary or '',
        'experience': cv.experience or '',
        'education': cv.education or '',
        'skills': cv.skills or '',
        'experience_structured': cv.experience_structured or [],
        'education_structured': cv.education_structured or [],
        'skills_structured': cv.skills_structured or [],
        'certifications': cv.certifications or [],
        'projects': cv.projects or [],
        'languages': cv.languages or [],
        'awards': cv.awards or [],
        'references': cv.references or [],
    }


def _letter_snapshot(letter):
    return {
        'letter_type': letter.letter_type or 'cover',
        'title': letter.title or '',
        'recipient_name': letter.recipient_name or '',
        'recipient_title': letter.recipient_title or '',
        'company': letter.company or '',
        'body': letter.body or '',
        'sender_name': letter.sender_name or '',
        'sender_email': letter.sender_email or '',
        'sender_phone': letter.sender_phone or '',
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_cv_list_create(request):
    if request.method == 'GET':
        cvs = CV.objects.filter(user=request.user)
        return Response(CVSerializer(cvs, many=True, context={'request': request}).data)
    # POST
    ser = CVSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    cv = ser.save(user=request.user)
    CVRevision.objects.create(cv=cv, snapshot=_cv_snapshot(cv))
    return Response(CVSerializer(cv).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_cv_detail(request, pk):
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(CVSerializer(cv, context={'request': request}).data)
    if request.method in ('PUT', 'PATCH'):
        ser = CVSerializer(cv, data=request.data, partial=(request.method == 'PATCH'))
        ser.is_valid(raise_exception=True)
        ser.save()
        CVRevision.objects.create(cv=cv, snapshot=_cv_snapshot(cv))
        return Response(ser.data)
    cv.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_cv_duplicate(request, pk):
    """Clone an existing CV. Returns the new CV."""
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    data = CVSerializer(cv, context={'request': request}).data
    for k in ('id', 'created_at', 'updated_at', 'template_display', 'share_url', 'share_token'):
        data.pop(k, None)
    data['title'] = (data.get('title') or 'My CV') + ' (Copy)'
    ser = CVSerializer(data=data)
    ser.is_valid(raise_exception=True)
    new_cv = ser.save(user=request.user)
    return Response(CVSerializer(new_cv).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_cv_revisions(request, pk):
    """List revision history for a CV."""
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    revs = CVRevision.objects.filter(cv=cv)[:50]
    return Response([{'id': r.id, 'created_at': r.created_at} for r in revs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_cv_revert(request, pk, rev_id):
    """Revert CV to a previous revision."""
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    rev = CVRevision.objects.filter(cv=cv, pk=rev_id).first()
    if not rev:
        return Response({'error': 'Revision not found'}, status=status.HTTP_404_NOT_FOUND)
    snap = rev.snapshot
    for k, v in snap.items():
        setattr(cv, k, v)
    cv.save()
    CVRevision.objects.create(cv=cv, snapshot=_cv_snapshot(cv))
    return Response(CVSerializer(cv, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_cv_export_pdf(request, pk):
    from django.http import HttpResponse
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        buffer = build_cv_pdf(cv)
        pdf_bytes = buffer.getvalue()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    filename = f"{cv.title.replace(' ', '_')}_CV.pdf"
    resp = HttpResponse(pdf_bytes, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    resp['Content-Length'] = len(pdf_bytes)
    return resp


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_cv_export_docx(request, pk):
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    from django.http import HttpResponse
    import re
    try:
        buffer = build_cv_docx(cv)
        docx_bytes = buffer.getvalue()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    safe_name = re.sub(r'[^\w\-.]', '_', cv.title or 'CV')[:100] + '_CV.docx'
    resp = HttpResponse(docx_bytes, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    resp['Content-Disposition'] = f'attachment; filename="{safe_name}"'
    resp['Content-Length'] = len(docx_bytes)
    return resp


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_cv_share(request, pk):
    """Enable (POST) or disable (DELETE) public sharing for a CV."""
    import secrets
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'POST':
        cv.share_token = secrets.token_urlsafe(24)[:32]
        cv.save()
        return Response(CVSerializer(cv, context={'request': request}).data)
    cv.share_token = None
    cv.save()
    return Response(CVSerializer(cv, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_cv_public(request, token):
    """Public read-only view of a CV by share token."""
    cv = CV.objects.filter(share_token=token).first()
    if not cv:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
    return Response(CVSerializer(cv, context={'request': request}).data)


# ---------- Letters ----------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_letter_list_create(request):
    if request.method == 'GET':
        letters = Letter.objects.filter(user=request.user)
        return Response(LetterSerializer(letters, many=True).data)
    ser = LetterSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    letter = ser.save(user=request.user)
    LetterRevision.objects.create(letter=letter, snapshot=_letter_snapshot(letter))
    return Response(LetterSerializer(letter).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_letter_detail(request, pk):
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(LetterSerializer(letter).data)
    if request.method in ('PUT', 'PATCH'):
        ser = LetterSerializer(letter, data=request.data, partial=(request.method == 'PATCH'))
        ser.is_valid(raise_exception=True)
        ser.save()
        LetterRevision.objects.create(letter=letter, snapshot=_letter_snapshot(letter))
        return Response(ser.data)
    letter.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_letter_duplicate(request, pk):
    """Clone an existing letter. Returns the new letter."""
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    data = LetterSerializer(letter).data
    for k in ('id', 'created_at', 'updated_at', 'letter_type_display'):
        data.pop(k, None)
    data['title'] = (data.get('title') or '') + ' (Copy)'
    ser = LetterSerializer(data=data)
    ser.is_valid(raise_exception=True)
    new_letter = ser.save(user=request.user)
    return Response(LetterSerializer(new_letter).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_letter_revisions(request, pk):
    """List revision history for a letter."""
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    revs = LetterRevision.objects.filter(letter=letter)[:50]
    return Response([{'id': r.id, 'created_at': r.created_at} for r in revs])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_letter_revert(request, pk, rev_id):
    """Revert letter to a previous revision."""
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    rev = LetterRevision.objects.filter(letter=letter, pk=rev_id).first()
    if not rev:
        return Response({'error': 'Revision not found'}, status=status.HTTP_404_NOT_FOUND)
    snap = rev.snapshot
    for k, v in snap.items():
        setattr(letter, k, v)
    letter.save()
    LetterRevision.objects.create(letter=letter, snapshot=_letter_snapshot(letter))
    return Response(LetterSerializer(letter).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_letter_export_pdf(request, pk):
    from django.http import HttpResponse
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    try:
        buffer = build_letter_pdf(letter)
        pdf_bytes = buffer.getvalue()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    filename = f"{letter.get_letter_type_display().replace(' ', '_')}_{letter.pk}.pdf"
    resp = HttpResponse(pdf_bytes, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    resp['Content-Length'] = len(pdf_bytes)
    return resp


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_letter_export_docx(request, pk):
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    from django.http import HttpResponse
    import re
    try:
        buffer = build_letter_docx(letter)
        docx_bytes = buffer.getvalue()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    safe_name = re.sub(r'[^\w\-.]', '_', letter.get_letter_type_display() or 'Letter')[:80] + f'_{letter.pk}.docx'
    resp = HttpResponse(docx_bytes, content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    resp['Content-Disposition'] = f'attachment; filename="{safe_name}"'
    resp['Content-Length'] = len(docx_bytes)
    return resp


# ---------- AI ----------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_enhance(request):
    context = request.data.get('context', '')
    text = request.data.get('text', '')
    field_hint = request.data.get('field_hint', '')
    if not text:
        return Response({'error': 'text required'}, status=400)
    result = deepseek_enhance_text(context, text, field_hint)
    return Response({'enhanced': result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_suggest(request):
    text = request.data.get('text', '')
    avoid = request.data.get('avoid_repetition_of', '')
    if not text:
        return Response({'error': 'text required'}, status=400)
    result = deepseek_suggest_alternatives(text, avoid)
    return Response({'alternatives': result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_generate_letter(request):
    letter_type = request.data.get('letter_type', 'cover')
    context = request.data.get('context', {})
    result = deepseek_generate_letter_body(letter_type, context)
    return Response({'body': result})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_write_email(request):
    """Write full email (subject + body) from situation description. For right-side email assistant."""
    situation = request.data.get('situation', '') or request.data.get('prompt', '')
    if not situation.strip():
        return Response({'error': 'situation or prompt required'}, status=400)
    result = deepseek_write_email(situation.strip())
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_help(request):
    """Answer questions about the app. For left-side help chatbot."""
    question = request.data.get('question', '') or request.data.get('message', '')
    if not question.strip():
        return Response({'error': 'question required'}, status=400)
    answer = deepseek_help_answer(question.strip())
    return Response({'answer': answer or 'I could not generate an answer. Please try rephrasing.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_tailor_cv(request):
    """Tailor a CV to a job description. Accepts cv (object or id), job_description."""
    cv_data = request.data.get('cv')
    cv_id = request.data.get('cv_id')
    job_description = (request.data.get('job_description') or '').strip()
    if not job_description:
        return Response({'error': 'job_description required'}, status=400)
    if not cv_data and cv_id:
        cv = CV.objects.filter(user=request.user, pk=cv_id).first()
        if cv:
            cv_data = CVSerializer(cv).data
    if not cv_data:
        return Response({'error': 'cv or cv_id required'}, status=400)
    data = {
        k: v for k, v in cv_data.items()
        if k in ('summary', 'experience', 'education', 'skills', 'full_name',
                 'experience_structured', 'education_structured', 'skills_structured',
                 'certifications', 'projects')
    }
    result = deepseek_tailor_cv(data, job_description)
    return Response({'suggestions': result or 'Could not generate suggestions. Try again.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_tailor_letter(request):
    """Generate tailored cover letter body from CV summary + job description."""
    cv_summary = (request.data.get('cv_summary') or '').strip()
    job_description = (request.data.get('job_description') or '').strip()
    company = (request.data.get('company') or '').strip()
    recipient = (request.data.get('recipient') or '').strip()
    if not job_description:
        return Response({'error': 'job_description required'}, status=400)
    if not cv_summary:
        return Response({'error': 'cv_summary required'}, status=400)
    result = deepseek_tailor_cover_letter(cv_summary, job_description, company, recipient)
    return Response({'body': result or 'Could not generate letter. Try again.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_ai_ats(request):
    """ATS optimization: analyze CV against job description."""
    cv_data = request.data.get('cv')
    cv_id = request.data.get('cv_id')
    job_description = (request.data.get('job_description') or '').strip()
    if not job_description:
        return Response({'error': 'job_description required'}, status=400)
    if not cv_data and cv_id:
        cv = CV.objects.filter(user=request.user, pk=cv_id).first()
        if cv:
            cv_data = CVSerializer(cv).data
    if not cv_data:
        return Response({'error': 'cv or cv_id required'}, status=400)
    data = {k: v for k, v in cv_data.items() if k in (
        'summary', 'experience', 'education', 'skills',
        'experience_structured', 'education_structured', 'skills_structured',
        'certifications', 'projects', 'full_name'
    )}
    result = deepseek_ats_analyze(data, job_description)
    return Response({'report': result or 'Could not analyze. Try again.'})


# ---------- Applications ----------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def api_applications(request):
    if request.method == 'GET':
        apps = Application.objects.filter(user=request.user).select_related('cv', 'letter')
        return Response(ApplicationSerializer(apps, many=True).data)
    data = request.data.copy()
    cv_id = data.get('cv')
    letter_id = data.get('letter')
    if cv_id is not None and not CV.objects.filter(user=request.user, pk=cv_id).exists():
        data['cv'] = None
    if letter_id is not None and not Letter.objects.filter(user=request.user, pk=letter_id).exists():
        data['letter'] = None
    ser = ApplicationSerializer(data=data)
    ser.is_valid(raise_exception=True)
    app = ser.save(user=request.user)
    return Response(ApplicationSerializer(app).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def api_application_detail(request, pk):
    app = Application.objects.filter(user=request.user, pk=pk).select_related('cv', 'letter').first()
    if not app:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ApplicationSerializer(app).data)
    if request.method in ('PUT', 'PATCH'):
        ser = ApplicationSerializer(app, data=request.data, partial=(request.method == 'PATCH'))
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
    app.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------- Send by email ----------
def _send_document_email(to_email, subject, body_text, pdf_buffer, filename):
    from django.core.mail import EmailMessage
    from django.conf import settings
    msg = EmailMessage(
        subject=subject,
        body=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach(filename, pdf_buffer.getvalue(), 'application/pdf')
    msg.send()


def _compose_and_send(request):
    """Build email with optional doc attachments (CV/letter PDFs) and uploaded files. Used by compose endpoint."""
    from django.core.mail import EmailMessage
    from django.conf import settings
    import json as _json

    to_email = (request.data.get('to_email') or request.POST.get('to_email') or '').strip()
    if not to_email or '@' not in to_email:
        return 'Valid to_email required'
    subject = (request.data.get('subject') or request.POST.get('subject') or 'Message from Career Docs').strip() or 'Message from Career Docs'
    body = (request.data.get('body') or request.POST.get('body') or '').strip() or 'Please see the attached documents.'

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@careerdocs.local'
    msg = EmailMessage(
        subject=subject,
        body=body,
        from_email=from_email,
        to=[to_email],
    )

    # Attach selected docs (CVs / letters as PDFs)
    attachments_json = request.data.get('attachments') or request.POST.get('attachments') or '[]'
    try:
        attachments = _json.loads(attachments_json) if isinstance(attachments_json, str) else attachments_json
    except Exception:
        attachments = []
    for item in attachments:
        typ = (item.get('type') or item.get('doc_type') or '').lower()
        doc_id = item.get('id')
        if not doc_id:
            continue
        if typ == 'cv':
            cv = CV.objects.filter(user=request.user, pk=doc_id).first()
            if cv:
                buf = build_cv_pdf(cv)
                name = f"{(cv.title or 'CV').replace(' ', '_')}_CV.pdf"
                msg.attach(name, buf.getvalue(), 'application/pdf')
        elif typ == 'letter':
            letter = Letter.objects.filter(user=request.user, pk=doc_id).first()
            if letter:
                buf = build_letter_pdf(letter)
                name = f"{letter.get_letter_type_display().replace(' ', '_')}_{letter.pk}.pdf"
                msg.attach(name, buf.getvalue(), 'application/pdf')

    # Attach uploaded files (DRF puts them in request.data; Django uses request.FILES)
    files = list(request.FILES.getlist('files') or request.FILES.getlist('file') or [])
    if not files and hasattr(request, 'data') and request.data:
        files = list(request.data.getlist('files') or request.data.getlist('file') or [])
    for f in files:
        name = getattr(f, 'name', None) or 'attachment'
        content = f.read() if hasattr(f, 'read') else f
        ctype = getattr(f, 'content_type', None) or 'application/octet-stream'
        msg.attach(name, content, ctype)

    msg.send()
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_cv_send_email(request, pk):
    cv = CV.objects.filter(user=request.user, pk=pk).first()
    if not cv:
        return Response(status=status.HTTP_404_NOT_FOUND)
    to_email = (request.data.get('to_email') or '').strip()
    if not to_email or '@' not in to_email:
        return Response({'error': 'Valid to_email required'}, status=400)
    message = (request.data.get('message') or '').strip() or 'Please find your CV attached.'
    try:
        buffer = build_cv_pdf(cv)
        filename = f"{cv.title.replace(' ', '_')}_CV.pdf"
        _send_document_email(
            to_email,
            subject=f"Your CV: {cv.title}",
            body_text=message,
            pdf_buffer=buffer,
            filename=filename,
        )
        return Response({'ok': True, 'message': 'Email sent.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_letter_send_email(request, pk):
    letter = Letter.objects.filter(user=request.user, pk=pk).first()
    if not letter:
        return Response(status=status.HTTP_404_NOT_FOUND)
    to_email = (request.data.get('to_email') or '').strip()
    if not to_email or '@' not in to_email:
        return Response({'error': 'Valid to_email required'}, status=400)
    message = (request.data.get('message') or '').strip() or 'Please find the letter attached.'
    try:
        buffer = build_letter_pdf(letter)
        filename = f"{letter.get_letter_type_display().replace(' ', '_')}_{letter.pk}.pdf"
        _send_document_email(
            to_email,
            subject=f"{letter.get_letter_type_display()}: {letter.title or 'Letter'}",
            body_text=message,
            pdf_buffer=buffer,
            filename=filename,
        )
        return Response({'ok': True, 'message': 'Email sent.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_compose_email(request):
    """
    Compose and send one email: to_email, subject, body, optional attachments (JSON array of {type, id}),
    optional file uploads (multipart key 'files' or 'file').
    """
    try:
        err = _compose_and_send(request)
        if err:
            return Response({'error': err}, status=400)
        return Response({'ok': True, 'message': 'Email sent.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
