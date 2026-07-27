from ..extensions import db
from .base import TimestampMixin, isoformat_utc


MEMORY_CATEGORIES = (
    "birthday",
    "adoption",
    "daily_moment",
    "milestone",
    "growth",
    "other",
)


class Memory(TimestampMixin, db.Model):
    __tablename__ = "memories"
    __table_args__ = (
        db.Index("ix_memories_pet_id", "pet_id"),
        db.Index("ix_memories_memory_date", "memory_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    pet_id = db.Column(
        db.Integer,
        db.ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = db.Column(db.String(150), nullable=False)
    memory_date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(30))
    scene = db.Column(db.String(150))
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))

    pet = db.relationship("Pet", back_populates="memories")

    def to_dict(self):
        return {
            "id": self.id,
            "pet_id": self.pet_id,
            "title": self.title,
            "memory_date": self.memory_date.isoformat(),
            "category": self.category,
            "scene": self.scene,
            "description": self.description,
            "image_url": self.image_url,
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }
