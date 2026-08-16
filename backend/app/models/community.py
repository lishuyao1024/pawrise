from ..extensions import db
from .base import TimestampMixin, isoformat_utc


class CommunityPost(TimestampMixin, db.Model):
    __tablename__ = "community_posts"
    __table_args__ = (
        db.CheckConstraint(
            "status IN ('published', 'hidden')",
            name="ck_community_posts_status",
        ),
        db.Index("ix_community_posts_created_at", "created_at"),
        db.Index("ix_community_posts_user_id", "user_id"),
        db.Index("ix_community_posts_pet_id", "pet_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    pet_id = db.Column(
        db.Integer,
        db.ForeignKey("pets.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_memory_id = db.Column(
        db.Integer,
        db.ForeignKey("memories.id", ondelete="SET NULL"),
    )
    title = db.Column(db.String(150), nullable=False)
    body = db.Column(db.Text)
    image_url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="published")

    author = db.relationship("User", foreign_keys=[user_id])
    pet = db.relationship("Pet", foreign_keys=[pet_id])
    source_memory = db.relationship("Memory", foreign_keys=[source_memory_id])
    likes = db.relationship(
        "CommunityLike",
        cascade="all, delete-orphan",
        passive_deletes=True,
        back_populates="post",
    )
    reports = db.relationship(
        "CommunityReport",
        cascade="all, delete-orphan",
        passive_deletes=True,
        back_populates="post",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "pet_id": self.pet_id,
            "source_memory_id": self.source_memory_id,
            "title": self.title,
            "body": self.body,
            "image_url": self.image_url,
            "status": self.status,
            "created_at": isoformat_utc(self.created_at),
            "updated_at": isoformat_utc(self.updated_at),
        }


class CommunityLike(TimestampMixin, db.Model):
    __tablename__ = "community_likes"
    __table_args__ = (
        db.UniqueConstraint("post_id", "user_id", name="uq_community_like"),
        db.Index("ix_community_likes_post_id", "post_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer,
        db.ForeignKey("community_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    post = db.relationship("CommunityPost", back_populates="likes")


class CommunityReport(TimestampMixin, db.Model):
    __tablename__ = "community_reports"
    __table_args__ = (
        db.UniqueConstraint("post_id", "reporter_id", name="uq_community_report"),
        db.CheckConstraint(
            "status IN ('pending', 'resolved')",
            name="ck_community_reports_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer,
        db.ForeignKey("community_posts.id", ondelete="CASCADE"),
        nullable=False,
    )
    reporter_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reason = db.Column(db.String(250), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")

    post = db.relationship("CommunityPost", back_populates="reports")


class CommunityBlock(TimestampMixin, db.Model):
    __tablename__ = "community_blocks"
    __table_args__ = (
        db.UniqueConstraint("blocker_id", "blocked_user_id", name="uq_community_block"),
        db.CheckConstraint(
            "blocker_id <> blocked_user_id",
            name="ck_community_blocks_not_self",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    blocked_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
