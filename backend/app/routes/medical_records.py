from datetime import date, timedelta
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, request, send_from_directory, url_for
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from ..api import clean_string, error_response, parse_iso_date, success_response
from ..extensions import db
from ..models import CareReminder, MedicalRecord, Pet
from ..models.base import utc_now
from ..services.ai_medical_extraction import extract_medical_record


medical_records_bp = Blueprint(
    "medical_records", __name__, url_prefix="/api/medical-records"
)

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def authenticated_user_id():
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def parse_positive_int(value):
    if isinstance(value, bool):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def owned_pet_or_none(pet_id, user_id):
    return Pet.query.filter_by(id=pet_id, user_id=user_id).first()


def owned_record_or_none(record_id, user_id):
    return (
        MedicalRecord.query.join(Pet)
        .filter(MedicalRecord.id == record_id, Pet.user_id == user_id)
        .first()
    )


def medical_record_directory():
    directory = Path(
        current_app.config.get(
            "MEDICAL_RECORD_UPLOAD_FOLDER",
            Path(current_app.instance_path) / "medical_records",
        )
    )
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def extract_text_from_file(document, extension):
    document.stream.seek(0)
    if extension == ".txt":
        raw = document.stream.read()
        document.stream.seek(0)
        try:
            return raw.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("Text documents must use UTF-8 encoding.") from exc

    if extension == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF extraction support is not installed.") from exc
        try:
            reader = PdfReader(document.stream)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise ValueError("The PDF could not be read.") from exc
        finally:
            document.stream.seek(0)
        return text

    return ""


def serialize_record(record, include_source_text=True):
    payload = record.to_dict()
    if not include_source_text:
        payload.pop("source_text", None)
    active_reminders = [item for item in record.reminders if item.completed_at is None]
    payload["generated_reminder_count"] = len(record.reminders)
    payload["incomplete_reminder_count"] = len(active_reminders)
    payload["generated_reminder_ids"] = [item.id for item in record.reminders]
    payload["document_url"] = (
        url_for(
            "medical_records.download_medical_record",
            record_id=record.id,
            _external=True,
        )
        if record.stored_filename
        else None
    )
    return payload


@medical_records_bp.post("")
@jwt_required()
def create_medical_record():
    user_id = authenticated_user_id()
    pet_id = parse_positive_int(request.form.get("pet_id"))
    pet = owned_pet_or_none(pet_id, user_id) if pet_id else None
    title = clean_string(request.form.get("title"), max_length=150)
    document = request.files.get("document")
    supplied_text = clean_string(request.form.get("source_text"))
    details = {}

    if pet is None:
        details["pet_id"] = "Select one of your pets."
    if title is None:
        details["title"] = "A title of 150 characters or fewer is required."

    try:
        visit_date = parse_iso_date(request.form.get("visit_date"))
        if visit_date and visit_date > date.today():
            details["visit_date"] = "Visit date cannot be in the future."
    except ValueError as exc:
        visit_date = None
        details["visit_date"] = str(exc)

    original_name = None
    extension = None
    if document and document.filename:
        original_name = secure_filename(document.filename)
        extension = Path(original_name).suffix.lower()
        if extension not in ALLOWED_EXTENSIONS or document.mimetype not in ALLOWED_MIME_TYPES:
            details["document"] = "Use a PDF, TXT, JPG, PNG, or WebP document."
    elif supplied_text is None:
        details["document"] = "Upload a document or paste the veterinary instructions."

    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Medical record validation failed.",
            400,
            details,
        )

    extracted_file_text = ""
    if document and original_name:
        try:
            extracted_file_text = extract_text_from_file(document, extension)
        except (RuntimeError, ValueError) as exc:
            return error_response("DOCUMENT_EXTRACTION_FAILED", str(exc), 400)

    source_text = supplied_text or clean_string(extracted_file_text)
    if source_text is None:
        return error_response(
            "DOCUMENT_TEXT_REQUIRED",
            "No readable text was found. Paste the veterinary instructions to continue.",
            400,
        )

    stored_filename = None
    if document and original_name:
        stored_filename = f"{uuid4().hex}{extension}"
        document.save(medical_record_directory() / stored_filename)

    reference_date = visit_date or date.today()
    record = MedicalRecord(
        pet_id=pet.id,
        title=title,
        visit_date=visit_date,
        original_filename=original_name,
        stored_filename=stored_filename,
        mime_type=document.mimetype if document and original_name else None,
        source_text=source_text,
        extracted_data=extract_medical_record(
            source_text,
            reference_date,
            api_key=current_app.config.get("OPENAI_API_KEY"),
            model=current_app.config.get("OPENAI_MEDICAL_MODEL", "gpt-5-nano"),
            logger=current_app.logger,
        ),
        status="draft",
    )
    db.session.add(record)
    db.session.commit()
    return success_response(
        serialize_record(record),
        "Medical record uploaded. Review the extraction before creating reminders.",
        201,
    )


@medical_records_bp.get("")
@jwt_required()
def list_medical_records():
    records = (
        MedicalRecord.query.join(Pet)
        .filter(Pet.user_id == authenticated_user_id())
        .order_by(MedicalRecord.created_at.desc(), MedicalRecord.id.desc())
        .all()
    )
    return success_response(
        [serialize_record(record, include_source_text=False) for record in records]
    )


@medical_records_bp.get("/<int:record_id>")
@jwt_required()
def get_medical_record(record_id):
    record = owned_record_or_none(record_id, authenticated_user_id())
    if record is None:
        return error_response("MEDICAL_RECORD_NOT_FOUND", "Medical record not found.", 404)
    return success_response(serialize_record(record))


@medical_records_bp.get("/<int:record_id>/document")
@jwt_required()
def download_medical_record(record_id):
    record = owned_record_or_none(record_id, authenticated_user_id())
    if record is None:
        return error_response("MEDICAL_RECORD_NOT_FOUND", "Medical record not found.", 404)
    if not record.stored_filename:
        return error_response("DOCUMENT_NOT_FOUND", "This record has no uploaded document.", 404)
    return send_from_directory(
        medical_record_directory(),
        record.stored_filename,
        download_name=record.original_filename,
    )


def validate_confirmation_payload(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("extracted_data"), dict):
        return None, {"body": "extracted_data must be a JSON object."}

    draft = payload["extracted_data"]
    details = {}
    normalized = {"medications": [], "follow_up": None}

    medications = draft.get("medications", [])
    if not isinstance(medications, list):
        details["medications"] = "Medications must be a list."
        medications = []
    for index, item in enumerate(medications):
        if not isinstance(item, dict) or not item.get("include", True):
            continue
        name = clean_string(item.get("name"), max_length=100)
        dose = clean_string(item.get("dose"), max_length=100)
        instructions = clean_string(item.get("instructions"), max_length=300) or ""
        frequency = clean_string(item.get("frequency"), max_length=100) or ""
        start_date = None
        try:
            start_date = parse_iso_date(item.get("start_date"))
        except ValueError:
            pass
        duration_days = parse_positive_int(item.get("duration_days"))
        if not name or not dose or start_date is None:
            details[f"medications.{index}"] = "Name, dose, and start date are required."
            continue
        if start_date < date.today():
            details[f"medications.{index}.start_date"] = "Start date cannot be in the past."
        if duration_days is None or duration_days > 60:
            details[f"medications.{index}.duration_days"] = "Duration must be 1 to 60 days."
        normalized["medications"].append(
            {
                "include": True,
                "name": name,
                "dose": dose,
                "frequency": frequency,
                "duration_days": duration_days,
                "start_date": start_date.isoformat(),
                "instructions": instructions,
                "source_text": clean_string(item.get("source_text")) or "",
            }
        )

    follow_up = draft.get("follow_up")
    if isinstance(follow_up, dict) and follow_up.get("include", True):
        try:
            follow_up_date = parse_iso_date(follow_up.get("date"))
        except ValueError:
            follow_up_date = None
        if follow_up_date is None or follow_up_date < date.today():
            details["follow_up.date"] = "Follow-up date must be today or later."
        else:
            normalized["follow_up"] = {
                "include": True,
                "date": follow_up_date.isoformat(),
                "clinic": clean_string(follow_up.get("clinic"), max_length=150) or "",
                "source_text": clean_string(follow_up.get("source_text")) or "",
            }

    if not normalized["medications"] and not normalized["follow_up"]:
        details["extracted_data"] = "Select at least one item to create a reminder."

    return normalized, details


def reminders_from_confirmation(record, confirmed):
    reminders = []
    for medication in confirmed["medications"]:
        start_date = date.fromisoformat(medication["start_date"])
        for day_offset in range(medication["duration_days"]):
            due_date = start_date + timedelta(days=day_offset)
            note_parts = [f"{medication['name']} {medication['dose']}"]
            if medication["frequency"]:
                note_parts.append(medication["frequency"])
            if medication["instructions"]:
                note_parts.append(medication["instructions"])
            reminders.append(
                CareReminder(
                    pet_id=record.pet_id,
                    medical_record=record,
                    care_type="medication",
                    due_date=due_date,
                    repeat_rule="none",
                    notes="; ".join(note_parts),
                )
            )

    if confirmed["follow_up"]:
        clinic = confirmed["follow_up"]["clinic"]
        reminders.append(
            CareReminder(
                pet_id=record.pet_id,
                medical_record=record,
                care_type="checkup",
                due_date=date.fromisoformat(confirmed["follow_up"]["date"]),
                repeat_rule="none",
                notes=f"Follow-up appointment{f' at {clinic}' if clinic else ''}.",
            )
        )
    return reminders


@medical_records_bp.post("/<int:record_id>/confirm")
@jwt_required()
def confirm_medical_record(record_id):
    record = owned_record_or_none(record_id, authenticated_user_id())
    if record is None:
        return error_response("MEDICAL_RECORD_NOT_FOUND", "Medical record not found.", 404)
    if record.status == "confirmed":
        return error_response(
            "MEDICAL_RECORD_ALREADY_CONFIRMED",
            "This medical record has already created reminders.",
            409,
        )

    confirmed, details = validate_confirmation_payload(request.get_json(silent=True))
    if details:
        return error_response(
            "VALIDATION_ERROR",
            "Review the extracted information before creating reminders.",
            400,
            details,
        )

    reminders = reminders_from_confirmation(record, confirmed)
    db.session.add_all(reminders)
    record.confirmed_data = confirmed
    record.status = "confirmed"
    record.confirmed_at = utc_now()
    db.session.commit()
    return success_response(
        {
            "medical_record": serialize_record(record),
            "created_reminders": [reminder.to_dict() for reminder in reminders],
        },
        f"Medical record confirmed and {len(reminders)} reminders created.",
        201,
    )


@medical_records_bp.delete("/<int:record_id>")
@jwt_required()
def delete_medical_record(record_id):
    record = owned_record_or_none(record_id, authenticated_user_id())
    if record is None:
        return error_response("MEDICAL_RECORD_NOT_FOUND", "Medical record not found.", 404)

    delete_incomplete = request.args.get("delete_incomplete_reminders", "false").lower()
    if delete_incomplete not in {"true", "false"}:
        return error_response(
            "VALIDATION_ERROR",
            "delete_incomplete_reminders must be true or false.",
            400,
        )

    incomplete = [item for item in record.reminders if item.completed_at is None]
    if delete_incomplete == "true":
        for reminder in incomplete:
            db.session.delete(reminder)

    stored_filename = record.stored_filename
    db.session.delete(record)
    db.session.commit()

    if stored_filename:
        directory = medical_record_directory().resolve()
        target = (directory / stored_filename).resolve()
        if target.parent == directory and target.exists():
            target.unlink()

    return success_response(
        {
            "deleted_medical_record_id": record_id,
            "deleted_incomplete_reminders": len(incomplete) if delete_incomplete == "true" else 0,
        },
        "Medical record deleted successfully.",
    )
