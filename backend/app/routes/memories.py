from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import (
    clean_string,
    error_response,
    parse_iso_date,
    success_response,
)
from ..extensions import db
from ..models import Memory, Pet
from ..models.memory import MEMORY_CATEGORIES


memories_bp = Blueprint("memories", __name__, url_prefix="/api/memories")


def authenticated_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def parse_pet_id(value):
    if isinstance(value, bool):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def owned_pet_or_none(pet_id, user_id):
    return Pet.query.filter_by(id=pet_id, user_id=user_id).first()


def owned_memory_or_none(memory_id, user_id):
    return (
        Memory.query.join(Pet)
        .filter(Memory.id == memory_id, Pet.user_id == user_id)
        .first()
    )


def serialize_memory(memory):
    payload = memory.to_dict()
    payload["pet_name"] = memory.pet.name
    return payload


def validate_memory_payload(payload, user_id):
    if not isinstance(payload, dict):
        return None, {"body": "A JSON request body is required."}

    values = {}
    details = {}

    pet_id = parse_pet_id(payload.get("pet_id"))
    if pet_id is None:
        details["pet_id"] = "A valid pet ID is required."
    elif owned_pet_or_none(pet_id, user_id) is None:
        details["pet_id"] = "The selected pet was not found."
    values["pet_id"] = pet_id

    title = clean_string(payload.get("title"), max_length=150)
    if title is None:
        details["title"] = "Title is required and must be 150 characters or fewer."
    values["title"] = title

    try:
        memory_date = parse_iso_date(payload.get("memory_date"))
        if memory_date is None:
            details["memory_date"] = "Memory date is required."
        elif memory_date > date.today():
            details["memory_date"] = "Memory date cannot be a future date."
        values["memory_date"] = memory_date
    except ValueError as exc:
        values["memory_date"] = None
        details["memory_date"] = str(exc)

    category_value = payload.get("category")
    if category_value in (None, ""):
        values["category"] = None
    else:
        category = clean_string(category_value, max_length=30)
        if category not in MEMORY_CATEGORIES:
            details["category"] = (
                f"Category must be one of: {', '.join(MEMORY_CATEGORIES)}."
            )
        values["category"] = category

    for field, max_length in (("scene", 150), ("image_url", 500)):
        raw_value = payload.get(field)
        if raw_value in (None, ""):
            values[field] = None
        else:
            values[field] = clean_string(raw_value, max_length=max_length)
            if values[field] is None:
                details[field] = f"{field} must be {max_length} characters or fewer."

    description = payload.get("description")
    if description in (None, ""):
        values["description"] = None
    elif isinstance(description, str):
        values["description"] = description.strip() or None
    else:
        values["description"] = None
        details["description"] = "Description must be text."

    return values, details


@memories_bp.post("")
@jwt_required()
def create_memory():
    user_id = authenticated_user_id()
    values, details = validate_memory_payload(
        request.get_json(silent=True),
        user_id,
    )
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Memory validation failed.",
            400,
            details,
        )

    memory = Memory(**values)
    db.session.add(memory)
    db.session.commit()
    return success_response(
        serialize_memory(memory),
        "Memory created successfully.",
        201,
    )


@memories_bp.get("")
@jwt_required()
def list_memories():
    user_id = authenticated_user_id()
    query = Memory.query.join(Pet).filter(Pet.user_id == user_id)

    pet_id_value = request.args.get("pet_id")
    if pet_id_value is not None:
        pet_id = parse_pet_id(pet_id_value)
        if pet_id is None:
            return error_response(
                "VALIDATION_ERROR",
                "pet_id must be a positive integer.",
                400,
            )
        query = query.filter(Memory.pet_id == pet_id)

    category = request.args.get("category")
    if category is not None:
        if category not in MEMORY_CATEGORIES:
            return error_response(
                "VALIDATION_ERROR",
                "Invalid category filter.",
                400,
            )
        query = query.filter(Memory.category == category)

    memories = query.order_by(
        Memory.memory_date.desc(),
        Memory.id.desc(),
    ).all()
    return success_response([serialize_memory(memory) for memory in memories])


@memories_bp.put("/<int:memory_id>")
@jwt_required()
def update_memory(memory_id):
    user_id = authenticated_user_id()
    memory = owned_memory_or_none(memory_id, user_id)
    if memory is None:
        return error_response("MEMORY_NOT_FOUND", "Memory not found.", 404)

    values, details = validate_memory_payload(
        request.get_json(silent=True),
        user_id,
    )
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Memory validation failed.",
            400,
            details,
        )

    for field, value in values.items():
        setattr(memory, field, value)
    db.session.commit()
    return success_response(
        serialize_memory(memory),
        "Memory updated successfully.",
    )


@memories_bp.delete("/<int:memory_id>")
@jwt_required()
def delete_memory(memory_id):
    memory = owned_memory_or_none(memory_id, authenticated_user_id())
    if memory is None:
        return error_response("MEMORY_NOT_FOUND", "Memory not found.", 404)

    db.session.delete(memory)
    db.session.commit()
    return success_response(
        {"deleted_memory_id": memory_id},
        "Memory deleted successfully.",
    )
