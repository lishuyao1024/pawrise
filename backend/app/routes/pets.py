from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import (
    clean_string,
    error_response,
    parse_iso_date,
    parse_positive_decimal,
    success_response,
)
from ..extensions import db
from ..models import CareReminder, Memory, Pet, User


pets_bp = Blueprint("pets", __name__, url_prefix="/api/pets")


def authenticated_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def owned_pet_or_none(pet_id, user_id):
    return Pet.query.filter_by(id=pet_id, user_id=user_id).first()


def validate_pet_payload(payload):
    if not isinstance(payload, dict):
        return None, {"body": "A JSON request body is required."}

    values = {}
    details = {}

    values["name"] = clean_string(payload.get("name"), max_length=100)
    values["species"] = clean_string(payload.get("species"), max_length=50)
    if values["name"] is None:
        details["name"] = "Pet name is required and must be 100 characters or fewer."
    if values["species"] is None:
        details["species"] = "Species is required and must be 50 characters or fewer."

    raw_sex = payload.get("sex")
    if raw_sex in (None, ""):
        values["sex"] = None
    elif isinstance(raw_sex, str) and raw_sex.strip().lower() in {"male", "female"}:
        values["sex"] = raw_sex.strip().lower()
    else:
        values["sex"] = None
        details["sex"] = "Sex must be male or female."

    optional_strings = {
        "breed": 100,
        "image_url": 500,
    }
    for field, max_length in optional_strings.items():
        raw_value = payload.get(field)
        if raw_value in (None, ""):
            values[field] = None
        else:
            values[field] = clean_string(raw_value, max_length=max_length)
            if values[field] is None:
                details[field] = f"{field} must be {max_length} characters or fewer."

    notes = payload.get("notes")
    if notes in (None, ""):
        values["notes"] = None
    elif isinstance(notes, str):
        values["notes"] = notes.strip() or None
    else:
        values["notes"] = None
        details["notes"] = "Notes must be text."

    for field in ("birthday", "adoption_date"):
        try:
            values[field] = parse_iso_date(payload.get(field))
            if values[field] is not None and values[field] > date.today():
                details[field] = f"{field} cannot be a future date."
        except ValueError as exc:
            values[field] = None
            details[field] = str(exc)

    try:
        values["weight_lb"] = parse_positive_decimal(payload.get("weight_lb"))
    except ValueError as exc:
        values["weight_lb"] = None
        details["weight_lb"] = str(exc)

    return values, details


def pet_with_summary(pet):
    payload = pet.to_dict()
    payload["summary"] = {
        "active_reminders": CareReminder.query.filter_by(
            pet_id=pet.id,
            completed_at=None,
        ).count(),
        "completed_reminders": CareReminder.query.filter(
            CareReminder.pet_id == pet.id,
            CareReminder.completed_at.is_not(None),
        ).count(),
        "memories": Memory.query.filter_by(pet_id=pet.id).count(),
    }
    return payload


@pets_bp.post("")
@jwt_required()
def create_pet():
    user_id = authenticated_user_id()
    if user_id is None or db.session.get(User, user_id) is None:
        return error_response("USER_NOT_FOUND", "Authenticated user not found.", 404)

    values, details = validate_pet_payload(request.get_json(silent=True))
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Pet validation failed.",
            400,
            details,
        )

    pet = Pet(user_id=user_id, **values)
    db.session.add(pet)
    db.session.commit()
    return success_response(
        pet.to_dict(),
        "Pet created successfully.",
        201,
    )


@pets_bp.get("")
@jwt_required()
def list_pets():
    user_id = authenticated_user_id()
    pets = Pet.query.filter_by(user_id=user_id).order_by(Pet.id.asc()).all()
    return success_response([pet.to_dict() for pet in pets])


@pets_bp.get("/<int:pet_id>")
@jwt_required()
def get_pet(pet_id):
    pet = owned_pet_or_none(pet_id, authenticated_user_id())
    if pet is None:
        return error_response("PET_NOT_FOUND", "Pet not found.", 404)
    return success_response(pet_with_summary(pet))


@pets_bp.put("/<int:pet_id>")
@jwt_required()
def update_pet(pet_id):
    pet = owned_pet_or_none(pet_id, authenticated_user_id())
    if pet is None:
        return error_response("PET_NOT_FOUND", "Pet not found.", 404)

    values, details = validate_pet_payload(request.get_json(silent=True))
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Pet validation failed.",
            400,
            details,
        )

    for field, value in values.items():
        setattr(pet, field, value)
    db.session.commit()
    return success_response(
        pet.to_dict(),
        "Pet updated successfully.",
    )


@pets_bp.delete("/<int:pet_id>")
@jwt_required()
def delete_pet(pet_id):
    pet = owned_pet_or_none(pet_id, authenticated_user_id())
    if pet is None:
        return error_response("PET_NOT_FOUND", "Pet not found.", 404)

    db.session.delete(pet)
    db.session.commit()
    return success_response(
        {"deleted_pet_id": pet_id},
        "Pet and related records deleted successfully.",
    )
