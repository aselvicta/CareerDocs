#!/usr/bin/env bash
# Render (and similar) build script — run from repo root with Root Directory: backend
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
