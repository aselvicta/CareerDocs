#!/usr/bin/env bash
# Render runtime: DATABASE_URL is available here — apply migrations to Postgres, then serve.
set -o errexit

python manage.py migrate --noinput
exec gunicorn docs_generator.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
