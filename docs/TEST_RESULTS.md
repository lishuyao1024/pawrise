# PawRise Backend Test Results

## 1. Executive Result

All PawRise Milestone 2 backend automated tests passed.

| Metric | Result |
|---|---:|
| Total tests collected | 62 |
| Passed | 62 |
| Failed | 0 |
| Errors | 0 |
| Warnings | 0 |
| Final status | **PASS** |

## 2. Test Execution Information

| Item | Value |
|---|---|
| Execution date | August 9, 2026 |
| Time zone | America/Chicago |
| Operating system | Windows |
| Python | 3.12.13 |
| Flask | 3.1.3 |
| Flask-SQLAlchemy | 3.1.1 |
| Flask-JWT-Extended | 4.7.4 |
| SQLAlchemy | 2.0.51 |
| pytest | 8.4.2 |
| Database | SQLite in-memory test database |
| Test client | Flask test client |

## 3. Test Command

The tests were executed from `pawrise/backend`:

```powershell
.venv\Scripts\python.exe -m pytest
```

Final console result:

```text
..............................................................           [100%]
62 passed
```

## 4. Results by Test Module

| Test module | Area | Collected | Passed | Failed | Result |
|---|---|---:|---:|---:|---|
| `test_health.py` | API and database health | 1 | 1 | 0 | PASS |
| `test_schema.py` | Tables, indexes, foreign keys | 3 | 3 | 0 | PASS |
| `test_models.py` | Relationships and cascade deletion | 1 | 1 | 0 | PASS |
| `test_auth.py` | Registration, login, JWT, current user | 7 | 7 | 0 | PASS |
| `test_pets.py` | Pet CRUD, validation, ownership | 9 | 9 | 0 | PASS |
| `test_reminders.py` | Reminder CRUD, filters, completion, recurrence | 13 | 13 | 0 | PASS |
| `test_memories.py` | Memory CRUD, validation, filters, ownership | 8 | 8 | 0 | PASS |
| `test_settings.py` | Settings defaults, update, validation | 4 | 4 | 0 | PASS |
| `test_dashboard.py` | Dashboard aggregation, filters, ownership | 4 | 4 | 0 | PASS |
| `test_uploads.py` | Authenticated image upload validation | 3 | 3 | 0 | PASS |
| `test_medical_records.py` | Extraction drafts, confirmation, reminder linkage, deletion, ownership | 9 | 9 | 0 | PASS |
| **Total** |  | **62** | **62** | **0** | **PASS** |

## 5. API Route Verification

Flask route inspection confirmed the original core endpoints plus authenticated uploads and six Medical Records endpoints are registered:

```text
GET    /api/health

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

POST   /api/uploads
GET    /api/uploads/{filename}

POST   /api/medical-records
GET    /api/medical-records
GET    /api/medical-records/{record_id}
GET    /api/medical-records/{record_id}/document
POST   /api/medical-records/{record_id}/confirm
DELETE /api/medical-records/{record_id}
```

## 6. Database Verification Results

### 6.1 Tables

The automated schema test confirmed all six application tables:

```text
care_reminders
memories
medical_records
pets
user_settings
users
```

Result: **PASS**

### 6.2 Indexes

The automated schema test confirmed the documented custom indexes, including Medical Records and reminder-source indexes:

```text
ix_pets_user_id
ix_reminders_pet_id
ix_reminders_due_date
ix_reminders_completed_at
ix_reminders_pet_completion_due
ix_memories_pet_id
ix_memories_memory_date
```

Result: **PASS**

### 6.3 Foreign Keys

The test executed:

```sql
PRAGMA foreign_keys;
```

Actual value:

```text
1
```

Result: **PASS**

### 6.4 Relationship and Cascade Test

The test inserted:

- One user
- One user-settings row
- One pet
- One original reminder
- One generated reminder linked to the original
- One memory

Verified results:

1. All records persisted successfully.
2. The generated reminder stored the original reminder ID.
3. Deleting the pet removed its reminders and memory.
4. The user and user settings remained after pet deletion.
5. Deleting the user removed the user-settings row.

Result: **PASS**

## 7. CRUD Database Results

| Operation | Database assertion | Result |
|---|---|---|
| Register user | New `users` row and one default `user_settings` row | PASS |
| Create pet | New row exists in `pets` | PASS |
| Update pet | Existing row contains updated weight and notes | PASS |
| Delete pet | Pet, reminders, and memories are removed | PASS |
| Create reminder | New active row exists with null `completed_at` | PASS |
| Update reminder | Existing row contains updated care values | PASS |
| Delete reminder | Selected row no longer exists | PASS |
| Complete non-repeating reminder | Existing row has `completed_at`; no new row | PASS |
| Complete repeating reminder | Existing row completed and next row inserted | PASS |
| Create memory | New row exists in `memories` | PASS |
| Update memory | Existing row contains updated title and description | PASS |
| Delete memory | Selected row no longer exists | PASS |
| Update settings | Existing row changes; no duplicate settings row | PASS |
| Dashboard | Correctly reads source tables without storing duplicate dashboard data | PASS |

## 8. Validation and Security Results

| Test area | Verified behavior | Result |
|---|---|---|
| Password storage | Plain-text password is never stored | PASS |
| Duplicate account | Email matching is case-insensitive | PASS |
| JWT protection | Protected endpoints reject missing tokens | PASS |
| User isolation | Users cannot access another user's pets, reminders, memories, or dashboard data | PASS |
| Pet validation | Required fields, future dates, and invalid weight are rejected | PASS |
| Reminder validation | Invalid care type, recurrence, due date, and pet ownership are rejected | PASS |
| Memory validation | Invalid title, category, date, and text fields are rejected | PASS |
| Settings validation | Non-Boolean values and lead days outside 0–30 are rejected | PASS |
| API privacy | Password hash is not serialized in API responses | PASS |

## 9. Reminder Business-Logic Results

The most complex backend behaviors were specifically verified:

| Behavior | Actual result |
|---|---|
| Overdue status | Correctly calculated for a date before today |
| Due-soon status | Correctly calculated using the user's lead-time setting |
| Upcoming status | Correctly calculated beyond the lead-time window |
| Care History | Completed reminders disappear from active list and appear in history |
| Non-repeating completion | Does not create another reminder |
| Repeating completion | Creates the next occurrence in the same transaction |
| Source relationship | New reminder references the completed source reminder |
| Month-end recurrence | January 31 becomes the last valid day of February |
| Leap-year recurrence | January 31, 2024 becomes February 29, 2024 |
| Duplicate completion | Returns `409` and does not create duplicate rows |

Result: **PASS**

## 10. Test Isolation

Each pytest test creates a new in-memory SQLite database and removes it afterward. Therefore:

- Tests do not depend on execution order.
- Tests do not modify `backend/instance/pawrise.db`.
- One test's records cannot affect another test.
- Test users, pets, reminders, and memories are temporary.

## 11. Final Assessment

The tested PawRise backend satisfies the Milestone 2 core technical requirements:

- All documented core APIs are registered.
- CRUD operations persist to SQLite.
- Database relationships and cascade behavior work.
- Authentication and per-user authorization work.
- Validation and error responses work.
- Repeating-reminder logic works.
- Dashboard data is derived from source tables.
- All 62 automated tests pass.

Overall test status: **READY FOR POSTMAN DEMONSTRATION**
