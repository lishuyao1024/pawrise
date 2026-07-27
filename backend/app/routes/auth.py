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
