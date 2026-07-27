# PawRise Backend Test Cases

## 1. Purpose

This document defines the automated test cases for the PawRise Milestone 2 backend. The tests verify API behavior, validation, authentication, user-data isolation, database persistence, relationships, indexes, foreign keys, recurrence logic, and cascade deletion.

The request and response contracts are defined in [API_DOCUMENTATION.md](API_DOCUMENTATION.md), and the schema is defined in [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

## 2. Test Approach

| Item | Approach |
|---|---|
| Test framework | pytest |
| API client | Flask test client |
| Test database | Separate in-memory SQLite database |
| Authentication | Real JWTs generated during each test |
| Isolation | Database is created before and removed after each test |
| Assertions | HTTP status, JSON body, database rows, relationships, and constraints |
| Production-data impact | None |

## 3. Standard Test Data

### Registration Request

```json
{
  "full_name": "Shuyao Li",
  "email": "shuyao@example.com",
  "password": "PawRise123!"
}
```

### Pet Request

```json
{
  "name": "Dami",
  "species": "Cat",
  "breed": "Siamese",
  "birthday": "2023-04-18",
  "adoption_date": "2023-06-12",
  "weight_lb": 9.2,
  "image_url": "/uploads/pets/dami-profile.png",
  "notes": "Gentle, vocal, and happiest near the window."
}
```

### Reminder Request

The automated test calculates a future date at runtime so the test remains valid.

```json
{
  "pet_id": 1,
  "care_type": "medication",
  "due_date": "<today plus 30 days>",
  "repeat_rule": "every_2_months",
  "notes": "Flea prevention refill."
}
```

### Memory Request

```json
{
  "pet_id": 1,
  "title": "Window sunshine nap",
  "memory_date": "<today minus 3 days>",
  "category": "daily_moment",
  "scene": "Quiet afternoon at home",
  "description": "Dami found the warmest patch of light.",
  "image_url": "/uploads/memories/dami-window-nap.png"
}
```

### Settings Request

```json
{
  "email_reminders": false,
  "default_lead_days": 3,
  "show_overdue_alerts": false
}
```

## 4. System and Database Test Cases

| Test ID | Component | Scenario and input/setup | Expected result |
|---|---|---|---|
| SYS-01 | `GET /api/health` | Call the health endpoint with an initialized test database. | `200 OK`; response reports `pawrise-backend` and `database: connected`. |
| DB-01 | Database schema | Inspect the database after `db.create_all()`. | Exactly five core tables exist: `users`, `pets`, `care_reminders`, `memories`, and `user_settings`. |
| DB-02 | Database indexes | Inspect indexes on all five tables. | All seven documented custom indexes exist. |
| DB-03 | SQLite foreign keys | Execute `PRAGMA foreign_keys`. | Result is `1`; foreign-key enforcement is enabled. |
| DB-04 | Model relationships | Insert a user, settings, pet, two linked reminders, and a memory; delete the pet and then the user. | Relationships persist; deleting the pet removes reminders and memories; deleting the user removes settings. |

## 5. Authentication Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| AUTH-01 | `POST /api/auth/register` | Submit valid registration JSON with spaces around the name and uppercase email characters. | `201` | Name is trimmed, email is normalized, password is hashed, settings row is created, and JWT is returned. |
| AUTH-02 | `POST /api/auth/register` | Register the same email again using different letter casing. | `409` | Error code is `EMAIL_ALREADY_EXISTS`; no duplicate user is inserted. |
| AUTH-03 | `POST /api/auth/register` | Submit blank name, invalid email, and password shorter than eight characters. | `400` | Error code is `VALIDATION_ERROR`; details identify all three invalid fields. |
| AUTH-04 | `POST /api/auth/login` | Submit a registered email and correct password. | `200` | User data and a valid JWT access token are returned. |
| AUTH-05 | `POST /api/auth/login` | Submit a registered email and incorrect password. | `401` | Error code is `INVALID_CREDENTIALS`; no token is returned. |
| AUTH-06 | `GET /api/auth/me` | Call endpoint without an Authorization header. | `401` | Error code is `AUTHORIZATION_REQUIRED`. |
| AUTH-07 | `GET /api/auth/me` | Call endpoint with a valid bearer token. | `200` | The authenticated user's name and normalized email are returned; password hash is excluded. |

## 6. Pet API Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| PET-01 | `POST /api/pets` | Submit valid pet JSON with a valid JWT. | `201` | Pet JSON is returned and a matching row is inserted into `pets`. |
| PET-02 | Pet endpoints | Call pet list and create endpoints without a JWT. | `401` | Both requests are rejected with an authentication error. |
| PET-03 | `GET /api/pets` | Create one pet for the authenticated user and one pet for another user. | `200` | Only the authenticated user's pet is returned. |
| PET-04 | `GET /api/pets/{id}` | Create one active reminder, one completed reminder, and one memory for the pet. | `200` | Pet response reports summary counts of 1 active reminder, 1 completed reminder, and 1 memory. |
| PET-05 | `PUT /api/pets/{id}` | Change the pet's weight from `9.2` to `9.5` and update notes. | `200` | Response and database row contain the new weight and notes. |
| PET-06 | `DELETE /api/pets/{id}` | Delete a pet that has a reminder and a memory. | `200` | Pet row, reminder row, and memory row are removed through cascade deletion. |
| PET-07 | Pet detail/update/delete | Attempt to read, update, and delete another user's pet. | `404` | All operations return `PET_NOT_FOUND`; private pet data is not exposed or changed. |
| PET-08 | `POST /api/pets` | Submit blank name/species, future birthday, invalid adoption date, and negative weight. | `400` | Validation details identify all invalid fields; no pet is inserted. |
| PET-09 | `GET /api/pets/9999` | Request an ID that does not exist. | `404` | Error code is `PET_NOT_FOUND`. |

## 7. Care Reminder Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| REM-01 | `POST /api/reminders` | Submit a valid future reminder for an owned pet. | `201` | Active reminder row is inserted; `completed_at` is null and status is calculated. |
| REM-02 | Reminder endpoints | Call create, list, and history endpoints without a JWT. | `401` | All requests are rejected. |
| REM-03 | `POST /api/reminders` | Submit invalid care type, current due date, invalid repeat rule, and non-text notes. | `400` | Validation details identify every invalid field; no row is inserted. |
| REM-04 | `POST /api/reminders` | Try to create a reminder for another user's pet. | `400` | Pet validation fails and the private pet is not exposed. |
| REM-05 | `GET /api/reminders` | Store overdue, due-soon, and upcoming reminders; filter by type/status and sort by due date. | `200` | Statuses are calculated correctly; filters and sorting return the expected records. |
| REM-06 | `GET /api/reminders` | Store one reminder for the current user and one for another user. | `200` | Only the current user's reminder is returned. |
| REM-07 | `PUT /api/reminders/{id}` | Change care type, due date, repeat rule, and notes. | `200` | Response and existing database row contain the updated values. |
| REM-08 | `DELETE /api/reminders/{id}` | Delete an owned reminder. | `200` | Selected row is removed from `care_reminders`. |
| REM-09 | `POST /api/reminders/{id}/complete` | Complete a non-repeating reminder. | `200` | `completed_at` is set, no next reminder is created, active list is empty, and history contains the item. |
| REM-10 | `POST /api/reminders/{id}/complete` | Complete an `every_2_months` reminder. | `200` | Current row becomes completed and a new active row is inserted with the calculated next due date and source ID. |
| REM-11 | Recurrence calculation | Add one month to January 31 in normal and leap years. | Unit test | Result is February 28 for 2026 and February 29 for 2024. |
| REM-12 | Complete/update reminder | Complete a reminder, then try to complete and edit it again. | `409` | Both requests return `REMINDER_ALREADY_COMPLETED`; no duplicate next reminder is created. |
| REM-13 | Delete/complete reminder | Attempt to delete or complete another user's reminder. | `404` | Both requests return `REMINDER_NOT_FOUND`; the record remains unchanged. |

## 8. Memory API Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| MEM-01 | `POST /api/memories` | Submit valid memory JSON for an owned pet. | `201` | Memory and pet name are returned; matching row is inserted. |
| MEM-02 | Memory endpoints | Call memory list and create endpoints without a JWT. | `401` | Both requests are rejected. |
| MEM-03 | `POST /api/memories` | Submit blank title, future date, invalid category, non-text scene, and non-text description. | `400` | Validation details identify all invalid fields; no row is inserted. |
| MEM-04 | `POST /api/memories` | Try to create a memory for another user's pet. | `400` | Pet validation fails; no memory is inserted. |
| MEM-05 | `GET /api/memories` | Store multiple memories for multiple pets/users; filter by owned pet and category. | `200` | Only matching current-user memories are returned, newest first. |
| MEM-06 | `PUT /api/memories/{id}` | Change title and description of an owned memory. | `200` | Response and existing database row contain updated values. |
| MEM-07 | `DELETE /api/memories/{id}` | Delete an owned memory. | `200` | Selected memory row is removed. |
| MEM-08 | Memory update/delete | Attempt to update and delete another user's memory. | `404` | Both requests return `MEMORY_NOT_FOUND`; private memory remains unchanged. |

## 9. Settings API Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| SET-01 | `GET /api/settings` | Register a user and request settings. | `200` | Defaults are `true`, `7`, and `true`; internal `user_id` is not exposed. |
| SET-02 | `PUT /api/settings` | Submit valid Boolean values and set lead time to 3 days. | `200` | Existing settings row is updated; a duplicate row is not created. |
| SET-03 | `PUT /api/settings` | Submit strings/numbers instead of Booleans and lead time of 31. | `400` | Validation details identify all three invalid settings. |
| SET-04 | Settings endpoints | Call settings GET and PUT without a JWT. | `401` | Both requests are rejected. |

## 10. Dashboard API Test Cases

| Test ID | Endpoint | Scenario and input/setup | Expected status | Expected result |
|---|---|---|---:|---|
| DASH-01 | `GET /api/dashboard` | Store two pets, one upcoming reminder, one overdue reminder, and two memories. | `200` | Summary counts are correct; reminders have calculated statuses; newest memory appears first. |
| DASH-02 | `GET /api/dashboard?pet_id={id}` | Store data for Dami and Roro, then filter for Dami. | `200` | Counts, pet cards, reminders, and memories include only Dami's records. |
| DASH-03 | `GET /api/dashboard?pet_id={id}` | Supply another user's pet ID. | `404` | Error code is `PET_NOT_FOUND`; private dashboard data is not exposed. |
| DASH-04 | `GET /api/dashboard` | Call endpoint without a JWT. | `401` | Request is rejected with an authentication error. |

## 11. Coverage Summary

| Test area | Test count |
|---|---:|
| System health | 1 |
| Database schema and models | 4 |
| Authentication | 7 |
| Pets | 9 |
| Care reminders | 13 |
| Memories | 8 |
| Settings | 4 |
| Dashboard | 4 |
| **Total** | **50** |

## 12. Automated Test Source Files

```text
backend/tests/test_health.py
backend/tests/test_schema.py
backend/tests/test_models.py
backend/tests/test_auth.py
backend/tests/test_pets.py
backend/tests/test_reminders.py
backend/tests/test_memories.py
backend/tests/test_settings.py
backend/tests/test_dashboard.py
```
