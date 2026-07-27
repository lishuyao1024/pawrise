# PawRise Postman Demonstration Guide

## 1. Import the Collection

Import this file into Postman:

```text
docs/PawRise_Milestone2.postman_collection.json
```

The collection already contains:

- Local API base URL
- Ordered demonstration requests
- Dynamic dates
- A unique email for every registration run
- Automatic JWT capture
- Automatic pet, reminder, next-reminder, and memory ID capture
- Basic response-status tests

No separate Postman environment is required.

## 2. Start the Backend

From `pawrise/backend`:

```powershell
.venv\Scripts\Activate.ps1
flask --app run.py init-db
python run.py
```

Expected address:

```text
http://127.0.0.1:5000
```

## 3. Open the Database

Open:

```text
backend/instance/pawrise.db
```

Recommended options:

- SQLite Viewer extension in VS Code
- DB Browser for SQLite
- Another read-only SQLite inspection tool

Keep these tables easy to access during the recording:

```text
users
user_settings
pets
care_reminders
memories
```

Refresh the table view after every modifying request.

## 4. Run Requests in Numbered Order

The collection is designed for manual demonstration in order.

| Request | Expected API result | Database evidence |
|---|---|---|
| 01. Health Check | `200` and database connected | No data change |
| 02. Register Demo User | `201` and JWT | New `users` row and new `user_settings` row |
| 03. Login | `200` and JWT | No data change |
| 04. Get Current User | `200` and account data | No data change |
| 05. Create Pet | `201` | New `pets` row |
| 06. List Pets | `200` | No data change |
| 07. Get Pet | `200` | No data change |
| 08. Update Pet | `200` | Existing pet weight and notes change |
| 09. Create Repeating Reminder | `201` | New active `care_reminders` row |
| 10. List Active Reminders | `200` | No data change |
| 11. Update Reminder | `200` | Existing reminder values change |
| 12. Complete Repeating Reminder | `200` | Source row completed; next active row inserted |
| 13. View Care History | `200` | No data change |
| 14. Delete Generated Reminder | `200` | Generated active row removed |
| 15. Create Memory | `201` | New `memories` row |
| 16. List Memories | `200` | No data change |
| 17. Update Memory | `200` | Existing title and description change |
| 18. Delete Memory | `200` | Memory row removed |
| 19. Get Settings | `200` | No data change |
| 20. Update Settings | `200` | Existing settings row changes; no duplicate |
| 21. Get Dashboard | `200` | No data change; response aggregates current tables |
| 22. Delete Pet | `200` | Pet and remaining completed reminder removed |

## 5. Important Recording Notes

- Do not use Postman's Run Collection button for the video; run requests one at a time so the database can be shown after each write.
- Keep the Flask terminal visible briefly to show incoming HTTP requests.
- Show the Postman response status and JSON body.
- Refresh the relevant database table after each POST, PUT, completion, or DELETE.
- Explain that GET requests do not modify the database.
- Explain that IDs and dates are stored automatically as collection variables.
- Explain that the registration request generates a unique email, so the collection can be run repeatedly.

## 6. Reset for Another Demonstration

The collection deletes the demo pet and its related data, but leaves the demo user and settings row. Running the collection again is safe because registration creates a new unique email.

For a completely empty demonstration database, close any program using the database, remove the local ignored database file, and recreate it:

```powershell
flask --app run.py init-db
```

Only remove the local database when a clean reset is intentional. The automated pytest suite never modifies this file.
