# PawRise Backend

Flask and SQLite backend for the PawRise Milestone 2 capstone project.

## Current Foundation

- Flask application factory
- Flask-SQLAlchemy database integration
- Flask-Migrate migration support
- JWT and CORS extensions
- Five relational database models
- SQLite foreign-key enforcement
- Database initialization command
- Health-check API
- JWT registration, login, and current-user APIs
- Authenticated pet create, read, update, and delete APIs
- Care-reminder CRUD, filtering, completion, history, and recurrence APIs
- Memory CRUD and timeline filtering APIs
- Notification-settings read and update APIs
- Read-only Dashboard aggregation API
- Per-user resource isolation and pet-input validation
- pytest schema and health-check tests

## Local Setup

From the `backend` directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and replace the development secret values.

Initialize the local SQLite database:

```powershell
flask --app run.py init-db
```

Run the API:

```powershell
python run.py
```

The health endpoint is:

```text
GET http://127.0.0.1:5000/api/health
```

Implemented core endpoints:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/pets
GET    /api/pets
GET    /api/pets/{pet_id}
PUT    /api/pets/{pet_id}
DELETE /api/pets/{pet_id}
POST   /api/reminders
GET    /api/reminders
PUT    /api/reminders/{reminder_id}
DELETE /api/reminders/{reminder_id}
POST   /api/reminders/{reminder_id}/complete
GET    /api/reminders/history
POST   /api/memories
GET    /api/memories
PUT    /api/memories/{memory_id}
DELETE /api/memories/{memory_id}
GET    /api/settings
PUT    /api/settings
GET    /api/dashboard
```

## Run Tests

```powershell
pytest
```

Tests use a separate in-memory SQLite database and do not modify the local development database.
