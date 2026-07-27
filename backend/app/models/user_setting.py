from ..extensions import db
from .base import TimestampMixin, isoformat_utc


class UserSetting(TimestampMixin, db.Model):
    __tablename__ = "user_settings"
    __table_args__ = (
        db.CheckConstraint(
            "default_lead_days BETWEEN 0 AND 30",
            name="ck_settings_lead_days",
        ),
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    email_reminders = db.Column(db.Boolean, nullable=False, default=True)
    default_lead_days = db.Column(db.Integer, nullable=False, default=7)
    show_overdue_alerts = db.Column(db.Boolean, nullable=False, default=True)

    user = db.relationship("User", back_populates="settings")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "email_reminders": self.email_reminders,
            "default_lead_days": self.default_lead_days,
            "show_overdue_alerts": self.show_overdue_alerts,
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }
