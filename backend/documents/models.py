from django.db import models
from django.conf import settings


class CV(models.Model):
    """Stored CV / resume created by the user."""
    TEMPLATE_CHOICES = [
        ('classic', 'Classic'),
        ('modern', 'Modern'),
        ('minimal', 'Minimal'),
        ('professional', 'Professional'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cvs')
    title = models.CharField(max_length=200, default='My CV')
    template = models.CharField(max_length=20, choices=TEMPLATE_CHOICES, default='classic')
    # Contact
    full_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    location = models.CharField(max_length=200, blank=True)
    summary = models.TextField(blank=True)
    # Legacy plain text (fallback when structured is empty)
    experience = models.TextField(blank=True)
    education = models.TextField(blank=True)
    skills = models.TextField(blank=True)
    # Structured sections (JSON arrays)
    experience_structured = models.JSONField(default=list, blank=True)  # [{role, company, location, start_date, end_date, current, bullets}]
    education_structured = models.JSONField(default=list, blank=True)   # [{degree, institution, location, start_date, end_date, honors}]
    skills_structured = models.JSONField(default=list, blank=True)     # [{category, items}]
    # Additional sections
    certifications = models.JSONField(default=list, blank=True)        # [{name, issuer, date, url}]
    projects = models.JSONField(default=list, blank=True)              # [{name, description, tech, url}]
    languages = models.JSONField(default=list, blank=True)               # [{language, proficiency}]
    awards = models.JSONField(default=list, blank=True)                # [{name, issuer, date, description}]
    references = models.JSONField(default=list, blank=True)            # [{name, title, company, email, phone}]
    # Share
    share_token = models.CharField(max_length=32, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'CV'
        verbose_name_plural = 'CVs'


class CVRevision(models.Model):
    """Snapshot of a CV at a point in time."""
    cv = models.ForeignKey(CV, on_delete=models.CASCADE, related_name='revisions')
    snapshot = models.JSONField()  # all CV fields for revert
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'CV Revision'
        verbose_name_plural = 'CV Revisions'


class Application(models.Model):
    """Job application tracking: company, role, status, linked CV/letter."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('applied', 'Applied'),
        ('interview', 'Interview'),
        ('offer', 'Offer'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
    job_title = models.CharField(max_length=200)
    company = models.CharField(max_length=200, blank=True)
    job_url = models.URLField(blank=True)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    cv = models.ForeignKey(CV, on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    letter = models.ForeignKey('Letter', on_delete=models.SET_NULL, null=True, blank=True, related_name='applications')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'


class Letter(models.Model):
    """Professional letters: cover, internship, job app, recommendation, resignation."""
    LETTER_TYPE_CHOICES = [
        ('cover', 'Cover Letter'),
        ('internship', 'Internship Application'),
        ('job_application', 'Job Application Letter'),
        ('recommendation', 'Recommendation Letter'),
        ('resignation', 'Resignation Letter'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='letters')
    letter_type = models.CharField(max_length=20, choices=LETTER_TYPE_CHOICES)
    title = models.CharField(max_length=200, default='')
    # Content
    recipient_name = models.CharField(max_length=200, blank=True)
    recipient_title = models.CharField(max_length=200, blank=True)
    company = models.CharField(max_length=200, blank=True)
    body = models.TextField(help_text='Main letter content')
    # Sender
    sender_name = models.CharField(max_length=200, blank=True)
    sender_email = models.EmailField(blank=True)
    sender_phone = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Letter'
        verbose_name_plural = 'Letters'


class LetterRevision(models.Model):
    """Snapshot of a Letter at a point in time."""
    letter = models.ForeignKey(Letter, on_delete=models.CASCADE, related_name='revisions')
    snapshot = models.JSONField(help_text='letter_type, title, recipient_*, company, body, sender_*')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Letter Revision'
        verbose_name_plural = 'Letter Revisions'
