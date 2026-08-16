from sqlalchemy import inspect, text

from app import create_app, upgrade_existing_sqlite_schema
from app.extensions import db
from app.models import Pet, User


EXPECTED_TABLES = {
    "users",
    "pets",
    "care_reminders",
    "memories",
    "medical_records",
    "user_settings",
    "community_posts",
    "community_likes",
    "community_reports",
    "community_blocks",
}

EXPECTED_INDEXES = {
    "ix_pets_user_id",
    "ix_reminders_pet_id",
    "ix_reminders_due_date",
    "ix_reminders_completed_at",
    "ix_reminders_medical_record_id",
    "ix_reminders_pet_completion_due",
    "ix_memories_pet_id",
    "ix_memories_memory_date",
    "ix_medical_records_pet_id",
    "ix_medical_records_visit_date",
    "ix_community_posts_created_at",
    "ix_community_posts_user_id",
    "ix_community_posts_pet_id",
    "ix_community_likes_post_id",
}


def test_database_contains_core_tables(app):
    with app.app_context():
        inspector = inspect(db.engine)
        assert set(inspector.get_table_names()) == EXPECTED_TABLES


def test_users_table_contains_profile_and_community_role(app):
    with app.app_context():
        inspector = inspect(db.engine)
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        assert {"avatar_url", "role"} <= user_columns


def test_reminders_table_contains_custom_repeat_fields_and_constraints(app):
    with app.app_context():
        inspector = inspect(db.engine)
        reminder_columns = {
            column["name"] for column in inspector.get_columns("care_reminders")
        }
        constraints = {
            constraint["name"]
            for constraint in inspector.get_check_constraints("care_reminders")
        }
        assert {"repeat_interval", "repeat_unit"} <= reminder_columns
        assert {
            "ck_reminders_repeat_rule",
            "ck_reminders_custom_repeat",
        } <= constraints


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


def test_custom_repeat_schema_upgrade_preserves_legacy_reminder_chain(tmp_path):
    database_path = tmp_path / "legacy-pawrise.db"
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
            "JWT_SECRET_KEY": "test-only-secret-at-least-32-bytes-long",
        }
    )
    with test_app.app_context():
        db.create_all()
        user = User(
            full_name="Legacy Owner",
            email="legacy@example.com",
            password_hash="test-hash",
        )
        pet = Pet(user=user, name="Legacy Pet", species="Cat")
        db.session.add_all([user, pet])
        db.session.commit()

        db.session.execute(text("DROP TABLE care_reminders"))
        db.session.execute(
            text(
                """
                CREATE TABLE care_reminders (
                    id INTEGER NOT NULL,
                    pet_id INTEGER NOT NULL,
                    source_reminder_id INTEGER,
                    medical_record_id INTEGER,
                    care_type VARCHAR(30) NOT NULL,
                    custom_label VARCHAR(100),
                    due_date DATE NOT NULL,
                    repeat_rule VARCHAR(30) NOT NULL,
                    notes TEXT,
                    completed_at DATETIME,
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    PRIMARY KEY (id),
                    CONSTRAINT ck_reminders_care_type CHECK (
                        care_type IN (
                            'vaccine', 'deworming', 'checkup', 'medication',
                            'weight', 'activity', 'grooming', 'other'
                        )
                    ),
                    CONSTRAINT ck_reminders_repeat_rule CHECK (
                        repeat_rule IN (
                            'none', 'weekly', 'every_2_weeks', 'monthly',
                            'every_2_months', 'every_3_months',
                            'every_6_months', 'yearly'
                        )
                    ),
                    FOREIGN KEY(pet_id) REFERENCES pets (id) ON DELETE CASCADE,
                    FOREIGN KEY(source_reminder_id)
                        REFERENCES care_reminders (id) ON DELETE SET NULL,
                    FOREIGN KEY(medical_record_id)
                        REFERENCES medical_records (id) ON DELETE SET NULL
                )
                """
            )
        )
        db.session.execute(
            text(
                """
                INSERT INTO care_reminders (
                    id, pet_id, source_reminder_id, medical_record_id,
                    care_type, custom_label, due_date, repeat_rule, notes,
                    completed_at, created_at, updated_at
                ) VALUES
                (
                    101, :pet_id, NULL, NULL, 'medication', NULL,
                    '2026-08-20', 'weekly', 'Legacy parent',
                    '2026-08-20 15:00:00', '2026-08-01 10:00:00',
                    '2026-08-20 15:00:00'
                ),
                (
                    102, :pet_id, 101, NULL, 'medication', NULL,
                    '2026-08-27', 'weekly', 'Legacy child',
                    NULL, '2026-08-20 15:00:00', '2026-08-20 15:00:00'
                )
                """
            ),
            {"pet_id": pet.id},
        )
        db.session.commit()
        db.session.remove()

        upgrade_existing_sqlite_schema()
        upgrade_existing_sqlite_schema()

        rows = db.session.execute(
            text(
                """
                SELECT id, source_reminder_id, due_date, repeat_rule,
                       repeat_interval, repeat_unit, notes, completed_at,
                       created_at, updated_at
                FROM care_reminders
                ORDER BY id
                """
            )
        ).mappings().all()
        assert [row["id"] for row in rows] == [101, 102]
        assert rows[0]["source_reminder_id"] is None
        assert rows[1]["source_reminder_id"] == 101
        assert [row["due_date"] for row in rows] == ["2026-08-20", "2026-08-27"]
        assert [row["repeat_rule"] for row in rows] == ["weekly", "weekly"]
        assert all(row["repeat_interval"] is None for row in rows)
        assert all(row["repeat_unit"] is None for row in rows)
        assert [row["notes"] for row in rows] == ["Legacy parent", "Legacy child"]
        assert rows[0]["completed_at"] == "2026-08-20 15:00:00"
        assert rows[1]["completed_at"] is None
        assert rows[0]["created_at"] == "2026-08-01 10:00:00"
        assert rows[1]["created_at"] == "2026-08-20 15:00:00"

        inspector = inspect(db.engine)
        constraint_names = {
            item["name"]
            for item in inspector.get_check_constraints("care_reminders")
        }
        index_names = {
            item["name"] for item in inspector.get_indexes("care_reminders")
        }
        assert "ck_reminders_custom_repeat" in constraint_names
        assert {
            "ix_reminders_pet_id",
            "ix_reminders_due_date",
            "ix_reminders_completed_at",
            "ix_reminders_medical_record_id",
            "ix_reminders_pet_completion_due",
        } <= index_names
        assert db.session.execute(text("PRAGMA foreign_key_check")).all() == []
        foreign_key_actions = {
            row[3]: row[6]
            for row in db.session.execute(
                text("PRAGMA foreign_key_list(care_reminders)")
            ).all()
        }
        assert foreign_key_actions == {
            "medical_record_id": "SET NULL",
            "source_reminder_id": "SET NULL",
            "pet_id": "CASCADE",
        }
        assert db.session.execute(
            text(
                "SELECT COUNT(*) FROM sqlite_master "
                "WHERE type = 'table' AND name = 'care_reminders_legacy'"
            )
        ).scalar_one() == 0
