from datetime import date

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import error_response, success_response
from ..extensions import db
from ..models import CareReminder, Memory, Pet, User
from .reminders import lead_days_for_user, serialize_reminder


dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


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


def serialize_memory_summary(memory):
    return {
        "id": memory.id,
        "pet_id": memory.pet_id,
        "pet_name": memory.pet.name,
        "title": memory.title,
        "memory_date": memory.memory_date.isoformat(),
        "image_url": memory.image_url,
    }


@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    user_id = authenticated_user_id()
    user = db.session.get(User, user_id)
    if user is None:
        return error_response("USER_NOT_FOUND", "Authenticated user not found.", 404)

    pet_id = None
    pet_id_value = request.args.get("pet_id")
    if pet_id_value is not None:
        pet_id = parse_pet_id(pet_id_value)
        if pet_id is None:
            return error_response(
                "VALIDATION_ERROR",
                "pet_id must be a positive integer.",
                400,
            )
        if Pet.query.filter_by(id=pet_id, user_id=user_id).first() is None:
            return error_response("PET_NOT_FOUND", "Pet not found.", 404)

    pets_query = Pet.query.filter_by(user_id=user_id)
    if pet_id is not None:
        pets_query = pets_query.filter(Pet.id == pet_id)
    pets = pets_query.order_by(Pet.id.asc()).all()

    reminder_query = CareReminder.query.join(Pet).filter(
        Pet.user_id == user_id,
        CareReminder.completed_at.is_(None),
    )
    memory_query = Memory.query.join(Pet).filter(Pet.user_id == user_id)
    if pet_id is not None:
        reminder_query = reminder_query.filter(CareReminder.pet_id == pet_id)
        memory_query = memory_query.filter(Memory.pet_id == pet_id)

    today = date.today()
    upcoming_query = reminder_query.filter(CareReminder.due_date >= today)
    overdue_query = reminder_query.filter(CareReminder.due_date < today)

    upcoming_count = upcoming_query.count()
    overdue_count = overdue_query.count()
    memory_count = memory_query.count()

    upcoming = upcoming_query.order_by(
        CareReminder.due_date.asc(),
        CareReminder.id.asc(),
    ).limit(5).all()
    overdue = overdue_query.order_by(
        CareReminder.due_date.asc(),
        CareReminder.id.asc(),
    ).limit(5).all()
    recent_memories = memory_query.order_by(
        Memory.memory_date.desc(),
        Memory.id.desc(),
    ).limit(5).all()

    lead_days = lead_days_for_user(user_id)
    return success_response(
        {
            "user": {
                "id": user.id,
                "full_name": user.full_name,
            },
            "summary": {
                "pet_count": len(pets),
                "upcoming_count": upcoming_count,
                "overdue_count": overdue_count,
                "memory_count": memory_count,
            },
            "pets": [
                {
                    "id": pet.id,
                    "name": pet.name,
                    "breed": pet.breed,
                    "age_years": pet.age_years,
                    "image_url": pet.image_url,
                }
                for pet in pets
            ],
            "upcoming_reminders": [
                serialize_reminder(reminder, lead_days) for reminder in upcoming
            ],
            "overdue_items": [
                serialize_reminder(reminder, lead_days) for reminder in overdue
            ],
            "recent_memories": [
                serialize_memory_summary(memory) for memory in recent_memories
            ],
        }
    )
