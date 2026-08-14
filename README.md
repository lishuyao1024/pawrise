# PawRise

PawRise is a full-stack pet health, care, and memory-management web application. It gives pet owners one organized place to manage pet profiles, care reminders, completed care history, memories, photos, and notification settings.

> **Current status:** The React frontend is connected to the Flask REST API. Authentication, database-backed pet care features, Medical Records extraction and confirmation, linked reminders, settings, and authenticated uploads are implemented. The project is verified by 101 backend tests and a successful frontend production build.

## Features
  
- Secure user registration and login with JWT authentication
- Per-user data isolation
- Pet profile creation, editing, deletion, and photo upload
- Care-reminder creation, editing, completion, and deletion
- Upcoming, due-soon, overdue, and completed care statuses
- Repeating reminders with automatic next-occurrence creation
- Completed care history
- Veterinary Medical Records with local PDF/TXT extraction and review-before-confirmation
- Confirmed medication and follow-up details linked to standard care reminders
- Memory timeline with image upload
- Notification-settings management
- Dashboard aggregation across pets, reminders, memories, and settings
- SQLite foreign keys, indexes, and cascade deletion
- Standard JSON API responses and validation errors
- Shareable Postman API collection
 
## Technology Stack

### Backend

- Python 3.12
- Flask
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-JWT-Extended
- Flask-CORS
- SQLite
- pytest

### Frontend

- React 19
- Vite 6
- JavaScript and JSX
- CSS
- Lucide React icons
- pnpm

## Repository Structure

```text
pawrise/
|-- backend/
|   |-- app/
|   |   |-- models/       # SQLAlchemy database models
|   |   `-- routes/       # Flask API blueprints
|   |-- tests/            # 101 automated tests
|   |-- config.py
|   |-- requirements.txt
|   `-- run.py
|-- frontend/             #  React application connected to the API
|-- docs/                 #  API, database, test, and Postman documentation
|-- postman/              #  Postman local collection files
|-- .gitignore
`-- README.md
```

## Quick Start

Run the backend and frontend in two separate PowerShell windows.

### 1. Clone the Repository

```powershell
git clone https://github.com/lishuyao1024/pawrise.git
cd pawrise
```

### 2. Start the Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
flask --app run.py init-db
python run.py
```

Running `init-db` again is safe for the local SQLite database. It creates missing tables and applies additive schema upgrades, including reminder links, custom repeat intervals, and profile avatars, without deleting existing PawRise data.

The API runs at `http://127.0.0.1:5000`. Check it with:

```text
GET http://127.0.0.1:5000/api/health
```

Before deployment, replace the development value of `JWT_SECRET_KEY` in `backend/.env` with a long random secret.

Medical Record extraction uses OpenAI Structured Outputs when `OPENAI_API_KEY` is set.
Copy `backend/.env.example` to `backend/.env`, add the key there, and optionally
change `OPENAI_MEDICAL_MODEL`. If the API is unavailable, PawRise automatically
falls back to its offline rules and still requires the user to review every field.

### 3. Start the Frontend

From a second PowerShell window:

```powershell
cd pawrise\frontend
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:5173` in a browser. By default, the frontend connects to `http://127.0.0.1:5000/api`.

To use another API address, create `frontend/.env` and set:

```text
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

## Validation

Run the backend tests from `pawrise/backend`:

```powershell
.venv\Scripts\Activate.ps1
pytest
```

Verified result:

```text
101 passed
```

Build the frontend from `pawrise/frontend`:

```powershell
pnpm run build
```

Verified result: the Vite production build completes successfully.

## Postman Demonstration

Import this collection into Postman:

```text
docs/PawRise_Milestone2.postman_collection.json
```

The collection automatically manages the demonstration email, JWT access token, pet ID, reminder IDs, memory ID, and runtime dates. Run the numbered requests in order.

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [Entity-Relationship Diagram](docs/er_diagram.png)
- [Test Cases](docs/TEST_CASES.md)
- [Test Results](docs/TEST_RESULTS.md)
- [Postman Collection](docs/PawRise_Milestone2.postman_collection.json)
- [Medical Records and Care Reminders Integration](docs/MEDICAL_RECORDS_AND_REMINDERS.md)

## Core API Areas

```text
/api/auth
/api/pets
/api/reminders
/api/medical-records
/api/memories
/api/settings
/api/dashboard
/api/uploads
/api/health
```

## Team Collaboration

Always begin new work from the latest `main` branch:

```powershell
git switch main
git pull
git switch -c your-name-feature
```

Commit and push the feature branch, then open a pull request into `main`. Do not commit `.env`, local databases, virtual environments, dependency folders, caches, or files stored in `backend/instance/`.

## Security Notes

- Passwords are stored as secure hashes.
- Protected endpoints require JWT authentication.
- Every protected resource query is scoped to the authenticated user.
- Image and medical-record uploads require authentication and are limited to supported file types and a 5 MB request size.
- Environment secrets, virtual environments, local databases, uploaded files, and caches are excluded from Git.
- API errors do not expose password hashes or database credentials.
