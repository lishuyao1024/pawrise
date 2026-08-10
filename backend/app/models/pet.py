from datetime import date

from ..extensions import db
from .base import TimestampMixin, isoformat_utc


class Pet(TimestampMixin, db.Model):
    __tablename__ = "pets"
    __table_args__ = (
        db.CheckConstraint(
            "weight_lb IS NULL OR weight_lb > 0",
            name="ck_pets_weight_positive",
        ),
        db.CheckConstraint(
            "sex IS NULL OR sex IN ('male', 'female')",
            name="ck_pets_sex_valid",
        ),
        db.CheckConstraint(
            "estimated_age_value IS NULL OR estimated_age_value > 0",
            name="ck_pets_estimated_age_positive",
        ),
        db.CheckConstraint(
            "estimated_age_unit IS NULL OR estimated_age_unit IN ('months', 'years')",
            name="ck_pets_estimated_age_unit_valid",
        ),
        db.Index("ix_pets_user_id", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = db.Column(db.String(100), nullable=False)
    species = db.Column(db.String(50), nullable=False)
    sex = db.Column(db.String(10))
    breed = db.Column(db.String(100))
    birthday = db.Column(db.Date)
    estimated_age_value = db.Column(db.Integer)
    estimated_age_unit = db.Column(db.String(10))
    adoption_date = db.Column(db.Date)
    weight_lb = db.Column(db.Numeric(6, 2))
    image_url = db.Column(db.String(500))
    notes = db.Column(db.Text)

    user = db.relationship("User", back_populates="pets")
    reminders = db.relationship(
        "CareReminder",
        back_populates="pet",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    memories = db.relationship(
        "Memory",
        back_populates="pet",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    medical_records = db.relationship(
        "MedicalRecord",
        back_populates="pet",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def age_years(self):
        if self.birthday is not None:
            today = date.today()
            return (
                today.year
                - self.birthday.year
                - ((today.month, today.day) < (self.birthday.month, self.birthday.day))
            )
        if self.estimated_age_value is None:
            return None
        if self.estimated_age_unit == "months":
            return self.estimated_age_value // 12
        return self.estimated_age_value

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "species": self.species,
            "sex": self.sex,
            "breed": self.breed,
            "birthday": self.birthday.isoformat() if self.birthday else None,
            "estimated_age_value": self.estimated_age_value,
            "estimated_age_unit": self.estimated_age_unit,
            "age_is_estimated": self.birthday is None
            and self.estimated_age_value is not None,
            "adoption_date": (
                self.adoption_date.isoformat() if self.adoption_date else None
            ),
            "age_years": self.age_years,
            "weight_lb": float(self.weight_lb) if self.weight_lb is not None else None,
            "image_url": self.image_url,
            "notes": self.notes,
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }
