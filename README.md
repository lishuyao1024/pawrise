# PawRise

PawRise is a pet health, care, and memory-management web application. It gives pet owners one organized place to manage pet profiles, future care reminders, completed care history, meaningful memories, and notification settings.

> **Current status:** The Milestone 1 React front-end prototype and Milestone 2 database-backed Flask REST API are included in this repository. The backend core is complete and verified by 50 automated tests. Connecting the prototype UI to the REST API is a later integration step.

## Business Problem

Pet owners often keep vaccination records, medication schedules, appointment notes, and pet photos across paper files, calendars, messaging apps, and separate photo libraries. Fragmented information makes routine care harder to coordinate and important records more difficult to find when needed.

PawRise brings care planning and personal pet memories into one clear application.

## Milestone 2 Backend Features

- Secure user registration and login
- JWT-protected endpoints
- Per-user data isolation
- Pet profile CRUD
- Care-reminder CRUD
- Automatic upcoming, due-soon, overdue, and completed statuses
- Care History
- Repeating reminders with automatic next-occurrence creation
- Memory timeline CRUD
- Notification-settings management
- Read-only Dashboard aggregation
- SQLite foreign keys, indexes, and cascade deletion
- Standard JSON success and error responses
- 50 automated pytest tests

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

### Frontend Prototype

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
|   |-- tests/            # 50 automated tests
|   |-- config.py
|   |-- requirements.txt
|   `-- run.py
|-- frontend/             # Milestone 1 React prototype
|-- docs/                 # API, database, test, Postman, and video documentation
|-- .gitignore
`-- README.md
```

## Run the Backend

### 1. Create and Activate a Virtual Environment

From `pawrise/backend`:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
python -m pip install -r requirements.txt
```

### 3. Configure Local Environment

Copy:

```text
.env.example
```

to:

```text
.env
```

Replace the development JWT secret before deployment.

### 4. Create the SQLite Database

```powershell
flask --app run.py init-db
```

The ignored local database is created at:

```text
backend/instance/pawrise.db
```

### 5. Start the API

```powershell
python run.py
```

Health check:

```text
GET http://127.0.0.1:5000/api/health
```

## Run Automated Tests

From `pawrise/backend`:

```powershell
pytest
```

Verified result:

```text
50 passed
```

Tests use a separate in-memory SQLite database and do not modify the local development database.

## Postman Demonstration

Import:

```text
docs/PawRise_Milestone2.postman_collection.json
```

The collection automatically manages:

- Unique demonstration email
- JWT access token
- Pet ID
- Reminder IDs
- Memory ID
- Valid runtime dates

Run the requests in numbered order and refresh the relevant SQLite table after each modifying operation.

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [Entity-Relationship Diagram](docs/er_diagram.png)
- [Test Cases](docs/TEST_CASES.md)
- [Test Results](docs/TEST_RESULTS.md)
- [Postman Guide](docs/POSTMAN_GUIDE.md)
- [Video Demonstration Script](docs/VIDEO_DEMO_SCRIPT.md)
- [Submission Checklist](docs/SUBMISSION_CHECKLIST.md)

## Core API Areas

```text
/api/auth
/api/pets
/api/reminders
/api/memories
/api/settings
/api/dashboard
/api/health
```

The complete list of 22 endpoints, expected JSON input/output, validation rules, status codes, and error responses is available in the API documentation.

## Security Notes

- Passwords are stored as secure hashes.
- Protected endpoints require JWT authentication.
- Every protected resource query is scoped to the authenticated user.
- Environment secrets, virtual environments, local databases, and cache files are excluded from Git.
- API errors do not expose password hashes or database credentials.

## Milestone 2 Deliverables

- Working backend API code
- Full SQLite integration
- API documentation with sample JSON
- Database design and ER diagram
- Automated test code
- Test cases and test results
- Postman demonstration collection
- Video demonstration script

The final submission requires a GitHub repository link and a 6–10 minute video link with appropriate instructor viewing permissions.
