from rest_framework import serializers
import re

from .catalog import DENSITIES, FONTS, SECTION_KEYS
from .models import CV, Letter, Application

_HEX = re.compile(r'^#[0-9a-fA-F]{6}$')
_PHOTO = re.compile(r'^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')
MAX_PHOTO_CHARS = 400_000  # ~300 KB image; the client compresses to ~30 KB


def clean_design(value):
    """Keep only known design keys with valid values; ignore anything else."""
    if value in (None, ''):
        return {}
    if not isinstance(value, dict):
        raise serializers.ValidationError('design must be an object.')
    out = {}
    accent = value.get('accent')
    if accent:
        if not isinstance(accent, str) or not _HEX.match(accent):
            raise serializers.ValidationError('design.accent must be a hex colour like #1d4ed8.')
        out['accent'] = accent.lower()
    if value.get('font') in FONTS:
        out['font'] = value['font']
    if value.get('density') in DENSITIES:
        out['density'] = value['density']
    if isinstance(value.get('show_photo'), bool):
        out['show_photo'] = value['show_photo']
    for key in ('section_order', 'hidden'):
        items = value.get(key)
        if isinstance(items, list):
            out[key] = [k for k in dict.fromkeys(items) if k in SECTION_KEYS]
    return out


class DesignMixin:
    def validate_design(self, value):
        return clean_design(value)


class CVSerializer(DesignMixin, serializers.ModelSerializer):
    template_display = serializers.CharField(source='get_template_display', read_only=True)
    share_url = serializers.SerializerMethodField()

    def get_share_url(self, obj):
        if obj.share_token:
            from django.conf import settings
            base = getattr(settings, 'FRONTEND_URL', '') or 'http://localhost:5173'
            return f"{base.rstrip('/')}/view/cv/{obj.share_token}"
        return None

    def validate_photo(self, value):
        value = (value or '').strip()
        if not value:
            return ''
        if len(value) > MAX_PHOTO_CHARS or not _PHOTO.match(value):
            raise serializers.ValidationError('Photo must be a JPEG, PNG or WebP image under 300 KB.')
        return value

    def validate_links(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('links must be a list.')
        out = []
        for item in value[:6]:
            if isinstance(item, dict) and (item.get('url') or '').strip():
                out.append({'label': str(item.get('label') or '')[:40], 'url': str(item['url']).strip()[:300]})
        return out

    class Meta:
        model = CV
        fields = [
            'id', 'title', 'template', 'template_display', 'design', 'photo', 'headline', 'links',
            'full_name', 'email', 'phone', 'location', 'summary',
            'experience', 'education', 'skills',
            'experience_structured', 'education_structured', 'skills_structured',
            'certifications', 'projects', 'languages', 'awards', 'references',
            'share_token', 'share_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'share_token']


class ApplicationSerializer(serializers.ModelSerializer):
    cv_title = serializers.SerializerMethodField()
    letter_title = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_cv_title(self, obj):
        return obj.cv.title if obj.cv else None

    def get_letter_title(self, obj):
        return obj.letter.title if obj.letter else None

    class Meta:
        model = Application
        fields = [
            'id', 'job_title', 'company', 'job_url', 'deadline', 'status', 'status_display',
            'cv', 'cv_title', 'letter', 'letter_title', 'notes',
            'email_sent_at', 'email_sent_from', 'email_sent_to', 'email_subject', 'gmail_thread_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'email_sent_at', 'email_sent_from', 'email_sent_to',
                            'email_subject', 'gmail_thread_id']


class LetterSerializer(DesignMixin, serializers.ModelSerializer):
    letter_type_display = serializers.CharField(source='get_letter_type_display', read_only=True)

    class Meta:
        model = Letter
        fields = [
            'id', 'letter_type', 'letter_type_display', 'title', 'template', 'design',
            'recipient_name', 'recipient_title', 'company', 'body',
            'sender_name', 'sender_email', 'sender_phone', 'sender_location', 'sender_headline',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


# ---- Lightweight list serializers: only what list pages / pickers display ----
class CVListSerializer(serializers.ModelSerializer):
    template_display = serializers.CharField(source='get_template_display', read_only=True)
    shared = serializers.SerializerMethodField()

    def get_shared(self, obj):
        return bool(obj.share_token)

    class Meta:
        model = CV
        fields = ['id', 'title', 'template', 'template_display', 'design', 'full_name', 'headline', 'shared', 'created_at', 'updated_at']
        read_only_fields = fields

    LIST_ONLY = ('id', 'title', 'template', 'design', 'headline', 'full_name', 'share_token', 'created_at', 'updated_at', 'user_id')


class LetterListSerializer(serializers.ModelSerializer):
    letter_type_display = serializers.CharField(source='get_letter_type_display', read_only=True)

    class Meta:
        model = Letter
        fields = ['id', 'letter_type', 'letter_type_display', 'title', 'template', 'recipient_name', 'company', 'created_at', 'updated_at']
        read_only_fields = fields

    LIST_ONLY = ('id', 'letter_type', 'title', 'template', 'recipient_name', 'company', 'created_at', 'updated_at', 'user_id')


class CVPreviewSerializer(CVSerializer):
    """Full CV content for thumbnails, without the photo."""
    class Meta(CVSerializer.Meta):
        fields = [f for f in CVSerializer.Meta.fields if f != 'photo']
