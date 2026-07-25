# PawRise Backend API Documentation

## 1. Document Purpose

This document defines the REST APIs required by the PawRise capstone application. PawRise helps authenticated users manage pet profiles, future care reminders, completed care history, pet memories, notification settings, dashboard summaries, and general pet-care guidance.

The backend will be implemented with Python, Flask, SQLAlchemy, and SQLite. All request and response bodies use JSON unless otherwise stated.

## 2. Base URL

Local development:

```text
http://127.0.0.1:5000/api
```

## 3. General Conventions

### 3.1 Content Type

```http
Content-Type: application/json
```

### 3.2 Authentication

Protected endpoints require a JSON Web Token (JWT):

```http
Authorization: Bearer <access_token>
```

Users may access only their own pets, reminders, memories, settings, and dashboard data.

### 3.3 Date Format

Dates use ISO 8601 format:

```text
YYYY-MM-DD
```

Timestamps use:

```text
YYYY-MM-DDTHH:MM:SSZ
```

### 3.4 Standard Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

### 3.5 Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "details": {
      "name": "Pet name is required."
    }
  }
}
```

### 3.6 Common HTTP Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Request completed successfully |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid JSON or validation failure |
| `401 Unauthorized` | Missing, invalid, or expired access token |
| `403 Forbidden` | User does not own the requested resource |
| `404 Not Found` | Requested resource does not exist |
| `409 Conflict` | Resource conflicts with existing data |
| `500 Internal Server Error` | Unexpected server error |

## 4. API Summary

| Area | Method | Endpoint | Authentication | Purpose |
|---|---|---|---|---|
| System | GET | `/health` | No | Check whether the API is running |
| Authentication | POST | `/auth/register` | No | Register a user |
| Authentication | POST | `/auth/login` | No | Log in and receive an access token |
| Authentication | GET | `/auth/me` | Yes | Get the current user |
| Authentication | POST | `/auth/logout` | Yes | Revoke the current access token |
| Pets | POST | `/pets` | Yes | Create a pet |
| Pets | GET | `/pets` | Yes | List the user's pets |
| Pets | GET | `/pets/{pet_id}` | Yes | Get one pet |
| Pets | PUT | `/pets/{pet_id}` | Yes | Update one pet |
| Pets | DELETE | `/pets/{pet_id}` | Yes | Delete one pet |
| Care reminders | POST | `/reminders` | Yes | Create a care reminder |
| Care reminders | GET | `/reminders` | Yes | List active care reminders |
| Care reminders | GET | `/reminders/{reminder_id}` | Yes | Get one care reminder |
| Care reminders | PUT | `/reminders/{reminder_id}` | Yes | Update one care reminder |
| Care reminders | DELETE | `/reminders/{reminder_id}` | Yes | Delete one care reminder |
| Care reminders | POST | `/reminders/{reminder_id}/complete` | Yes | Complete a reminder |
| Care reminders | GET | `/reminders/history` | Yes | List completed reminders |
| Memories | POST | `/memories` | Yes | Create a memory |
| Memories | GET | `/memories` | Yes | List memories |
| Memories | GET | `/memories/{memory_id}` | Yes | Get one memory |
| Memories | PUT | `/memories/{memory_id}` | Yes | Update one memory |
| Memories | DELETE | `/memories/{memory_id}` | Yes | Delete one memory |
| Settings | GET | `/settings` | Yes | Get notification settings |
| Settings | PUT | `/settings` | Yes | Update notification settings |
| Dashboard | GET | `/dashboard` | Yes | Get dashboard summary data |
| Data export | GET | `/export` | Yes | Export the user's PawRise data |
| Care assistant | POST | `/assistant/guidance` | Yes | Request general pet-care guidance |

---

## 5. System API

### 5.1 Health Check

Checks whether the backend and database connection are available.

```http
GET /api/health
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "PawRise API is running.",
  "data": {
    "service": "pawrise-backend",
    "database": "connected"
  }
}
```

---

## 6. Authentication APIs

### 6.1 Register User

Creates a user account and default notification settings.

```http
POST /api/auth/register
```

#### Sample JSON Input

```json
{
  "full_name": "Shuyao Li",
  "email": "shuyao@example.com",
  "password": "PawRise123!"
}
```

#### Validation Rules

- `full_name` is required.
- `email` must be a valid email address.
- `email` must be unique.
- `password` must contain at least 8 characters.
- Passwords must be stored as secure hashes, never as plain text.

#### Sample JSON Output — `201 Created`

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Shuyao Li",
      "email": "shuyao@example.com",
      "created_at": "2026-07-24T20:00:00Z"
    },
    "access_token": "sample.jwt.token"
  }
}
```

#### Sample Error — `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists."
  }
}
```

### 6.2 Log In

Authenticates a user and returns a JWT access token.

```http
POST /api/auth/login
```

#### Sample JSON Input

```json
{
  "email": "shuyao@example.com",
  "password": "PawRise123!"
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Shuyao Li",
      "email": "shuyao@example.com"
    },
    "access_token": "sample.jwt.token"
  }
}
```

#### Sample Error — `401 Unauthorized`

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect."
  }
}
```

### 6.3 Get Current User

Returns the authenticated user's account information.

```http
GET /api/auth/me
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "full_name": "Shuyao Li",
    "email": "shuyao@example.com",
    "created_at": "2026-07-24T20:00:00Z"
  }
}
```

### 6.4 Log Out

Revokes the JWT used for the request.

```http
POST /api/auth/logout
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Logout successful.",
  "data": {}
}
```

---

## 7. Pet APIs

### 7.1 Create Pet

Creates a pet profile owned by the authenticated user.

```http
POST /api/pets
```

#### Sample JSON Input

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

#### Validation Rules

- `name` is required.
- `species` is required.
- `birthday` and `adoption_date` cannot be future dates.
- `weight_lb`, when provided, must be greater than zero.
- Age is calculated from `birthday`; it is not stored as editable text.

#### Sample JSON Output — `201 Created`

```json
{
  "success": true,
  "message": "Pet created successfully.",
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "Dami",
    "species": "Cat",
    "breed": "Siamese",
    "birthday": "2023-04-18",
    "adoption_date": "2023-06-12",
    "age_years": 3,
    "weight_lb": 9.2,
    "image_url": "/uploads/pets/dami-profile.png",
    "notes": "Gentle, vocal, and happiest near the window.",
    "created_at": "2026-07-24T20:10:00Z",
    "updated_at": "2026-07-24T20:10:00Z"
  }
}
```

#### Sample Error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pet validation failed.",
    "details": {
      "name": "Pet name is required."
    }
  }
}
```

### 7.2 List Pets

Returns all pets owned by the authenticated user.

```http
GET /api/pets
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Dami",
      "species": "Cat",
      "breed": "Siamese",
      "birthday": "2023-04-18",
      "adoption_date": "2023-06-12",
      "age_years": 3,
      "weight_lb": 9.2,
      "image_url": "/uploads/pets/dami-profile.png",
      "notes": "Gentle, vocal, and happiest near the window."
    },
    {
      "id": 2,
      "name": "Roro",
      "species": "Cat",
      "breed": "Abyssinian",
      "birthday": "2024-09-03",
      "adoption_date": "2024-10-20",
      "age_years": 1,
      "weight_lb": 8.4,
      "image_url": "/uploads/pets/roro-profile.png",
      "notes": "Curious, quick, and always inspecting new shelves."
    }
  ]
}
```

### 7.3 Get Pet

Returns one pet and summary counts for related records.

```http
GET /api/pets/{pet_id}
```

Example:

```http
GET /api/pets/1
```

#### Sample JSON Input

```json
{
  "pet_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dami",
    "species": "Cat",
    "breed": "Siamese",
    "birthday": "2023-04-18",
    "adoption_date": "2023-06-12",
    "age_years": 3,
    "weight_lb": 9.2,
    "image_url": "/uploads/pets/dami-profile.png",
    "notes": "Gentle, vocal, and happiest near the window.",
    "summary": {
      "active_reminders": 2,
      "completed_reminders": 5,
      "memories": 3
    }
  }
}
```

#### Sample Error — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "PET_NOT_FOUND",
    "message": "Pet not found."
  }
}
```

### 7.4 Update Pet

Updates an existing pet owned by the authenticated user.

```http
PUT /api/pets/{pet_id}
```

#### Sample JSON Input

```json
{
  "name": "Dami",
  "species": "Cat",
  "breed": "Siamese",
  "birthday": "2023-04-18",
  "adoption_date": "2023-06-12",
  "weight_lb": 9.5,
  "image_url": "/uploads/pets/dami-profile.png",
  "notes": "Updated weight after the July checkup."
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Pet updated successfully.",
  "data": {
    "id": 1,
    "name": "Dami",
    "species": "Cat",
    "breed": "Siamese",
    "birthday": "2023-04-18",
    "adoption_date": "2023-06-12",
    "age_years": 3,
    "weight_lb": 9.5,
    "image_url": "/uploads/pets/dami-profile.png",
    "notes": "Updated weight after the July checkup.",
    "updated_at": "2026-07-24T20:30:00Z"
  }
}
```

### 7.5 Delete Pet

Deletes a pet owned by the authenticated user.

Related reminders and memories are also deleted through database cascade rules. The user interface must request confirmation before calling this endpoint.

```http
DELETE /api/pets/{pet_id}
```

#### Sample JSON Input

```json
{
  "pet_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Pet and related records deleted successfully.",
  "data": {
    "deleted_pet_id": 1
  }
}
```

---

## 8. Care Reminder APIs

### Reminder Business Rules

- A reminder belongs to one pet.
- `due_date` represents the next planned care date.
- Active status is calculated by the server from the current date and `due_date`.
- `overdue`: due date is before today.
- `due_soon`: due date is today or within the user's notification lead time.
- `upcoming`: due date is later than the notification lead-time window.
- `completed`: reminder has been completed.
- The client does not manually set `status`.
- Completing a repeating reminder creates the next active reminder automatically.

Allowed `care_type` values:

```text
vaccine
deworming
checkup
medication
weight
other
```

Allowed `repeat_rule` values:

```text
none
monthly
every_2_months
every_3_months
every_6_months
yearly
```

### 8.1 Create Care Reminder

```http
POST /api/reminders
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "care_type": "medication",
  "due_date": "2026-08-24",
  "repeat_rule": "every_2_months",
  "notes": "Flea prevention refill."
}
```

#### Validation Rules

- `pet_id`, `care_type`, and `due_date` are required.
- The pet must belong to the authenticated user.
- A newly created reminder must have a future `due_date`.
- `status` and `completed_at` cannot be supplied by the client.

#### Sample JSON Output — `201 Created`

```json
{
  "success": true,
  "message": "Care reminder created successfully.",
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "care_type": "medication",
    "due_date": "2026-08-24",
    "repeat_rule": "every_2_months",
    "notes": "Flea prevention refill.",
    "status": "upcoming",
    "completed_at": null,
    "created_at": "2026-07-24T21:00:00Z"
  }
}
```

### 8.2 List Active Care Reminders

Returns non-completed reminders, ordered by nearest due date by default.

```http
GET /api/reminders
```

Optional query parameters:

| Parameter | Example | Purpose |
|---|---|---|
| `pet_id` | `1` | Filter by pet |
| `care_type` | `vaccine` | Filter by care type |
| `status` | `overdue` | Filter by calculated status |
| `sort` | `due_date` | Sort field |
| `order` | `asc` | Sort direction |

Example:

```http
GET /api/reminders?pet_id=1&status=overdue&sort=due_date&order=asc
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "status": "overdue",
  "sort": "due_date",
  "order": "asc"
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "pet_id": 1,
      "pet_name": "Dami",
      "care_type": "vaccine",
      "due_date": "2026-07-18",
      "repeat_rule": "yearly",
      "notes": "Rabies vaccine at Green Valley Vet.",
      "status": "overdue"
    }
  ]
}
```

### 8.3 Get Care Reminder

```http
GET /api/reminders/{reminder_id}
```

#### Sample JSON Input

```json
{
  "reminder_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "care_type": "medication",
    "due_date": "2026-08-24",
    "repeat_rule": "every_2_months",
    "notes": "Flea prevention refill.",
    "status": "upcoming",
    "completed_at": null
  }
}
```

#### Sample Error — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "REMINDER_NOT_FOUND",
    "message": "Care reminder not found."
  }
}
```

### 8.4 Update Care Reminder

```http
PUT /api/reminders/{reminder_id}
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "care_type": "medication",
  "due_date": "2026-08-30",
  "repeat_rule": "every_2_months",
  "notes": "Updated after confirming the clinic schedule."
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Care reminder updated successfully.",
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "care_type": "medication",
    "due_date": "2026-08-30",
    "repeat_rule": "every_2_months",
    "notes": "Updated after confirming the clinic schedule.",
    "status": "upcoming",
    "updated_at": "2026-07-24T21:20:00Z"
  }
}
```

### 8.5 Delete Care Reminder

Permanently deletes an active or completed reminder.

```http
DELETE /api/reminders/{reminder_id}
```

#### Sample JSON Input

```json
{
  "reminder_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Care reminder deleted successfully.",
  "data": {
    "deleted_reminder_id": 1
  }
}
```

### 8.6 Complete Care Reminder

Marks a reminder as completed. If the reminder repeats, the response also contains the automatically generated next reminder.

```http
POST /api/reminders/{reminder_id}/complete
```

#### Sample JSON Input

```json
{
  "completed_at": "2026-08-24T15:30:00Z"
}
```

`completed_at` is optional. If omitted, the server uses the current time.

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Care reminder completed successfully.",
  "data": {
    "completed_reminder": {
      "id": 1,
      "pet_id": 1,
      "care_type": "medication",
      "due_date": "2026-08-24",
      "repeat_rule": "every_2_months",
      "status": "completed",
      "completed_at": "2026-08-24T15:30:00Z"
    },
    "next_reminder": {
      "id": 5,
      "pet_id": 1,
      "care_type": "medication",
      "due_date": "2026-10-24",
      "repeat_rule": "every_2_months",
      "status": "upcoming"
    }
  }
}
```

For a non-repeating reminder:

```json
{
  "success": true,
  "message": "Care reminder completed successfully.",
  "data": {
    "completed_reminder": {
      "id": 3,
      "status": "completed",
      "completed_at": "2026-08-24T15:30:00Z"
    },
    "next_reminder": null
  }
}
```

### 8.7 List Care History

Returns completed reminders ordered by completion time, newest first.

```http
GET /api/reminders/history
```

Optional query parameter:

```text
pet_id
```

#### Sample JSON Input

```json
{
  "pet_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pet_id": 1,
      "pet_name": "Dami",
      "care_type": "medication",
      "due_date": "2026-08-24",
      "repeat_rule": "every_2_months",
      "notes": "Flea prevention refill.",
      "status": "completed",
      "completed_at": "2026-08-24T15:30:00Z"
    }
  ]
}
```

---

## 9. Memory APIs

### 9.1 Create Memory

Creates a memory associated with one of the authenticated user's pets.

```http
POST /api/memories
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "title": "Window sunshine nap",
  "memory_date": "2026-07-08",
  "category": "daily_moment",
  "scene": "Quiet afternoon at home",
  "description": "Dami found the warmest patch of light and stayed there until dinner.",
  "image_url": "/uploads/memories/dami-window-nap.png"
}
```

#### Validation Rules

- `pet_id`, `title`, and `memory_date` are required.
- The selected pet must belong to the authenticated user.
- `memory_date` cannot be a future date.

#### Sample JSON Output — `201 Created`

```json
{
  "success": true,
  "message": "Memory created successfully.",
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "title": "Window sunshine nap",
    "memory_date": "2026-07-08",
    "category": "daily_moment",
    "scene": "Quiet afternoon at home",
    "description": "Dami found the warmest patch of light and stayed there until dinner.",
    "image_url": "/uploads/memories/dami-window-nap.png",
    "created_at": "2026-07-24T22:00:00Z"
  }
}
```

### 9.2 List Memories

Returns memories in reverse chronological order.

```http
GET /api/memories
```

Optional query parameters:

| Parameter | Example | Purpose |
|---|---|---|
| `pet_id` | `1` | Filter by pet |
| `category` | `birthday` | Filter by category |

#### Sample JSON Input

```json
{
  "pet_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pet_id": 1,
      "pet_name": "Dami",
      "title": "Window sunshine nap",
      "memory_date": "2026-07-08",
      "category": "daily_moment",
      "scene": "Quiet afternoon at home",
      "description": "Dami found the warmest patch of light and stayed there until dinner.",
      "image_url": "/uploads/memories/dami-window-nap.png"
    }
  ]
}
```

### 9.3 Get Memory

```http
GET /api/memories/{memory_id}
```

#### Sample JSON Input

```json
{
  "memory_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "title": "Window sunshine nap",
    "memory_date": "2026-07-08",
    "category": "daily_moment",
    "scene": "Quiet afternoon at home",
    "description": "Dami found the warmest patch of light and stayed there until dinner.",
    "image_url": "/uploads/memories/dami-window-nap.png",
    "created_at": "2026-07-24T22:00:00Z",
    "updated_at": "2026-07-24T22:00:00Z"
  }
}
```

#### Sample Error — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "MEMORY_NOT_FOUND",
    "message": "Memory not found."
  }
}
```

### 9.4 Update Memory

```http
PUT /api/memories/{memory_id}
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "title": "A long window sunshine nap",
  "memory_date": "2026-07-08",
  "category": "daily_moment",
  "scene": "Quiet afternoon at home",
  "description": "Dami stayed in the warm window light for most of the afternoon.",
  "image_url": "/uploads/memories/dami-window-nap.png"
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Memory updated successfully.",
  "data": {
    "id": 1,
    "pet_id": 1,
    "pet_name": "Dami",
    "title": "A long window sunshine nap",
    "memory_date": "2026-07-08",
    "category": "daily_moment",
    "scene": "Quiet afternoon at home",
    "description": "Dami stayed in the warm window light for most of the afternoon.",
    "image_url": "/uploads/memories/dami-window-nap.png",
    "updated_at": "2026-07-24T22:15:00Z"
  }
}
```

### 9.5 Delete Memory

```http
DELETE /api/memories/{memory_id}
```

#### Sample JSON Input

```json
{
  "memory_id": 1
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Memory deleted successfully.",
  "data": {
    "deleted_memory_id": 1
  }
}
```

---

## 10. Settings APIs

### 10.1 Get Settings

Returns the authenticated user's care-notification settings.

```http
GET /api/settings
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "email_reminders": true,
    "default_lead_days": 7,
    "show_overdue_alerts": true,
    "updated_at": "2026-07-24T22:30:00Z"
  }
}
```

### 10.2 Update Settings

```http
PUT /api/settings
```

#### Sample JSON Input

```json
{
  "email_reminders": true,
  "default_lead_days": 3,
  "show_overdue_alerts": true
}
```

#### Validation Rules

- `email_reminders` must be Boolean.
- `show_overdue_alerts` must be Boolean.
- `default_lead_days` must be an integer from 0 through 30.

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "message": "Settings updated successfully.",
  "data": {
    "email_reminders": true,
    "default_lead_days": 3,
    "show_overdue_alerts": true,
    "updated_at": "2026-07-24T22:35:00Z"
  }
}
```

---

## 11. Dashboard API

### 11.1 Get Dashboard

Returns a summary assembled from existing pet, reminder, and memory records. Dashboard data is not stored in a separate table.

```http
GET /api/dashboard
```

Optional query parameter:

```text
pet_id
```

#### Sample JSON Input

```json
{
  "pet_id": null
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "full_name": "Shuyao Li"
    },
    "summary": {
      "pet_count": 2,
      "upcoming_count": 3,
      "overdue_count": 1,
      "memory_count": 3
    },
    "pets": [
      {
        "id": 1,
        "name": "Dami",
        "breed": "Siamese",
        "age_years": 3,
        "image_url": "/uploads/pets/dami-profile.png"
      }
    ],
    "upcoming_reminders": [
      {
        "id": 1,
        "pet_id": 1,
        "pet_name": "Dami",
        "care_type": "medication",
        "due_date": "2026-08-24",
        "status": "upcoming"
      }
    ],
    "overdue_items": [
      {
        "id": 2,
        "pet_id": 1,
        "pet_name": "Dami",
        "care_type": "vaccine",
        "due_date": "2026-07-18",
        "status": "overdue"
      }
    ],
    "recent_memories": [
      {
        "id": 1,
        "pet_id": 1,
        "pet_name": "Dami",
        "title": "Window sunshine nap",
        "memory_date": "2026-07-08",
        "image_url": "/uploads/memories/dami-window-nap.png"
      }
    ]
  }
}
```

---

## 12. Data Export API

### 12.1 Export User Data

Exports the authenticated user's account profile, pets, reminders, care history, memories, and settings as JSON.

```http
GET /api/export
```

#### Sample JSON Input

No request body is required.

```json
{}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "exported_at": "2026-07-24T23:00:00Z",
    "user": {
      "id": 1,
      "full_name": "Shuyao Li",
      "email": "shuyao@example.com"
    },
    "pets": [
      {
        "id": 1,
        "name": "Dami",
        "species": "Cat",
        "breed": "Siamese"
      }
    ],
    "active_reminders": [],
    "care_history": [],
    "memories": [],
    "settings": {
      "email_reminders": true,
      "default_lead_days": 7,
      "show_overdue_alerts": true
    }
  }
}
```

---

## 13. Pet Care Assistant API

### 13.1 Request General Care Guidance

Provides general pet-care information and vet-visit preparation guidance. It must not diagnose disease, prescribe medication, replace a veterinarian, or represent itself as emergency care.

The API may read the selected pet's profile to provide relevant context, but it must not expose another user's pet data.

```http
POST /api/assistant/guidance
```

#### Sample JSON Input

```json
{
  "pet_id": 1,
  "question": "What information should I prepare before Dami's annual checkup?"
}
```

#### Sample JSON Output — `200 OK`

```json
{
  "success": true,
  "data": {
    "pet_id": 1,
    "pet_name": "Dami",
    "answer": "Before the visit, prepare Dami's vaccination history, current medications, recent appetite or behavior changes, weight changes, and a list of questions for the veterinarian.",
    "disclaimer": "This information is for general educational support only and does not replace advice from a licensed veterinarian."
  }
}
```

#### Sample Safety Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "pet_id": 1,
    "pet_name": "Dami",
    "answer": "I cannot diagnose an emergency or recommend treatment. Contact a veterinarian or an emergency veterinary clinic immediately if Dami has trouble breathing, collapses, has uncontrolled bleeding, or shows another severe symptom.",
    "disclaimer": "This information is for general educational support only and does not replace advice from a licensed veterinarian."
  }
}
```

#### Sample Error — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A question is required."
  }
}
```

---

## 14. Authorization and Data Protection Requirements

1. Passwords must be hashed using a secure password-hashing function.
2. API responses must never return password hashes.
3. Protected endpoints must validate the JWT.
4. Database queries must always be scoped to the authenticated user.
5. A user requesting another user's resource should receive `404 Not Found` or `403 Forbidden` without exposing private data.
6. Uploaded image paths must be validated before storage.
7. API errors must not expose stack traces, database credentials, or internal file paths.
8. Secrets such as JWT signing keys must be stored in environment variables.

## 15. Database Update Expectations for the Demonstration

The Milestone 2 video must show database evidence after each modifying API operation:

| Operation | Expected database evidence |
|---|---|
| Register user | New row in `users` and default row in `user_settings` |
| Create pet | New row in `pets` |
| Update pet | Existing `pets` row contains updated values |
| Delete pet | Pet row and related child records are removed |
| Create reminder | New row in `care_reminders` |
| Update reminder | Existing reminder row contains updated values |
| Complete reminder | Current row becomes completed; repeating reminder creates a new active row |
| Delete reminder | Reminder row is removed |
| Create memory | New row in `memories` |
| Update memory | Existing memory row contains updated values |
| Delete memory | Memory row is removed |
| Update settings | Existing `user_settings` row contains updated values |

## 16. Current Scope Decisions

- The Dashboard uses existing pet, reminder, and memory data; it does not have its own database table.
- Reminder status is calculated by the backend and is not directly edited by users.
- Completed reminders remain available as Care History.
- Completing a repeating reminder automatically creates its next occurrence.
- Pet age is calculated from the birthday.
- The first backend version uses an `image_url` field. Image file upload handling may be added as a separate endpoint after the core database-backed APIs are complete.
- Email delivery, password-reset email delivery, payment processing, veterinary diagnosis, prescriptions, emergency services, and veterinary-clinic integration are outside the Milestone 2 core backend scope.

