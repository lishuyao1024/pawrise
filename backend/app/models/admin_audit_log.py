from ..extensions import db
from .base import TimestampMixin, isoformat_utc


class AdminAuditLog(TimestampMixin, db.Model):
    __tablename__ = "admin_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    admin_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action = db.Column(db.String(50), nullable=False, index=True)
    target_type = db.Column(db.String(30), nullable=False)
    target_id = db.Column(db.Integer)
    target_label = db.Column(db.String(255))
    details = db.Column(db.JSON, nullable=False, default=dict)

    admin = db.relationship("User", foreign_keys=[admin_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "target_label": self.target_label,
            "details": self.details or {},
            "admin": {
                "id": self.admin.id,
                "full_name": self.admin.full_name,
                "email": self.admin.email,
            },
            "created_at": isoformat_utc(self.created_at),
        }
