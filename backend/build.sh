#!/usr/bin/env bash
# Render (and similar) build script — run from repo root with Root Directory: backend
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
# Do not migrate here — on Render, DATABASE_URL is often unset during build (migrations
# would hit SQLite in the builder). Migrations run in start.sh at runtime.
