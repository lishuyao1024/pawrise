from ..extensions import db
from .base import TimestampMixin, isoformat_utc


RECORD_STATUSES = ("draft", "confirmed")


class MedicalRecord(TimestampMixin, db.Model):
    __tablename__ = "medical_records"
    __table_args__ = (
        db.CheckConstraint(
            f"status IN {RECORD_STATUSES}",
            name="ck_medical_records_status",
        ),
        db.Index("ix_medical_records_pet_id", "pet_id"),
        db.Index("ix_medical_records_visit_date", "visit_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    pet_id = db.Column(
        db.Integer,
        db.ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = db.Column(db.String(150), nullable=False)
    visit_date = db.Column(db.Date)
    original_filename = db.Column(db.String(255))
    stored_filename = db.Column(db.String(255))
    mime_type = db.Column(db.String(100))
    source_text = db.Column(db.Text, nullable=False)
    extracted_data = db.Column(db.JSON, nullable=False, default=dict)
    confirmed_data = db.Column(db.JSON)
    status = db.Column(db.String(20), nullable=False, default="draft")
    confirmed_at = db.Column(db.DateTime(timezone=True))

    pet = db.relationship("Pet", back_populates="medical_records")
    reminders = db.relationship(
        "CareReminder",
        back_populates="medical_record",
        passive_deletes=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "pet_id": self.pet_id,
            "pet_name": self.pet.name if self.pet else None,
            "title": self.title,
            "visit_date": self.visit_date.isoformat() if self.visit_date else None,
            "original_filename": self.original_filename,
            "mime_type": self.mime_type,
            "source_text": self.source_text,
            "extracted_data": self.extracted_data or {},
            "confirmed_data": self.confirmed_data,
            "status": self.status,
            "confirmed_at": isoformat_utc(self.confirmed_at),
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }
