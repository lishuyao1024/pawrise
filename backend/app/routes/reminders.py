from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ..api import (
    clean_string,
    error_response,
    parse_iso_date,
    success_response,
)
from ..extensions import db
from ..models import CareReminder, Pet, UserSetting
from ..models.base import utc_now
from ..models.care_reminder import CARE_TYPES, REPEAT_RULES


reminders_bp = Blueprint("reminders", __name__, url_prefix="/api/reminders")

REPEAT_MONTHS = {
    "monthly": 1,
    "every_2_months": 2,
    "every_3_months": 3,
    "every_6_months": 6,
    "yearly": 12,
}


def authenticated_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def owned_pet_or_none(pet_id, user_id):
    return Pet.query.filter_by(id=pet_id, user_id=user_id).first()


def owned_reminder_or_none(reminder_id, user_id):
    return (
        CareReminder.query.join(Pet)
        .filter(CareReminder.id == reminder_id, Pet.user_id == user_id)
        .first()
    )


def lead_days_for_user(user_id):
    settings = db.session.get(UserSetting, user_id)
    return settings.default_lead_days if settings else 7


def reminder_status(reminder, lead_days):
    if reminder.completed_at is not None:
        return "completed"
    today = date.today()
    if reminder.due_date < today:
        return "overdue"
    if reminder.due_date <= today + timedelta(days=lead_days):
        return "due_soon"
    return "upcoming"


def serialize_reminder(reminder, lead_days):
    payload = reminder.to_dict()
    payload["pet_name"] = reminder.pet.name
    payload["medical_record_title"] = (
        reminder.medical_record.title if reminder.medical_record else None
    )
    payload["status"] = reminder_status(reminder, lead_days)
    return payload


def parse_pet_id(value):
    if isinstance(value, bool):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def validate_reminder_payload(payload, user_id):
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

    care_type = clean_string(payload.get("care_type"), max_length=30)
    if care_type not in CARE_TYPES:
        details["care_type"] = f"Care type must be one of: {', '.join(CARE_TYPES)}."
    values["care_type"] = care_type

    custom_label = clean_string(payload.get("custom_label"), max_length=100)
    if care_type == "other":
        if custom_label is None:
            details["custom_label"] = "Enter a custom care type."
        values["custom_label"] = custom_label
    else:
        values["custom_label"] = None

    repeat_rule = clean_string(payload.get("repeat_rule"), max_length=30) or "none"
    if repeat_rule not in REPEAT_RULES:
        details["repeat_rule"] = (
            f"Repeat rule must be one of: {', '.join(REPEAT_RULES)}."
        )
    values["repeat_rule"] = repeat_rule

    try:
        due_date = parse_iso_date(payload.get("due_date"))
        if due_date is None:
            details["due_date"] = "Due date is required."
        elif due_date <= date.today():
            details["due_date"] = "Due date must be a future date."
        values["due_date"] = due_date
    except ValueError as exc:
        values["due_date"] = None
        details["due_date"] = str(exc)

    notes = payload.get("notes")
    if notes in (None, ""):
        values["notes"] = None
    elif isinstance(notes, str):
        values["notes"] = notes.strip() or None
    else:
        values["notes"] = None
        details["notes"] = "Notes must be text."

    return values, details


def add_months(value, months):
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def parse_completion_time(value):
    if value in (None, ""):
        return utc_now()
    if not isinstance(value, str):
        raise ValueError("completed_at must be an ISO 8601 timestamp.")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("completed_at must be an ISO 8601 timestamp.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


@reminders_bp.post("")
@jwt_required()
def create_reminder():
    user_id = authenticated_user_id()
    values, details = validate_reminder_payload(
        request.get_json(silent=True),
        user_id,
    )
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Care reminder validation failed.",
            400,
            details,
        )

    reminder = CareReminder(**values)
    db.session.add(reminder)
    db.session.commit()
    return success_response(
        serialize_reminder(reminder, lead_days_for_user(user_id)),
        "Care reminder created successfully.",
        201,
    )


@reminders_bp.get("")
@jwt_required()
def list_active_reminders():
    user_id = authenticated_user_id()
    lead_days = lead_days_for_user(user_id)
    query = CareReminder.query.join(Pet).filter(
        Pet.user_id == user_id,
        CareReminder.completed_at.is_(None),
    )

    pet_id_value = request.args.get("pet_id")
    if pet_id_value is not None:
        pet_id = parse_pet_id(pet_id_value)
        if pet_id is None:
            return error_response(
                "VALIDATION_ERROR",
                "pet_id must be a positive integer.",
                400,
            )
        query = query.filter(CareReminder.pet_id == pet_id)

    care_type = request.args.get("care_type")
    if care_type is not None:
        if care_type not in CARE_TYPES:
            return error_response(
                "VALIDATION_ERROR",
                "Invalid care_type filter.",
                400,
            )
        query = query.filter(CareReminder.care_type == care_type)

    status = request.args.get("status")
    today = date.today()
    due_soon_end = today + timedelta(days=lead_days)
    if status is not None:
        if status == "overdue":
            query = query.filter(CareReminder.due_date < today)
        elif status == "due_soon":
            query = query.filter(
                CareReminder.due_date >= today,
                CareReminder.due_date <= due_soon_end,
            )
        elif status == "upcoming":
            query = query.filter(CareReminder.due_date > due_soon_end)
        else:
            return error_response(
                "VALIDATION_ERROR",
                "status must be overdue, due_soon, or upcoming.",
                400,
            )

    sort = request.args.get("sort", "due_date")
    order = request.args.get("order", "asc")
    if sort != "due_date" or order not in {"asc", "desc"}:
        return error_response(
            "VALIDATION_ERROR",
            "Only due_date sorting with asc or desc order is supported.",
            400,
        )
    query = query.order_by(
        CareReminder.due_date.asc()
        if order == "asc"
        else CareReminder.due_date.desc(),
        CareReminder.id.asc(),
    )

    reminders = query.all()
    return success_response(
        [serialize_reminder(reminder, lead_days) for reminder in reminders]
    )


@reminders_bp.put("/<int:reminder_id>")
@jwt_required()
def update_reminder(reminder_id):
    user_id = authenticated_user_id()
    reminder = owned_reminder_or_none(reminder_id, user_id)
    if reminder is None:
        return error_response(
            "REMINDER_NOT_FOUND",
            "Care reminder not found.",
            404,
        )
    if reminder.completed_at is not None:
        return error_response(
            "REMINDER_ALREADY_COMPLETED",
            "A completed reminder cannot be edited.",
            409,
        )

    values, details = validate_reminder_payload(
        request.get_json(silent=True),
        user_id,
    )
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Care reminder validation failed.",
            400,
            details,
        )

    for field, value in values.items():
        setattr(reminder, field, value)
    db.session.commit()
    return success_response(
        serialize_reminder(reminder, lead_days_for_user(user_id)),
        "Care reminder updated successfully.",
    )


@reminders_bp.delete("/<int:reminder_id>")
@jwt_required()
def delete_reminder(reminder_id):
    reminder = owned_reminder_or_none(reminder_id, authenticated_user_id())
    if reminder is None:
        return error_response(
            "REMINDER_NOT_FOUND",
            "Care reminder not found.",
            404,
        )

    db.session.delete(reminder)
    db.session.commit()
    return success_response(
        {"deleted_reminder_id": reminder_id},
        "Care reminder deleted successfully.",
    )


@reminders_bp.post("/<int:reminder_id>/complete")
@jwt_required()
def complete_reminder(reminder_id):
    user_id = authenticated_user_id()
    reminder = owned_reminder_or_none(reminder_id, user_id)
    if reminder is None:
        return error_response(
            "REMINDER_NOT_FOUND",
            "Care reminder not found.",
            404,
        )
    if reminder.completed_at is not None:
        return error_response(
            "REMINDER_ALREADY_COMPLETED",
            "Care reminder is already completed.",
            409,
        )

    payload = request.get_json(silent=True)
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        return error_response(
            "VALIDATION_ERROR",
            "The request body must be a JSON object.",
            400,
        )
    try:
        completed_at = parse_completion_time(payload.get("completed_at"))
    except ValueError as exc:
        return error_response(
            "VALIDATION_ERROR",
            str(exc),
            400,
        )

    reminder.completed_at = completed_at
    next_reminder = None
    months = REPEAT_MONTHS.get(reminder.repeat_rule)
    if months is not None:
        next_reminder = CareReminder(
            pet_id=reminder.pet_id,
            source_reminder=reminder,
            care_type=reminder.care_type,
            custom_label=reminder.custom_label,
            due_date=add_months(reminder.due_date, months),
            repeat_rule=reminder.repeat_rule,
            notes=reminder.notes,
        )
        db.session.add(next_reminder)

    db.session.commit()
    lead_days = lead_days_for_user(user_id)
    return success_response(
        {
            "completed_reminder": serialize_reminder(reminder, lead_days),
            "next_reminder": (
                serialize_reminder(next_reminder, lead_days)
                if next_reminder is not None
                else None
            ),
        },
        "Care reminder completed successfully.",
    )


@reminders_bp.get("/history")
@jwt_required()
def list_care_history():
    user_id = authenticated_user_id()
    query = CareReminder.query.join(Pet).filter(
        Pet.user_id == user_id,
        CareReminder.completed_at.is_not(None),
    )

    pet_id_value = request.args.get("pet_id")
    if pet_id_value is not None:
        pet_id = parse_pet_id(pet_id_value)
        if pet_id is None:
            return error_response(
                "VALIDATION_ERROR",
                "pet_id must be a positive integer.",
                400,
            )
        query = query.filter(CareReminder.pet_id == pet_id)

    reminders = query.order_by(
        CareReminder.completed_at.desc(),
        CareReminder.id.desc(),
    ).all()
    lead_days = lead_days_for_user(user_id)
    return success_response(
        [serialize_reminder(reminder, lead_days) for reminder in reminders]
    )
