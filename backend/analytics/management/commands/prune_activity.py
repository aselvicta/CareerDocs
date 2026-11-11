from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from analytics.models import ActivityEvent


class Command(BaseCommand):
    help = 'Delete activity events older than N days (default 365) to keep the table small.'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=365)

    def handle(self, days, **opts):
        cutoff = timezone.now() - timedelta(days=days)
        deleted, _ = ActivityEvent.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} events older than {days} days.'))
