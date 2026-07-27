from sqlalchemy import inspect, text

from app.extensions import db


EXPECTED_TABLES = {
    "users",
    "pets",
    "care_reminders",
    "memories",
    "user_settings",
}

EXPECTED_INDEXES = {
    "ix_pets_user_id",
    "ix_reminders_pet_id",
    "ix_reminders_due_date",
    "ix_reminders_completed_at",
    "ix_reminders_pet_completion_due",
    "ix_memories_pet_id",
    "ix_memories_memory_date",
}


def test_database_contains_five_core_tables(app):
    with app.app_context():
        inspector = inspect(db.engine)
        assert set(inspector.get_table_names()) == EXPECTED_TABLES


def test_database_contains_documented_indexes(app):
    with app.app_context():
        inspector = inspect(db.engine)
        indexes = {
            index["name"]
            for table_name in EXPECTED_TABLES
            for index in inspector.get_indexes(table_name)
        }
        assert EXPECTED_INDEXES <= indexes


def test_sqlite_foreign_keys_are_enabled(app):
    with app.app_context():
        enabled = db.session.execute(text("PRAGMA foreign_keys")).scalar()
        assert enabled == 1
