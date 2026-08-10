#!/bin/sh
set -eu

mkdir -p "${PAWRISE_DATA_DIR:-/home/data}/uploads"
mkdir -p "${PAWRISE_DATA_DIR:-/home/data}/medical_records"
cd backend
flask --app run.py init-db
exec gunicorn --bind=0.0.0.0:8000 --timeout 120 --access-logfile=- --error-logfile=- run:app
