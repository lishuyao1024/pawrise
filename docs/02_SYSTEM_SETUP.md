# System Setup Instructions

[Back to Documentation Home](README.md)

## 1. Purpose

This document explains how to set up the PawRise frontend, backend, and database from a new development environment. It also covers configuration, production builds, deployment, and setup validation.

## 2. Prerequisites

Install the following software before beginning:

| Requirement | Version | Purpose |
|---|---:|---|
| Windows | 10 or 11 | Local development operating system |
| Git | Latest stable version | Clone and manage the repository |
| Python | 3.12 | Run the Flask backend |
| Node.js | 24.18.0 | Run and build the frontend |
| pnpm | 11.19.0 | Install frontend packages |
| Modern browser | Latest Chrome, Edge, or Firefox | Access and test the application |

Verify the installations:

```powershell
git --version
python --version
node --version
pnpm --version
```

For production deployment, the project uses:

- Azure App Service
- Persistent Azure App Service storage under `/home`
- Gunicorn
- OpenAI API for AI-assisted medical-record extraction

An OpenAI API key is optional for local development. Text records can use local fallback extraction, but AI image extraction requires a valid key.

## 3. Clone the Repository

Open PowerShell and run:

```powershell
git clone https://github.com/lishuyao1024/pawrise.git
cd pawrise
```

The main project structure is:

```text
pawrise/
├── backend/
├── frontend/
├── docs/
├── requirements.txt
├── startup.sh
└── README.md
```

## 4. Backend Setup

### 4.1 Create a Python Virtual Environment

From the project root:

```powershell
cd backend
python -m venv .venv
```

Activate the environment:

```powershell
.venv\Scripts\Activate.ps1
```

If activation succeeds, the PowerShell prompt displays `(.venv)`.

### 4.2 Install Backend Packages

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The backend uses:

- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-JWT-Extended
- Flask-CORS
- Gunicorn
- pytest
- pypdf
- OpenAI Python SDK

### 4.3 Create the Backend Configuration File

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and configure it:

```text
FLASK_DEBUG=true
JWT_SECRET_KEY=replace-with-a-long-random-development-secret
FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
OPENAI_API_KEY=replace-with-your-openai-api-key
OPENAI_MEDICAL_MODEL=gpt-5-nano
```

Replace `JWT_SECRET_KEY` with a long random value.

If OpenAI extraction is not required, leave `OPENAI_API_KEY` unset or remove its example value.

Do not commit `.env` to Git.

## 5. Database Setup

PawRise uses SQLite for local development.

From the `backend` directory, initialize the database:

```powershell
flask --app run.py init-db
```

The database is created at:

```text
backend/instance/pawrise.db
```

The command creates missing tables and applies safe additive schema updates. Running it again does not intentionally delete existing application data.

The database stores:

- Users
- User settings
- Pets
- Care reminders
- Memories
- Medical records
- Community posts, likes, reports, and blocks

The `backend/instance/` directory and database file are excluded from Git.

### Database Validation

Start the backend:

```powershell
python run.py
```

In another PowerShell window, run:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

A successful response contains:

```text
success  : True
message  : PawRise API is running.
database : connected
```

## 6. Start the Backend

From the `backend` directory with the virtual environment active:

```powershell
python run.py
```

The backend runs at:

```text
http://127.0.0.1:5000
```

The health endpoint is:

```text
http://127.0.0.1:5000/api/health
```

Keep this PowerShell window running while using the application.

## 7. Frontend Setup

Open a second PowerShell window.

From the project root:

```powershell
cd frontend
pnpm install
```

This installs the versions recorded in `pnpm-lock.yaml`.

### 7.1 Frontend Configuration

The frontend uses `/api` by default. During local development, Vite proxies `/api` requests to:

```text
http://127.0.0.1:5000
```

No frontend environment file is required for the standard local setup.

To use a different backend address, create `frontend/.env`:

```text
VITE_API_BASE_URL=https://your-api-domain.example/api
```

Environment variables beginning with `VITE_` are included during the frontend build. Do not place secret values in frontend environment variables.

### 7.2 Start the Frontend

```powershell
pnpm run dev
```

Open:

```text
http://127.0.0.1:5173
```

The frontend and backend must both be running.

## 8. Configuration Reference

### Backend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FLASK_DEBUG` | Local only | Enables Flask development debugging |
| `JWT_SECRET_KEY` | Yes | Signs authentication tokens |
| `FRONTEND_ORIGINS` | Yes for separate origins | Allowed frontend URLs for CORS |
| `DATABASE_URL` | No | Overrides the default SQLite database location |
| `OPENAI_API_KEY` | Required for AI extraction | Authenticates OpenAI requests |
| `OPENAI_MEDICAL_MODEL` | No | Selects the medical-extraction model |
| `PAWRISE_DATA_DIR` | Production only | Sets the persistent production data directory |
| `UPLOAD_FOLDER` | No | Overrides the image-upload directory |
| `MEDICAL_RECORD_UPLOAD_FOLDER` | No | Overrides the medical-document directory |

### Frontend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | Overrides the default `/api` address |

### Environment-Specific Settings

| Setting | Local Development | Production |
|---|---|---|
| Debug mode | Enabled | Disabled |
| Backend server | Flask development server | Gunicorn |
| Frontend server | Vite development server | Flask serves `frontend/dist` |
| Database | `backend/instance/pawrise.db` | `/home/data/pawrise.db` |
| Upload storage | `backend/instance/` | `/home/data/` |
| Secrets | `backend/.env` | Azure App Service settings |
| API URL | Vite proxy to port 5000 | Same-origin `/api` |

## 9. Build Instructions

### 9.1 Backend Validation

From `backend`:

```powershell
.venv\Scripts\Activate.ps1
pytest
```

Verified result:

```text
112 passed
```

The tests use an in-memory SQLite database and do not modify the local development database.

### 9.2 Frontend Production Build

From `frontend`:

```powershell
pnpm install
pnpm run build
```

The production files are generated in:

```text
frontend/dist/
```

A successful build contains:

```text
frontend/dist/index.html
frontend/dist/app.html
frontend/dist/assets/
```

Verified result:

```text
Production build completed successfully.
```

To preview the production build locally:

```powershell
pnpm run preview
```

## 10. Production Deployment

### 10.1 Prepare the Application

Before deployment:

1. Run all backend tests.
2. Build the frontend.
3. Confirm `frontend/dist/` exists.
4. Confirm `.env`, local databases, and API keys are not included in Git.
5. Confirm `startup.sh` is included.

### 10.2 Configure Azure App Service

Use a Linux Azure App Service with Python 3.12.

Configure the startup command:

```text
bash startup.sh
```

Add the following Azure App Service settings:

```text
JWT_SECRET_KEY=<production-secret>
OPENAI_API_KEY=<production-openai-key>
OPENAI_MEDICAL_MODEL=gpt-5-nano
PAWRISE_DATA_DIR=/home/data
FLASK_DEBUG=false
```

If the frontend and backend use different domains, also configure:

```text
FRONTEND_ORIGINS=https://your-frontend-domain.example
```

Do not store production secrets in `.env` or commit them to Git.

### 10.3 Deploy the Application

Deploy the repository and compiled `frontend/dist/` files to Azure App Service.

The root `requirements.txt` directs Azure to install the backend requirements:

```text
-r backend/requirements.txt
```

During startup, `startup.sh`:

1. Creates persistent upload directories.
2. Changes into the `backend` directory.
3. Initializes or updates the database.
4. Starts Gunicorn on port `8000`.

Production data is stored in:

```text
/home/data/pawrise.db
/home/data/uploads/
/home/data/medical_records/
```

## 11. Setup Validation

After completing the setup, perform the following checks:

Current production application:

[Open PawRise Production](https://pawrise-sylvia-20260810-htdvc8eng5bbdscc.canadacentral-01.azurewebsites.net/)

| Validation | Expected Result |
|---|---|
| Backend starts | No startup exception |
| `/api/health` opens | HTTP 200 |
| Database check | Response shows `database: connected` |
| Frontend opens | Landing page loads correctly |
| Registration | New account is created |
| Login | Dashboard opens |
| Pet creation | Pet remains after refresh |
| Reminder creation | Reminder appears in Health Care |
| Image upload | Uploaded image remains available |
| Medical-record upload | Reviewable extraction draft appears |
| Backend tests | 112 tests pass |
| Frontend build | Build completes successfully |

The system setup is successful when all validation checks pass.
