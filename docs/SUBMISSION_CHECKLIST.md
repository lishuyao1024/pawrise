# PawRise Milestone 2 Submission Checklist

## Required GitHub Content

- [x] Working Flask backend code
- [x] SQLite and SQLAlchemy integration
- [x] Five database models
- [x] Authentication and JWT protection
- [x] Pet CRUD APIs
- [x] Care-reminder CRUD, completion, history, and recurrence APIs
- [x] Memory CRUD APIs
- [x] Settings APIs
- [x] Dashboard API
- [x] API input/output documentation
- [x] Database design documentation
- [x] Professional ER diagram PNG
- [x] Automated test code
- [x] Test-case documentation
- [x] Test-results documentation
- [x] Postman collection
- [x] Backend setup instructions
- [ ] Final Git commit and push
- [ ] Public or instructor-accessible GitHub link

## API and Database Verification

- [x] All 22 core routes are registered
- [x] All 5 core database tables are created
- [x] All 7 documented custom indexes are created
- [x] SQLite foreign keys are enabled
- [x] Passwords are hashed
- [x] JWT is required for protected routes
- [x] User-owned data is isolated
- [x] Pet deletion cascades to reminders and memories
- [x] Reminder status is calculated
- [x] Repeating reminder creates the next occurrence
- [x] Dashboard reads source tables without duplicate storage

## Test Verification

- [x] 50 automated tests collected
- [x] 50 automated tests passed
- [x] 0 failed
- [x] 0 errors
- [x] 0 warnings
- [x] Tests use a separate database
- [ ] Postman demonstration run completed manually
- [ ] Database screenshots captured if desired

## Video Deliverable

- [ ] Video recorded
- [ ] Video is 6–10 minutes
- [ ] Backend startup shown
- [ ] Code walkthrough shown
- [ ] API requests shown
- [ ] JSON responses shown
- [ ] Database and tables shown
- [ ] Database refreshed after every modifying API
- [ ] POST database insertion shown
- [ ] PUT database update shown
- [ ] DELETE database removal shown
- [ ] Repeating-reminder behavior shown
- [ ] Cascade deletion shown
- [ ] Automated test result shown
- [ ] Issues and resolutions discussed
- [ ] Video uploaded
- [ ] Video sharing permissions verified
- [ ] Video link added to README or LMS submission

## Security and Repository Check

- [x] `.env` is ignored
- [x] `.venv` is ignored
- [x] Local `.db` files are ignored
- [x] Password hashes are never returned by APIs
- [x] No real credentials are stored in Postman
- [ ] Review `git status`
- [ ] Review staged files before commit
- [ ] Confirm no personal or secret data is included

## Final Submission

- [ ] GitHub repository link submitted
- [ ] Video link submitted
- [ ] Instructor can open both links
- [ ] Correct Milestone 2 assignment selected
- [ ] Submission completed before deadline
