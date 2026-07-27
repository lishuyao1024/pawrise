import re
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import jsonify


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def success_response(data=None, message=None, status=200):
    payload = {"success": True}
    if message is not None:
        payload["message"] = message
    payload["data"] = data if data is not None else {}
    return jsonify(payload), status


def error_response(code, message, status, details=None):
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return jsonify({"success": False, "error": error}), status


def clean_string(value, *, max_length=None):
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if max_length is not None and len(cleaned) > max_length:
        return None
    return cleaned


def normalize_email(value):
    email = clean_string(value, max_length=255)
    if email is None:
        return None
    email = email.lower()
    return email if EMAIL_PATTERN.fullmatch(email) else None


def parse_iso_date(value):
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ValueError("Date must be a string in YYYY-MM-DD format.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("Date must use YYYY-MM-DD format.") from exc


def parse_positive_decimal(value):
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        raise ValueError("Weight must be a positive number.")
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Weight must be a positive number.") from exc
    if not parsed.is_finite() or parsed <= 0 or parsed > Decimal("9999.99"):
        raise ValueError("Weight must be between 0.01 and 9999.99 pounds.")
    return parsed.quantize(Decimal("0.01"))
