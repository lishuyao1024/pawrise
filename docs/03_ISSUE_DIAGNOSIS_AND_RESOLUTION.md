# Issue Diagnosis, Research, and Resolution

[Back to Documentation Home](README.md)

## 1. Purpose

This document records the major technical issues encountered during PawRise development. Each record explains the problem, environment, reproduction steps, diagnosis, research, resolution, and final verification.

## 2. Issue Summary

| Issue ID | Issue | Area | Final Status |
|---|---|---|---|
| ISSUE-01 | Frontend could not reliably connect to the backend in different environments | Frontend/API | Resolved |
| ISSUE-02 | Existing SQLite databases did not automatically receive new columns | Database | Resolved |
| ISSUE-03 | Azure deployment required persistent storage and a custom startup process | Deployment | Resolved |
| ISSUE-04 | Image-based medical records could not be extracted | OpenAI integration | Resolved |

## 3. ISSUE-01: Frontend and Backend Connection Configuration

### Description

**Expected behavior:** The React frontend should connect to the Flask API in both local development and production.

**Actual behavior:** A backend URL that worked locally could fail after deployment because the frontend and backend used different origins or addresses. This could produce network, CORS, or mixed-content errors.

### Environment

| Item | Value |
|---|---|
| Frontend | React 19 and Vite 6 |
| Backend | Flask 3 |
| Local frontend | `http://127.0.0.1:5173` |
| Local backend | `http://127.0.0.1:5000` |
| Production API | Same-origin `/api` |
| Related commits | `dffc28a`, `06718b9` |

### Steps to Reproduce

1. Start the frontend and backend on different ports.
2. Configure the frontend with an incorrect or hard-coded backend URL.
3. Open the application.
4. Attempt to log in or load dashboard data.
5. Observe the failed request in Browser Developer Tools.

### Diagnosis

The frontend needed environment-aware API configuration. Development required requests to be forwarded to port `5000`, while production needed same-origin `/api` requests.

CORS also had to allow the local frontend origins.

### Research Process

The following resources were used:

- [Vite Environment Variables and Modes](https://vite.dev/guide/env-and-mode)
- [Vite Server Proxy Configuration](https://vite.dev/config/server-options.html)
- Browser Developer Tools Console and Network panels
- Codex-assisted code review of the frontend API client and Vite configuration

The Vite documentation confirmed that `VITE_` values are included during the frontend build and must not contain secrets.

### Resolution

1. Set the frontend API default to:

   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
   ```

2. Configure the Vite development proxy:

   ```javascript
   proxy: {
     "/api": "http://127.0.0.1:5000"
   }
   ```

3. Configure local CORS origins:

   ```text
   FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
   ```

4. Use same-origin `/api` requests in production.
5. Rebuild the frontend after changing a `VITE_` environment variable.

### Outcome Verification

- Registration and login requests reached the backend.
- Dashboard data loaded successfully.
- Browser Network tools showed successful `/api` responses.
- The frontend production build completed successfully.
- Automated authentication and API tests passed.

**Final status: RESOLVED**

### Knowledge Sharing

The configuration was documented in:

- Root `README.md`
- `backend/.env.example`
- System Setup Instructions
- Frontend API client and Vite configuration

## 4. ISSUE-02: Existing SQLite Schema Did Not Update Automatically

### Description

**Expected behavior:** Running database initialization after adding new model fields should make those fields available without deleting existing user data.

**Actual behavior:** SQLAlchemy `create_all()` created missing tables but did not add new columns to existing tables. Older databases could therefore be missing fields for reminder links, custom recurrence, profile avatars, or community features.

### Environment

| Item | Value |
|---|---|
| Backend | Python 3.12 and Flask |
| ORM | Flask-SQLAlchemy |
| Database | SQLite |
| Local database | `backend/instance/pawrise.db` |
| Related commits | `e65ad05`, `9627fe2` |

### Steps to Reproduce

1. Create a database using an older PawRise version.
2. Update the application to a version containing new model columns.
3. Run:

   ```powershell
   flask --app run.py init-db
   ```

4. Start the backend.
5. Use a feature that depends on a newly added column.
6. Observe a missing-column database error.

### Diagnosis

`db.create_all()` creates tables that do not exist, but it is not a complete schema-migration system. It does not automatically alter every existing table when a model changes.

SQLite also requires explicit foreign-key activation for each database connection.

### Research Process

The following resources were used:

- [Flask-Migrate Documentation](https://flask-migrate.readthedocs.io/en/latest/)
- [SQLAlchemy SQLite Documentation](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)
- Existing SQLite schema inspected through `PRAGMA table_info`
- pytest schema-upgrade tests
- Codex-assisted comparison of old and current schemas

The research confirmed that schema changes need explicit migration logic and that SQLite foreign keys must be enabled for each connection.

### Resolution

1. Keep `db.create_all()` for creating missing tables.
2. Add `upgrade_existing_sqlite_schema()` for safe additive changes.
3. Inspect existing tables before adding a column.
4. Add only missing columns.
5. Preserve existing records and relationships.
6. Enable SQLite foreign keys on every connection.
7. Make the initialization command safe to run more than once:

   ```powershell
   flask --app run.py init-db
   ```

### Outcome Verification

Automated tests confirmed that:

- Existing records remained in the database.
- New columns were added.
- Reminder-source relationships were preserved.
- Custom recurrence fields worked.
- Running the upgrade more than once did not duplicate columns.
- SQLite foreign keys were enabled.
- All 112 backend tests passed.

**Final status: RESOLVED**

### Knowledge Sharing

The solution was documented in:

- `backend/app/__init__.py`
- Database Design documentation
- System Setup Instructions
- `test_schema.py`
- Root `README.md`

## 5. ISSUE-03: Azure Startup and Persistent Storage

### Description

**Expected behavior:** The deployed application should start correctly and retain its database, uploaded images, and medical records after a restart.

**Actual behavior:** The Flask application was located inside the `backend` directory rather than the repository root. The default production startup process could therefore fail to locate `run:app`. Files stored outside Azure's persistent `/home` directory could also be lost after a restart or redeployment.

### Environment

| Item | Value |
|---|---|
| Platform | Azure App Service on Linux |
| Runtime | Python 3.12 |
| Production server | Gunicorn |
| Database | SQLite |
| Persistent directory | `/home/data` |
| Related commit | `ede5f15` |

### Steps to Reproduce

1. Deploy the repository without a custom startup command.
2. Allow Azure to search for the Flask application in the repository root.
3. Observe that the application object is inside `backend/run.py`.
4. Store runtime data in a nonpersistent container directory.
5. Restart or redeploy the application.
6. Observe startup failure or missing runtime data.

### Diagnosis

Two deployment-specific problems were identified:

1. Gunicorn needed to start from the `backend` directory.
2. SQLite and uploaded files needed to be stored under Azure's persistent `/home` storage.

### Research Process

The following resources were used:

- [Configure Linux Python Apps in Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/configure-language-python)
- [Configure a Custom Python Startup File](https://learn.microsoft.com/en-us/azure/developer/python/configure-python-web-app-on-app-service)
- Azure App Service Log stream
- Local Gunicorn startup testing
- Codex-assisted review of Azure filesystem and startup requirements

Microsoft's documentation confirmed that runtime files should be stored under `/home` and that applications with nonstandard Flask layouts should use a custom startup command.

### Resolution

A production `startup.sh` file was added:

```sh
#!/bin/sh
set -eu

mkdir -p "${PAWRISE_DATA_DIR:-/home/data}/uploads"
mkdir -p "${PAWRISE_DATA_DIR:-/home/data}/medical_records"
cd backend
flask --app run.py init-db
exec gunicorn \
  --bind=0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile=- \
  --error-logfile=- \
  run:app
```

The backend configuration was also updated to store production data at:

```text
/home/data/pawrise.db
/home/data/uploads/
/home/data/medical_records/
```

Azure App Service was configured to use:

```text
bash startup.sh
```

### Outcome Verification

- Gunicorn started successfully.
- The production application loaded.
- `/api/health` returned HTTP `200`.
- The database reported `connected`.
- Uploaded files remained available.
- Data remained available after restart.
- Post-deployment smoke tests passed.

**Final status: RESOLVED**

### Knowledge Sharing

The deployment solution was saved in:

- `startup.sh`
- `backend/config.py`
- System Setup Instructions
- Production Support documentation
- Deployment package and Git history

## 6. ISSUE-04: Image Medical Records Could Not Be Extracted

### Description

**Expected behavior:** A user should be able to upload a JPG, PNG, or WebP veterinary document and receive a reviewable extraction draft.

**Actual behavior:** The original medical-record workflow extracted text from PDF and TXT files. An image without pasted text did not contain machine-readable source text, so medication and follow-up information could not be extracted.

### Environment

| Item | Value |
|---|---|
| Backend | Flask |
| OpenAI SDK | Version 2.x |
| Model setting | `OPENAI_MEDICAL_MODEL` |
| Default model | `gpt-5-nano` |
| Supported images | JPG, PNG, and WebP |
| Related commit | `b08ad9b` |

### Steps to Reproduce

1. Log in to PawRise.
2. Select a pet.
3. Upload an image of a veterinary medical record.
4. Do not paste any additional text.
5. Submit the record.
6. Observe that the original text-only extraction process cannot read the image.

### Diagnosis

The existing workflow could parse text-based files but had no vision-processing step. The image needed to be sent as an image input, transcribed, and converted into structured fields.

The workflow also needed safe handling for API errors and unclear images.

### Research Process

The following resources were used:

- [OpenAI Images and Vision Guide](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI Structured Outputs Guide](https://developers.openai.com/api/docs/guides/structured-outputs)
- OpenAI Python SDK examples
- Controlled sample veterinary-record image
- Mock OpenAI responses in pytest
- Codex-assisted implementation and test review

The research confirmed that image inputs could be submitted to a vision-capable model and parsed into a defined structured-output schema.

### Resolution

1. Add JPG, PNG, and WebP to the allowed medical-record types.
2. Read the uploaded image bytes.
3. Encode the image as a data URL.
4. Send the image to the OpenAI Responses API with high image detail.
5. Request structured medication and follow-up fields.
6. Store the returned transcription with the extraction draft.
7. Require the user to review the draft before creating reminders.
8. Keep the local fallback for text-based extraction failures.
9. Return a clear error when an image cannot be read.

### Outcome Verification

Automated tests confirmed that:

- Image bytes were submitted as an image input.
- The request used high image detail.
- Transcription was returned.
- Medication name, dose, frequency, and duration were extracted.
- Follow-up dates were extracted.
- No reminder was created before user confirmation.
- OpenAI text failures used the local fallback.
- All 112 backend tests passed.

Manual testing with the sample veterinary record also completed successfully.

**Final status: RESOLVED**

### Knowledge Sharing

The solution was documented in:

- `backend/app/services/ai_medical_extraction.py`
- `backend/app/routes/medical_records.py`
- `backend/tests/test_ai_medical_extraction.py`
- `backend/tests/test_medical_records.py`
- API Documentation
- Medical Records user workflow

## 7. Final Outcome

All four major issues were resolved and verified through automated tests, manual testing, frontend builds, health checks, and deployment smoke tests.

| Issue | Verification |
|---|---|
| Frontend/backend connection | API requests and authentication passed |
| SQLite schema upgrade | Existing data preserved and schema tests passed |
| Azure startup and storage | Deployment and restart validation passed |
| Image medical extraction | Automated and manual extraction tests passed |

The troubleshooting information was shared through Git commits, code comments, automated tests, README instructions, and the project documentation.
