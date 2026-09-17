# PawRise Backend

The PawRise backend is a Flask REST API for authentication, pet-care planning, medical-record processing, memories, Community interactions, account settings, uploads, and dashboard aggregation.

For the complete project overview, see the [root README](../README.md). The deployed application is available at [PawRise Production](https://pawrise-sylvia-20260810-htdvc8eng5bbdscc.canadacentral-01.azurewebsites.net/).

## Technology

- Python 3.12 and Flask
- Flask-SQLAlchemy and SQLite
- Flask-Migrate with safe additive SQLite upgrades
- Flask-JWT-Extended authentication
- Flask-CORS for separate-origin local development
- pypdf and OpenAI-assisted medical extraction
- Gunicorn for Azure App Service
- pytest with an isolated in-memory database

## Local Setup

From `pawrise/backend`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
flask --app run.py init-db
python run.py
```

The API runs at `http://127.0.0.1:5000`. Check the application and database connection with:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

The standard frontend uses relative `/api` requests. During local development, Vite proxies those requests to Flask.

## Configuration

| Variable | Purpose |
|---|---|
| `JWT_SECRET_KEY` | Signs JWT access tokens. Replace the example value. |
| `FRONTEND_ORIGINS` | Comma-separated CORS origins for separate-origin development. |
| `FLASK_DEBUG` | Enables local development diagnostics. |
| `OPENAI_API_KEY` | Optional key for AI-assisted image record extraction. |
| `OPENAI_MEDICAL_MODEL` | Model used for structured medical extraction. |
| `PAWRISE_DATA_DIR` | Production database, upload, and medical-record storage root. |

Do not commit `.env`, local databases, uploaded user files, or real credentials.

## API Areas

All application routes use the `/api` prefix.

| Prefix | Responsibility |
|---|---|
| `/api/health` | API and database health |
| `/api/auth` | Registration, login, and account profile |
| `/api/pets` | Pet profile CRUD |
| `/api/reminders` | Care planning, completion, recurrence, and history |
| `/api/medical-records` | Upload, extraction drafts, confirmation, and linked reminders |
| `/api/memories` | Private memory timeline CRUD |
| `/api/community` | Posts, likes, reports, blocks, and moderation |
| `/api/settings` | Notification preferences |
| `/api/dashboard` | Aggregated home data |
| `/api/uploads` | Authenticated image upload and delivery |

Protected endpoints require `Authorization: Bearer <access-token>`. Queries are scoped to the authenticated user, and uploaded medical information never creates reminders until the user confirms the extracted draft.

See [API Documentation](../support/API_DOCUMENTATION.md) for request and response details.

## Database

The local database is created at `backend/instance/pawrise.db`. The initialization command creates missing tables and applies narrow additive upgrades without intentionally deleting existing data:

```powershell
flask --app run.py init-db
```

The schema covers users, settings, pets, reminders, medical records, memories, Community posts, likes, reports, and blocks. See [Database Design](../support/DATABASE_DESIGN.md).

## Tests

```powershell
.venv\Scripts\python.exe -m pytest
```

The recorded validation run passed all **112 backend tests**. Tests use a separate in-memory SQLite database and do not modify local development data. See [Test Results](../support/TEST_RESULTS.md).
