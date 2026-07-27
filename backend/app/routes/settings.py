from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import error_response, success_response
from ..extensions import db
from ..models import User, UserSetting


settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


def authenticated_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def settings_for_user(user_id):
    settings = db.session.get(UserSetting, user_id)
    if settings is None and db.session.get(User, user_id) is not None:
        settings = UserSetting(user_id=user_id)
        db.session.add(settings)
        db.session.commit()
    return settings


def serialize_settings(settings):
    payload = settings.to_dict()
    payload.pop("user_id", None)
    return payload


@settings_bp.get("")
@jwt_required()
def get_settings():
    settings = settings_for_user(authenticated_user_id())
    if settings is None:
        return error_response("USER_NOT_FOUND", "Authenticated user not found.", 404)
    return success_response(serialize_settings(settings))


@settings_bp.put("")
@jwt_required()
def update_settings():
    user_id = authenticated_user_id()
    settings = settings_for_user(user_id)
    if settings is None:
        return error_response("USER_NOT_FOUND", "Authenticated user not found.", 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A JSON request body is required.",
            400,
        )

    details = {}
    for field in ("email_reminders", "show_overdue_alerts"):
        if field not in payload or not isinstance(payload[field], bool):
            details[field] = f"{field} must be true or false."

    lead_days = payload.get("default_lead_days")
    if (
        isinstance(lead_days, bool)
        or not isinstance(lead_days, int)
        or not 0 <= lead_days <= 30
    ):
        details["default_lead_days"] = (
            "default_lead_days must be an integer from 0 through 30."
        )

    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Settings validation failed.",
            400,
            details,
        )

    settings.email_reminders = payload["email_reminders"]
    settings.default_lead_days = lead_days
    settings.show_overdue_alerts = payload["show_overdue_alerts"]
    db.session.commit()
    return success_response(
        serialize_settings(settings),
        "Settings updated successfully.",
    )
