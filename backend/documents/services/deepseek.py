"""
DeepSeek API integration for AI-enhanced content and wording suggestions.
Uses env var docs_generator_api_key (DOCS_GENERATOR_API_KEY in settings).
"""
import json
import logging
import re
import urllib.request
import urllib.error

from django.conf import settings

logger = logging.getLogger(__name__)
DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'


def _strip_markdown(text: str) -> str:
    """Remove common markdown formatting (**, *, #) for cleaner plain-text display."""
    if not text:
        return text
    # **bold** or *italic* -> keep inner text
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    # # headers -> remove leading hashes and extra spaces
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    # * bullet at line start -> convert to hyphen
    text = re.sub(r'^\*\s+', '- ', text, flags=re.MULTILINE)
    # Numbered lists like "1. " at start -> keep as is (clean)
    return text.strip()


def _call_deepseek(system_prompt: str, user_content: str, max_tokens: int = 1500) -> str:
    """Call DeepSeek chat completions. Returns assistant message content or empty string on error."""
    api_key = getattr(settings, 'DOCS_GENERATOR_API_KEY', None) or ''
    if not api_key:
        logger.warning('DOCS_GENERATOR_API_KEY not set; skipping AI call')
        return ''

    payload = {
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_content},
        ],
        'max_tokens': max_tokens,
        'temperature': 0.7,
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        DEEPSEEK_URL,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
            return (result.get('choices') or [{}])[0].get('message', {}).get('content', '').strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ''
        logger.exception('DeepSeek API HTTP error %s: %s', e.code, body)
        return ''
    except Exception as e:
        logger.exception('DeepSeek API error: %s', e)
        return ''


def deepseek_enhance_text(context: str, current_text: str, field_hint: str = '') -> str:
    """
    Ask DeepSeek to improve/professionalize the given text.
    context: e.g. "CV summary for a software engineer"
    current_text: existing text to enhance
    field_hint: e.g. "summary", "experience"
    """
    system_prompt = (
        'You are a professional career documents editor. Improve the given text to be '
        'clear, professional, and impactful. Keep the same length roughly. Output only the '
        'improved text, no explanations or quotes.'
    )
    user_content = f"Context: {context}\n"
    if field_hint:
        user_content += f"Field: {field_hint}\n"
    user_content += f"Current text:\n{current_text}"
    return _call_deepseek(system_prompt, user_content, max_tokens=800)


def deepseek_suggest_alternatives(paragraph_or_sentence: str, avoid_repetition_of: str = '') -> str:
    """
    Get alternative phrasings to avoid repetitive wording.
    avoid_repetition_of: optional hint (e.g. previous sentence) to diversify from.
    Returns a few alternative versions, one per line or as a short list.
    """
    system_prompt = (
        'You are a professional writer. Given a sentence or short paragraph, suggest 2–3 '
        'alternative phrasings that keep the same meaning but use different words and structure. '
        'If a "avoid similar to" text is provided, make alternatives clearly different from it. '
        'Output only the alternatives, one per line, no numbering or labels.'
    )
    user_content = f"Text to rephrase:\n{paragraph_or_sentence}\n"
    if avoid_repetition_of:
        user_content += f"Avoid sounding like this:\n{avoid_repetition_of}\n"
    return _call_deepseek(system_prompt, user_content, max_tokens=500)


def deepseek_generate_letter_body(letter_type: str, context: dict) -> str:
    """
    Generate letter body from context (recipient, company, role, sender info, etc.).
    context: dict with keys like recipient_name, company, role, sender_name, experience_summary, etc.
    """
    system_prompt = (
        f'You are a professional writer. Write a professional {letter_type.replace("_", " ")} '
        'letter body (3–5 short paragraphs). Be concise and impactful. Output only the letter body, '
        'no subject line or salutation.'
    )
    user_content = 'Context:\n' + json.dumps(context, indent=2)
    return _call_deepseek(system_prompt, user_content, max_tokens=800)


def deepseek_write_email(situation: str) -> dict:
    """
    Write a full email (subject + body) based on the user's situation description.
    Returns {"subject": "...", "body": "..."}.
    """
    system_prompt = (
        'You are a professional email writer. Given a situation description, write a complete email. '
        'Reply with exactly two lines: first line is the subject (prefix with "Subject: "), '
        'second line is a blank line, then the email body. No other text. Use plain text only.'
    )
    out = _call_deepseek(system_prompt, situation, max_tokens=800)
    subject, body = '', out
    if 'Subject:' in out:
        parts = out.split('\n', 1)
        first = parts[0].strip()
        if first.lower().startswith('subject:'):
            subject = first[8:].strip()
        body = parts[1].strip() if len(parts) > 1 else ''
    return {'subject': subject or 'Email', 'body': body or out}


def deepseek_tailor_cv(cv_data: dict, job_description: str) -> str:
    """
    Suggest changes to tailor a CV to a job description.
    cv_data: dict with summary, experience, education, skills
    Returns short, plain-text suggestions.
    """
    system_prompt = (
        'You are a career coach. Given a CV and job description, suggest 3–5 specific improvements to tailor the CV. '
        'Be brief: one short paragraph or a few bullet points. Focus on the top changes only (summary tweaks, skills to add, '
        'keywords to include). '
        'CRITICAL: Output plain text only. No markdown whatsoever—no asterisks (** or *), no hashtags (#), no bold/italic. '
        'Use simple line breaks and hyphens for lists. Write like natural prose.'
    )
    user_content = f"Job description:\n{job_description}\n\n---\n\nCV content:\n{json.dumps(cv_data, indent=2)}"
    out = _call_deepseek(system_prompt, user_content, max_tokens=600)
    return _strip_markdown(out)


def deepseek_tailor_cover_letter(cv_summary: str, job_description: str, company: str = '', recipient: str = '') -> str:
    """
    Generate a tailored cover letter body from CV summary + job description.
    """
    system_prompt = (
        'You are a professional cover letter writer. Write a compelling cover letter body (3–4 paragraphs) '
        'that connects the candidate\'s background (from CV summary) to the job requirements. '
        'Be specific about relevant skills and experience. Do not include salutation or sign-off. Output only the letter body.'
    )
    parts = [f"CV Summary:\n{cv_summary}", f"Job Description:\n{job_description}"]
    if company:
        parts.append(f"Company: {company}")
    if recipient:
        parts.append(f"Recipient: {recipient}")
    user_content = '\n\n'.join(parts)
    return _call_deepseek(system_prompt, user_content, max_tokens=800)


def deepseek_ats_analyze(cv_data: dict, job_description: str) -> str:
    """
    Analyze CV against job description for ATS compatibility.
    Returns short, plain-text report.
    """
    system_prompt = (
        'You are an ATS expert. Briefly analyze how well a CV matches a job description. '
        'Give: (1) A score out of 10 in one short sentence. (2) 2–3 missing keywords. '
        '(3) 2–3 quick structure tips. (4) 2–4 actionable improvements. '
        'Keep total output under 150 words. '
        'CRITICAL: Plain text only. No markdown—no asterisks (** or *), no hashtags (#), no bold/italic. '
        'Use simple line breaks and hyphens for lists. Write like natural prose.'
    )
    user_content = f"Job Description:\n{job_description}\n\n---\n\nCV Content:\n{json.dumps(cv_data, indent=2)}"
    out = _call_deepseek(system_prompt, user_content, max_tokens=500)
    return _strip_markdown(out)


def deepseek_help_answer(question: str) -> str:
    """
    Answer user questions about the Career Docs Generator app.
    """
    system_prompt = '''You are a helpful assistant for "Career Docs Generator", a web app where users can:
- Create and edit CVs (resumes) with multiple templates (Classic, Modern, Minimal, Professional)
- Create and edit professional letters: Cover Letter, Internship Application, Job Application, Recommendation Letter, Resignation Letter
- Use AI to enhance CV sections (summary, experience, education, skills) and to generate or improve letter text
- Export documents as PDF or Word (.docx)
- Compose and send emails with attachments (CVs, letters, or uploaded files from device)
- Use an AI email assistant to draft full emails from a situation description

Give clear, short, step-by-step answers. Be concise. If the user asks how to do something, list the steps.'''
    return _call_deepseek(system_prompt, question, max_tokens=500)
