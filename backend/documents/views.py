import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST

from .models import CV, Letter
from .forms import CVForm, LetterForm
from .services.deepseek import (
    deepseek_enhance_text,
    deepseek_suggest_alternatives,
    deepseek_generate_letter_body,
)
from .services.export_pdf import build_cv_pdf, build_letter_pdf
from .services.export_docx import build_cv_docx, build_letter_docx


def home(request):
    if request.user.is_authenticated:
        return redirect('documents:dashboard')
    return redirect('login')


@login_required
def dashboard(request):
    cvs = CV.objects.filter(user=request.user)[:10]
    letters = Letter.objects.filter(user=request.user)[:10]
    return render(request, 'documents/dashboard.html', {'cvs': cvs, 'letters': letters})


# ---------- CV ----------
@login_required
def cv_list(request):
    cvs = CV.objects.filter(user=request.user)
    return render(request, 'documents/cv_list.html', {'cvs': cvs})


@login_required
def cv_create(request):
    if request.method == 'POST':
        form = CVForm(request.POST)
        if form.is_valid():
            cv = form.save(commit=False)
            cv.user = request.user
            cv.save()
            return redirect('documents:cv_detail', pk=cv.pk)
    else:
        form = CVForm(initial={'email': getattr(request.user, 'email', '')})
    return render(request, 'documents/cv_form.html', {'form': form, 'is_edit': False})


@login_required
def cv_edit(request, pk):
    cv = get_object_or_404(CV, pk=pk, user=request.user)
    if request.method == 'POST':
        form = CVForm(request.POST, instance=cv)
        if form.is_valid():
            form.save()
            return redirect('documents:cv_detail', pk=pk)
    else:
        form = CVForm(instance=cv)
    return render(request, 'documents/cv_form.html', {'form': form, 'cv': cv, 'is_edit': True})


@login_required
def cv_detail(request, pk):
    cv = get_object_or_404(CV, pk=pk, user=request.user)
    return render(request, 'documents/cv_detail.html', {'cv': cv, 'templates': dict(CV.TEMPLATE_CHOICES)})


@login_required
def cv_delete(request, pk):
    cv = get_object_or_404(CV, pk=pk, user=request.user)
    if request.method == 'POST':
        cv.delete()
        return redirect('documents:cv_list')
    return render(request, 'documents/cv_confirm_delete.html', {'cv': cv})


@login_required
def cv_export_pdf(request, pk):
    cv = get_object_or_404(CV, pk=pk, user=request.user)
    buffer = build_cv_pdf(cv)
    filename = f"{cv.title.replace(' ', '_')}_CV.pdf"
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@login_required
def cv_export_docx(request, pk):
    cv = get_object_or_404(CV, pk=pk, user=request.user)
    buffer = build_cv_docx(cv)
    filename = f"{cv.title.replace(' ', '_')}_CV.docx"
    response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ---------- Letters ----------
@login_required
def letter_list(request):
    letters = Letter.objects.filter(user=request.user)
    return render(request, 'documents/letter_list.html', {'letters': letters})


@login_required
def letter_create(request):
    if request.method == 'POST':
        form = LetterForm(request.POST)
        if form.is_valid():
            letter = form.save(commit=False)
            letter.user = request.user
            letter.save()
            return redirect('documents:letter_detail', pk=letter.pk)
    else:
        form = LetterForm(initial={
            'sender_email': getattr(request.user, 'email', ''),
            'sender_name': getattr(request.user, 'username', ''),
        })
    return render(request, 'documents/letter_form.html', {'form': form, 'is_edit': False})


@login_required
def letter_edit(request, pk):
    letter = get_object_or_404(Letter, pk=pk, user=request.user)
    if request.method == 'POST':
        form = LetterForm(request.POST, instance=letter)
        if form.is_valid():
            form.save()
            return redirect('documents:letter_detail', pk=pk)
    else:
        form = LetterForm(instance=letter)
    return render(request, 'documents/letter_form.html', {'form': form, 'letter': letter, 'is_edit': True})


@login_required
def letter_detail(request, pk):
    letter = get_object_or_404(Letter, pk=pk, user=request.user)
    return render(request, 'documents/letter_detail.html', {'letter': letter})


@login_required
def letter_delete(request, pk):
    letter = get_object_or_404(Letter, pk=pk, user=request.user)
    if request.method == 'POST':
        letter.delete()
        return redirect('documents:letter_list')
    return render(request, 'documents/letter_confirm_delete.html', {'letter': letter})


@login_required
def letter_export_pdf(request, pk):
    letter = get_object_or_404(Letter, pk=pk, user=request.user)
    buffer = build_letter_pdf(letter)
    filename = f"{letter.get_letter_type_display().replace(' ', '_')}_{letter.pk}.pdf"
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@login_required
def letter_export_docx(request, pk):
    letter = get_object_or_404(Letter, pk=pk, user=request.user)
    buffer = build_letter_docx(letter)
    filename = f"{letter.get_letter_type_display().replace(' ', '_')}_{letter.pk}.docx"
    response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


# ---------- AI API (JSON) ----------
@login_required
@require_POST
def api_enhance(request):
    """POST: context, text, field_hint -> enhanced text."""
    try:
        data = json.loads(request.body) if request.body else {}
        context = data.get('context', '')
        text = data.get('text', '')
        field_hint = data.get('field_hint', '')
        if not text:
            return JsonResponse({'error': 'text required'}, status=400)
        result = deepseek_enhance_text(context, text, field_hint)
        return JsonResponse({'enhanced': result})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_POST
def api_suggest_alternatives(request):
    """POST: text, avoid_repetition_of -> alternatives (plain text, one per line)."""
    try:
        data = json.loads(request.body) if request.body else {}
        text = data.get('text', '')
        avoid = data.get('avoid_repetition_of', '')
        if not text:
            return JsonResponse({'error': 'text required'}, status=400)
        result = deepseek_suggest_alternatives(text, avoid)
        return JsonResponse({'alternatives': result})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_POST
def api_generate_letter_body(request):
    """POST: letter_type, context (dict) -> body text."""
    try:
        data = json.loads(request.body) if request.body else {}
        letter_type = data.get('letter_type', 'cover')
        context = data.get('context', {})
        result = deepseek_generate_letter_body(letter_type, context)
        return JsonResponse({'body': result})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
