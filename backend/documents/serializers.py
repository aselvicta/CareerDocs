from rest_framework import serializers
from .models import CV, Letter, Application


class CVSerializer(serializers.ModelSerializer):
    template_display = serializers.CharField(source='get_template_display', read_only=True)
    share_url = serializers.SerializerMethodField()

    def get_share_url(self, obj):
        if obj.share_token:
            from django.conf import settings
            base = getattr(settings, 'FRONTEND_URL', '') or 'http://localhost:5173'
            return f"{base.rstrip('/')}/view/cv/{obj.share_token}"
        return None

    class Meta:
        model = CV
        fields = [
            'id', 'title', 'template', 'template_display',
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
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class LetterSerializer(serializers.ModelSerializer):
    letter_type_display = serializers.CharField(source='get_letter_type_display', read_only=True)

    class Meta:
        model = Letter
        fields = [
            'id', 'letter_type', 'letter_type_display', 'title',
            'recipient_name', 'recipient_title', 'company', 'body',
            'sender_name', 'sender_email', 'sender_phone',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
