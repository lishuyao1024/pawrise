from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import error_response, success_response
from ..extensions import db
from ..models import AdminAuditLog, CommunityPost, CommunityReport, User


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def current_admin():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    user = db.session.get(User, user_id)
    if user is None or user.role != "admin":
        return None

    return user


@admin_bp.get("/me")
@jwt_required()
def get_admin():
    admin = current_admin()

    if admin is None:
        return error_response(
            "FORBIDDEN",
            "Administrator access is required.",
            403,
        )

    return success_response(admin.to_dict())


@admin_bp.get("/posts")
@jwt_required()
def list_admin_posts():
    admin = current_admin()

    if admin is None:
        return error_response(
            "FORBIDDEN",
            "Administrator access is required.",
            403,
        )

    posts = CommunityPost.query.order_by(
        CommunityPost.created_at.desc(),
        CommunityPost.id.desc(),
    ).all()

    results = []
    for post in posts:
        payload = post.to_dict()
        payload.update(
            {
                "author": {
                    "id": post.author.id,
                    "full_name": post.author.full_name,
                    "email": post.author.email,
                },
                "pet": {
                    "id": post.pet.id,
                    "name": post.pet.name,
                    "species": post.pet.species,
                },
                "like_count": len(post.likes),
                "report_count": len(post.reports),
                "pending_report_count": sum(
                    report.status == "pending" for report in post.reports
                ),
                "reports": [
                    {
                        "id": report.id,
                        "reason": report.reason,
                        "status": report.status,
                        "created_at": report.to_dict()["created_at"] if hasattr(report, "to_dict") else report.created_at.isoformat(),
                        "reporter": (
                            lambda reporter: {
                                "id": reporter.id,
                                "full_name": reporter.full_name,
                                "email": reporter.email,
                            }
                        )(db.session.get(User, report.reporter_id)),
                    }
                    for report in post.reports
                ],
            }
        )
        results.append(payload)

    return success_response(results)


@admin_bp.patch("/reports/<int:report_id>")
@jwt_required()
def update_admin_report(report_id):
    admin = current_admin()
    if admin is None:
        return error_response("FORBIDDEN", "Administrator access is required.", 403)

    report = db.session.get(CommunityReport, report_id)
    if report is None:
        return error_response("NOT_FOUND", "Report not found.", 404)

    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"pending", "resolved"}:
        return error_response("VALIDATION_ERROR", "Status must be pending or resolved.", 422)

    report.status = status
    db.session.add(AdminAuditLog(
        admin_user_id=admin.id,
        action="resolve_report" if status == "resolved" else "reopen_report",
        target_type="community_report",
        target_id=report.id,
        target_label=report.post.title,
        details={"status": status, "post_id": report.post_id},
    ))
    db.session.commit()
    return success_response({"id": report.id, "status": report.status})


@admin_bp.get("/logs")
@jwt_required()
def list_admin_logs():
    if current_admin() is None:
        return error_response("FORBIDDEN", "Administrator access is required.", 403)

    logs = AdminAuditLog.query.order_by(
        AdminAuditLog.created_at.desc(),
        AdminAuditLog.id.desc(),
    ).limit(200).all()
    results = []
    for log in logs:
        payload = log.to_dict()
        owner_id = payload["details"].get("author_id")
        if not owner_id and payload["details"].get("post_id"):
            post = db.session.get(CommunityPost, payload["details"]["post_id"])
            owner_id = post.user_id if post else None
        owner = db.session.get(User, owner_id) if owner_id else None
        payload["target_owner"] = (
            {
                "id": owner.id,
                "full_name": owner.full_name,
                "email": owner.email,
            }
            if owner
            else None
        )
        results.append(payload)
    return success_response(results)


@admin_bp.get("/users")
@jwt_required()
def list_admin_users():
    if current_admin() is None:
        return error_response("FORBIDDEN", "Administrator access is required.", 403)

    users = User.query.order_by(User.created_at.desc(), User.id.desc()).all()
    return success_response([
        {
            **user.to_dict(),
            "pet_count": len(user.pets),
            "community_post_count": CommunityPost.query.filter_by(user_id=user.id).count(),
        }
        for user in users
    ])


@admin_bp.get("/users/<int:user_id>")
@jwt_required()
def get_admin_user(user_id):
    if current_admin() is None:
        return error_response("FORBIDDEN", "Administrator access is required.", 403)

    user = db.session.get(User, user_id)
    if user is None:
        return error_response("NOT_FOUND", "User not found.", 404)

    pets = []
    for pet in user.pets:
        pets.append({
            **pet.to_dict(),
            "memories": [memory.to_dict() for memory in pet.memories],
            "medical_records": [record.to_dict() for record in pet.medical_records],
            "reminders": [reminder.to_dict() for reminder in pet.reminders],
        })

    return success_response({
        **user.to_dict(),
        "pets": pets,
        "community_posts": [
            post.to_dict()
            for post in CommunityPost.query.filter_by(user_id=user.id)
            .order_by(CommunityPost.created_at.desc()).all()
        ],
    })
