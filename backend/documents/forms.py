from django import forms
from .models import CV, Letter


class CVForm(forms.ModelForm):
    class Meta:
        model = CV
        fields = [
            'title', 'template', 'full_name', 'email', 'phone', 'location',
            'summary', 'experience', 'education', 'skills',
        ]
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Software Engineer CV'}),
            'template': forms.Select(attrs={'class': 'form-control'}),
            'full_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'location': forms.TextInput(attrs={'class': 'form-control'}),
            'summary': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'experience': forms.Textarea(attrs={'class': 'form-control', 'rows': 6, 'placeholder': 'One entry per line or use bullet points'}),
            'education': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'skills': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Comma-separated or one per line'}),
        }


class LetterForm(forms.ModelForm):
    class Meta:
        model = Letter
        fields = [
            'letter_type', 'title', 'recipient_name', 'recipient_title', 'company',
            'body', 'sender_name', 'sender_email', 'sender_phone',
        ]
        widgets = {
            'letter_type': forms.Select(attrs={'class': 'form-control'}),
            'title': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'e.g. Application for Backend Developer'}),
            'recipient_name': forms.TextInput(attrs={'class': 'form-control'}),
            'recipient_title': forms.TextInput(attrs={'class': 'form-control'}),
            'company': forms.TextInput(attrs={'class': 'form-control'}),
            'body': forms.Textarea(attrs={'class': 'form-control', 'rows': 12}),
            'sender_name': forms.TextInput(attrs={'class': 'form-control'}),
            'sender_email': forms.EmailInput(attrs={'class': 'form-control'}),
            'sender_phone': forms.TextInput(attrs={'class': 'form-control'}),
        }
