from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    # CV
    path('cv/', views.cv_list, name='cv_list'),
    path('cv/new/', views.cv_create, name='cv_create'),
    path('cv/<int:pk>/', views.cv_detail, name='cv_detail'),
    path('cv/<int:pk>/edit/', views.cv_edit, name='cv_edit'),
    path('cv/<int:pk>/delete/', views.cv_delete, name='cv_delete'),
    path('cv/<int:pk>/export/pdf/', views.cv_export_pdf, name='cv_export_pdf'),
    path('cv/<int:pk>/export/docx/', views.cv_export_docx, name='cv_export_docx'),
    # Letters
    path('letters/', views.letter_list, name='letter_list'),
    path('letters/new/', views.letter_create, name='letter_create'),
    path('letters/<int:pk>/', views.letter_detail, name='letter_detail'),
    path('letters/<int:pk>/edit/', views.letter_edit, name='letter_edit'),
    path('letters/<int:pk>/delete/', views.letter_delete, name='letter_delete'),
    path('letters/<int:pk>/export/pdf/', views.letter_export_pdf, name='letter_export_pdf'),
    path('letters/<int:pk>/export/docx/', views.letter_export_docx, name='letter_export_docx'),
    # AI API
    path('api/enhance/', views.api_enhance, name='api_enhance'),
    path('api/suggest-alternatives/', views.api_suggest_alternatives, name='api_suggest_alternatives'),
    path('api/generate-letter-body/', views.api_generate_letter_body, name='api_generate_letter_body'),
]
