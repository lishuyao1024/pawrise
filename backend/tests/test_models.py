from datetime import date

from app.extensions import db
from app.models import CareReminder, MedicalRecord, Memory, Pet, User, UserSetting


def test_core_models_persist_relationships_and_cascade(app):
    with app.app_context():
        user = User(
            full_name="Shuyao Li",
            email="shuyao@example.com",
            password_hash="test-hash",
        )
        user.settings = UserSetting(
            email_reminders=True,
            default_lead_days=7,
            show_overdue_alerts=True,
        )
        pet = Pet(
            name="Dami",
            species="Cat",
            breed="Siamese",
            birthday=date(2023, 4, 18),
            weight_lb=9.2,
        )
        user.pets.append(pet)

        reminder = CareReminder(
            care_type="medication",
            due_date=date(2026, 8, 24),
            repeat_rule="every_2_months",
            notes="Flea prevention refill.",
        )
        next_reminder = CareReminder(
            care_type="medication",
            due_date=date(2026, 10, 24),
            repeat_rule="every_2_months",
            source_reminder=reminder,
        )
        memory = Memory(
            title="Window sunshine nap",
            memory_date=date(2026, 7, 8),
            category="daily_moment",
        )
        medical_record = MedicalRecord(
            title="Spay surgery discharge",
            source_text="Give Carprofen 25 mg once daily.",
            extracted_data={"medications": []},
        )
        pet.reminders.extend([reminder, next_reminder])
        pet.memories.append(memory)
        pet.medical_records.append(medical_record)
        reminder.medical_record = medical_record

        db.session.add(user)
        db.session.commit()

        assert User.query.count() == 1
        assert UserSetting.query.count() == 1
        assert Pet.query.count() == 1
        assert CareReminder.query.count() == 2
        assert Memory.query.count() == 1
        assert MedicalRecord.query.count() == 1
        assert reminder.medical_record_id == medical_record.id
        assert next_reminder.source_reminder_id == reminder.id
        assert user.settings.default_lead_days == 7

        db.session.delete(pet)
        db.session.commit()

        assert Pet.query.count() == 0
        assert CareReminder.query.count() == 0
        assert Memory.query.count() == 0
        assert MedicalRecord.query.count() == 0
        assert User.query.count() == 1
        assert UserSetting.query.count() == 1

        db.session.delete(user)
        db.session.commit()

        assert User.query.count() == 0
        assert UserSetting.query.count() == 0
