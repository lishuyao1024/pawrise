from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from ..api import clean_string, error_response, success_response
from ..extensions import db
from ..models import (
    AdminAuditLog,
    CommunityBlock,
    CommunityLike,
    CommunityPost,
    CommunityReport,
    Memory,
    Pet,
    User,
)


community_bp = Blueprint("community", __name__, url_prefix="/api/community")


def authenticated_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)


def serialize_post(post, viewer_id):
    payload = post.to_dict()
    payload.update(
        {
            "author": {
                "id": post.author.id,
                "full_name": post.author.full_name,
                "avatar_url": post.author.avatar_url,
            },
            "pet": {
                "id": post.pet.id,
                "name": post.pet.name,
                "species": post.pet.species,
                "breed": post.pet.breed,
                "image_url": post.pet.image_url,
            },
            "like_count": len(post.likes),
            "viewer_has_liked": any(like.user_id == viewer_id for like in post.likes),
            "viewer_owns": post.user_id == viewer_id,
        }
    )
    return payload


def visible_post_or_none(post_id, viewer):
    post = db.session.get(CommunityPost, post_id)
    if post is None:
        return None
    if post.status == "published" or post.user_id == viewer.id or viewer.role == "admin":
        return post
    return None


@community_bp.get("/posts")
@jwt_required()
def list_posts():
    viewer = authenticated_user()
    if viewer is None:
        return error_response("USER_NOT_FOUND", "The authenticated user no longer exists.", 404)

    blocked_user_ids = {
        row.blocked_user_id
        for row in CommunityBlock.query.filter_by(blocker_id=viewer.id).all()
    }
    blocked_user_ids.update(
        row.blocker_id
        for row in CommunityBlock.query.filter_by(blocked_user_id=viewer.id).all()
    )
    query = CommunityPost.query.filter(CommunityPost.status == "published")
    if blocked_user_ids:
        query = query.filter(~CommunityPost.user_id.in_(blocked_user_ids))

    if request.args.get("mine") == "true":
        query = query.filter(CommunityPost.user_id == viewer.id)

    species = request.args.get("species")
    if species:
        normalized_species = species.strip().lower()
        if normalized_species not in {"cat", "dog"}:
            return error_response("VALIDATION_ERROR", "species must be cat or dog.", 400)
        query = query.filter(
            CommunityPost.pet.has(db.func.lower(Pet.species) == normalized_species)
        )

    search = clean_string(request.args.get("search"), max_length=100)
    if request.args.get("search") and search is None:
        return error_response("VALIDATION_ERROR", "Search must be 100 characters or fewer.", 400)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                CommunityPost.title.ilike(term),
                CommunityPost.body.ilike(term),
                CommunityPost.pet.has(Pet.name.ilike(term)),
                CommunityPost.author.has(User.full_name.ilike(term)),
            )
        )

    posts = query.order_by(CommunityPost.created_at.desc(), CommunityPost.id.desc()).limit(50).all()
    return success_response([serialize_post(post, viewer.id) for post in posts])


@community_bp.post("/posts")
@jwt_required()
def create_post():
    viewer = authenticated_user()
    payload = request.get_json(silent=True)
    if viewer is None:
        return error_response("USER_NOT_FOUND", "The authenticated user no longer exists.", 404)
    if not isinstance(payload, dict):
        return error_response("VALIDATION_ERROR", "A JSON request body is required.", 400)

    memory_id = payload.get("memory_id")
    if isinstance(memory_id, bool):
        memory_id = None
    try:
        memory_id = int(memory_id)
    except (TypeError, ValueError):
        memory_id = None
    memory = (
        Memory.query.join(Pet)
        .filter(Memory.id == memory_id, Pet.user_id == viewer.id)
        .first()
        if memory_id
        else None
    )
    if memory is None:
        return error_response("MEMORY_NOT_FOUND", "Select one of your memories to share.", 404)
    if not memory.image_url:
        return error_response("IMAGE_REQUIRED", "A community post requires a photo.", 400)

    existing = CommunityPost.query.filter_by(
        source_memory_id=memory.id,
        user_id=viewer.id,
        status="published",
    ).first()
    if existing is not None:
        return error_response("MEMORY_ALREADY_SHARED", "This memory is already shared.", 409)

    post = CommunityPost(
        user_id=viewer.id,
        pet_id=memory.pet_id,
        source_memory_id=memory.id,
        title=memory.title,
        body=memory.description,
        image_url=memory.image_url,
    )
    db.session.add(post)
    db.session.commit()
    return success_response(serialize_post(post, viewer.id), "Memory shared with Community.", 201)


@community_bp.delete("/posts/<int:post_id>")
@jwt_required()
def delete_post(post_id):
    viewer = authenticated_user()
    post = db.session.get(CommunityPost, post_id)
    if viewer is None or post is None:
        return error_response("POST_NOT_FOUND", "Community post not found.", 404)
    if post.user_id != viewer.id and viewer.role != "admin":
        return error_response("FORBIDDEN", "You cannot delete this post.", 403)
    if viewer.role == "admin":
        db.session.add(AdminAuditLog(
            admin_user_id=viewer.id,
            action="delete_post",
            target_type="community_post",
            target_id=post.id,
            target_label=post.title,
            details={"author_id": post.user_id},
        ))
    db.session.delete(post)
    db.session.commit()
    return success_response({"deleted_post_id": post_id}, "Community post deleted.")


@community_bp.patch("/posts/<int:post_id>/moderation")
@jwt_required()
def moderate_post(post_id):
    viewer = authenticated_user()
    if viewer is None or viewer.role != "admin":
        return error_response("FORBIDDEN", "Administrator access is required.", 403)
    post = db.session.get(CommunityPost, post_id)
    if post is None:
        return error_response("POST_NOT_FOUND", "Community post not found.", 404)
    payload = request.get_json(silent=True)
    status = payload.get("status") if isinstance(payload, dict) else None
    if status not in {"published", "hidden"}:
        return error_response("VALIDATION_ERROR", "status must be published or hidden.", 400)
    post.status = status
    db.session.add(AdminAuditLog(
        admin_user_id=viewer.id,
        action="hide_post" if status == "hidden" else "restore_post",
        target_type="community_post",
        target_id=post.id,
        target_label=post.title,
        details={"status": status, "author_id": post.user_id},
    ))
    db.session.commit()
    return success_response(serialize_post(post, viewer.id), "Moderation status updated.")


@community_bp.post("/posts/<int:post_id>/likes")
@jwt_required()
def like_post(post_id):
    viewer = authenticated_user()
    post = visible_post_or_none(post_id, viewer) if viewer else None
    if post is None:
        return error_response("POST_NOT_FOUND", "Community post not found.", 404)
    like = CommunityLike.query.filter_by(post_id=post.id, user_id=viewer.id).first()
    if like is None:
        db.session.add(CommunityLike(post_id=post.id, user_id=viewer.id))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
    post = db.session.get(CommunityPost, post.id)
    return success_response(serialize_post(post, viewer.id), "Post liked.")


@community_bp.delete("/posts/<int:post_id>/likes")
@jwt_required()
def unlike_post(post_id):
    viewer = authenticated_user()
    post = visible_post_or_none(post_id, viewer) if viewer else None
    if post is None:
        return error_response("POST_NOT_FOUND", "Community post not found.", 404)
    like = CommunityLike.query.filter_by(post_id=post.id, user_id=viewer.id).first()
    if like is not None:
        db.session.delete(like)
        db.session.commit()
    return success_response(serialize_post(post, viewer.id), "Post unliked.")


@community_bp.post("/posts/<int:post_id>/reports")
@jwt_required()
def report_post(post_id):
    viewer = authenticated_user()
    post = visible_post_or_none(post_id, viewer) if viewer else None
    if post is None:
        return error_response("POST_NOT_FOUND", "Community post not found.", 404)
    if post.user_id == viewer.id:
        return error_response("VALIDATION_ERROR", "You cannot report your own post.", 400)
    payload = request.get_json(silent=True)
    reason = clean_string(payload.get("reason"), max_length=250) if isinstance(payload, dict) else None
    if reason is None:
        return error_response("VALIDATION_ERROR", "A report reason is required.", 400)
    report = CommunityReport.query.filter_by(post_id=post.id, reporter_id=viewer.id).first()
    if report is None:
        db.session.add(CommunityReport(post_id=post.id, reporter_id=viewer.id, reason=reason))
    else:
        report.reason = reason
        report.status = "pending"
    db.session.commit()
    return success_response({"reported_post_id": post.id}, "Report submitted.", 201)


@community_bp.post("/blocks/<int:user_id>")
@jwt_required()
def block_user(user_id):
    viewer = authenticated_user()
    if viewer is None or user_id == viewer.id:
        return error_response("VALIDATION_ERROR", "You cannot block this account.", 400)
    if db.session.get(User, user_id) is None:
        return error_response("USER_NOT_FOUND", "User not found.", 404)
    block = CommunityBlock.query.filter_by(blocker_id=viewer.id, blocked_user_id=user_id).first()
    if block is None:
        db.session.add(CommunityBlock(blocker_id=viewer.id, blocked_user_id=user_id))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
    return success_response({"blocked_user_id": user_id}, "User blocked.", 201)


@community_bp.delete("/blocks/<int:user_id>")
@jwt_required()
def unblock_user(user_id):
    viewer = authenticated_user()
    block = CommunityBlock.query.filter_by(blocker_id=viewer.id, blocked_user_id=user_id).first() if viewer else None
    if block is not None:
        db.session.delete(block)
        db.session.commit()
    return success_response({"unblocked_user_id": user_id}, "User unblocked.")
