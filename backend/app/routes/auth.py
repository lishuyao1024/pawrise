from urllib.parse import urlparse

from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from sqlalchemy.exc import IntegrityError

from ..api import (
    clean_string,
    error_response,
    normalize_email,
    success_response,
)
from ..extensions import db
from ..models import User, UserSetting


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def current_user():
    identity = get_jwt_identity()
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None
    return db.session.get(User, user_id)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A JSON request body is required.",
            400,
        )

    details = {}
    full_name = clean_string(payload.get("full_name"), max_length=100)
    email = normalize_email(payload.get("email"))
    password = payload.get("password")

    if full_name is None:
        details["full_name"] = "Full name is required and must be 100 characters or fewer."
    if email is None:
        details["email"] = "A valid email address is required."
    if not isinstance(password, str) or len(password) < 8:
        details["password"] = "Password must contain at least 8 characters."

    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Registration validation failed.",
            400,
            details,
        )

    if User.query.filter_by(email=email).first() is not None:
        return error_response(
            "EMAIL_ALREADY_EXISTS",
            "An account with this email already exists.",
            409,
        )

    user = User(full_name=full_name, email=email)
    user.set_password(password)
    user.settings = UserSetting()
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response(
            "EMAIL_ALREADY_EXISTS",
            "An account with this email already exists.",
            409,
        )

    access_token = create_access_token(identity=str(user.id))
    return success_response(
        {
            "user": user.to_dict(),
            "access_token": access_token,
        },
        "Account created successfully.",
        201,
    )


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A JSON request body is required.",
            400,
        )

    email = normalize_email(payload.get("email"))
    password = payload.get("password")
    if email is None or not isinstance(password, str):
        return error_response(
            "INVALID_CREDENTIALS",
            "Email or password is incorrect.",
            401,
        )

    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return error_response(
            "INVALID_CREDENTIALS",
            "Email or password is incorrect.",
            401,
        )

    access_token = create_access_token(identity=str(user.id))
    return success_response(
        {
            "user": user.to_dict(),
            "access_token": access_token,
        },
        "Login successful.",
    )


@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user = current_user()
    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "The authenticated user no longer exists.",
            404,
        )
    return success_response(user.to_dict())


@auth_bp.patch("/me")
@jwt_required()
def update_current_user():
    user = current_user()
    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "The authenticated user no longer exists.",
            404,
        )

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A JSON request body is required.",
            400,
        )

    supported_fields = {"full_name", "avatar_url"}
    if not supported_fields.intersection(payload):
        return error_response(
            "VALIDATION_ERROR",
            "Provide a full name or avatar to update.",
            400,
        )

    details = {}
    next_full_name = user.full_name
    next_avatar_url = user.avatar_url
    if "full_name" in payload:
        full_name = clean_string(payload.get("full_name"), max_length=100)
        if full_name is None:
            details["full_name"] = (
                "Full name is required and must be 100 characters or fewer."
            )
        else:
            next_full_name = full_name

    if "avatar_url" in payload:
        avatar_value = payload.get("avatar_url")
        if avatar_value is None or (
            isinstance(avatar_value, str) and not avatar_value.strip()
        ):
            next_avatar_url = None
        else:
            avatar_url = clean_string(avatar_value, max_length=500)
            parsed_url = urlparse(avatar_url or "")
            is_http_url = (
                parsed_url.scheme in {"http", "https"}
                and bool(parsed_url.netloc)
                and parsed_url.path.startswith("/api/uploads/")
            )
            is_uploaded_path = bool(avatar_url) and avatar_url.startswith(
                "/api/uploads/"
            )
            if avatar_url is None or not (is_http_url or is_uploaded_path):
                details["avatar_url"] = "Avatar must be a valid uploaded image URL."
            else:
                next_avatar_url = avatar_url

    if details:
        db.session.rollback()
        return error_response(
            "VALIDATION_ERROR",
            "Profile validation failed.",
            400,
            details,
        )

    user.full_name = next_full_name
    user.avatar_url = next_avatar_url
    db.session.commit()
    return success_response(user.to_dict(), "Profile updated successfully.")
