from ..extensions import db
from .base import TimestampMixin, isoformat_utc


CARE_TYPES = (
    "vaccine",
    "deworming",
    "checkup",
    "medication",
    "weight",
    "other",
)

REPEAT_RULES = (
    "none",
    "monthly",
    "every_2_months",
    "every_3_months",
    "every_6_months",
    "yearly",
)


class CareReminder(TimestampMixin, db.Model):
    __tablename__ = "care_reminders"
    __table_args__ = (
        db.CheckConstraint(
            f"care_type IN {CARE_TYPES}",
            name="ck_reminders_care_type",
        ),
        db.CheckConstraint(
            f"repeat_rule IN {REPEAT_RULES}",
            name="ck_reminders_repeat_rule",
        ),
        db.Index("ix_reminders_pet_id", "pet_id"),
        db.Index("ix_reminders_due_date", "due_date"),
        db.Index("ix_reminders_completed_at", "completed_at"),
        db.Index("ix_reminders_medical_record_id", "medical_record_id"),
        db.Index(
            "ix_reminders_pet_completion_due",
            "pet_id",
            "completed_at",
            "due_date",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    pet_id = db.Column(
        db.Integer,
        db.ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_reminder_id = db.Column(
        db.Integer,
        db.ForeignKey("care_reminders.id", ondelete="SET NULL"),
    )
    medical_record_id = db.Column(
        db.Integer,
        db.ForeignKey("medical_records.id", ondelete="SET NULL"),
    )
    care_type = db.Column(db.String(30), nullable=False)
    custom_label = db.Column(db.String(100))
    due_date = db.Column(db.Date, nullable=False)
    repeat_rule = db.Column(db.String(30), nullable=False, default="none")
    notes = db.Column(db.Text)
    completed_at = db.Column(db.DateTime(timezone=True))

    pet = db.relationship("Pet", back_populates="reminders")
    source_reminder = db.relationship(
        "CareReminder",
        remote_side="CareReminder.id",
        backref=db.backref("generated_reminders"),
    )
    medical_record = db.relationship("MedicalRecord", back_populates="reminders")

    def to_dict(self):
        return {
            "id": self.id,
            "pet_id": self.pet_id,
            "source_reminder_id": self.source_reminder_id,
            "medical_record_id": self.medical_record_id,
            "source_type": "medical_record" if self.medical_record_id else "manual",
            "care_type": self.care_type,
            "custom_label": self.custom_label,
            "due_date": self.due_date.isoformat(),
            "repeat_rule": self.repeat_rule,
            "notes": self.notes,
            "completed_at": isoformat_utc(self.completed_at),
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }
