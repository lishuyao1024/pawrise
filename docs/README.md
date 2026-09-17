# PawRise Documentation

This directory contains the operational and user-facing documentation for the PawRise full-stack capstone application.

**Live application:** [Open PawRise](https://pawrise-sylvia-20260810-htdvc8eng5bbdscc.canadacentral-01.azurewebsites.net/)

## Guides

1. [Production Support and Testing](01_PRODUCTION_SUPPORT_AND_TESTING.md) — monitoring, recovery procedures, automated results, and smoke tests.
2. [System Setup Instructions](02_SYSTEM_SETUP.md) — local development, environment variables, database initialization, builds, and Azure deployment.
3. [Issue Diagnosis and Resolution](03_ISSUE_DIAGNOSIS_AND_RESOLUTION.md) — researched fixes for API connectivity, schema upgrades, Azure persistence, and image extraction.
4. [System Usage Guide](04_SYSTEM_USAGE_GUIDE.md) — authentication, pet profiles, Care Planner, Smart Records, memories, Community, and settings.
5. [Architecture](05_ARCHITECTURE.md) — component responsibilities, data flows, environments, deployment, and security boundaries.

## Technical Evidence

- [API Documentation](../support/API_DOCUMENTATION.md)
- [Database Design](../support/DATABASE_DESIGN.md)
- [Entity-Relationship Diagram](../support/er_diagram.png)
- [Medical Records and Care Reminders](../support/MEDICAL_RECORDS_AND_REMINDERS.md)
- [Test Cases](../support/TEST_CASES.md)
- [Test Results](../support/TEST_RESULTS.md)
- [Postman Collection](../support/PawRise_Milestone2.postman_collection.json)
- [Documentation Images](images/README.md)

## Conventions

- Commands are written for PowerShell unless another shell is explicitly shown.
- Local development uses `http://127.0.0.1:5173` for Vite and `http://127.0.0.1:5000` for Flask.
- Production uses same-origin `/api` requests through Azure App Service.
- Passwords, API keys, tokens, local databases, and real user information are not committed.

## Validation Status

- [x] 112 backend tests passed.
- [x] Frontend production build passed.
- [x] Setup and production health-check procedures are documented.
- [x] User-guide screenshots and internal links are available.
- [x] Architecture, API, and database documents reflect Medical Records and Community features.
