from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, request, send_from_directory, url_for
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from ..api import error_response, success_response


uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def upload_directory():
    configured_directory = current_app.config.get("UPLOAD_FOLDER")
    directory = Path(configured_directory or Path(current_app.instance_path) / "uploads")
    directory.mkdir(parents=True, exist_ok=True)
    return directory


@uploads_bp.post("")
@jwt_required()
def upload_image():
    image = request.files.get("image")
    if image is None or not image.filename:
        return error_response("VALIDATION_ERROR", "Choose an image to upload.", 400)

    original_name = secure_filename(image.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS or image.mimetype not in ALLOWED_MIME_TYPES:
        return error_response(
            "UNSUPPORTED_IMAGE",
            "Use a JPG, PNG, GIF, or WebP image.",
            400,
        )

    filename = f"{uuid4().hex}{extension}"
    image.save(upload_directory() / filename)
    return success_response(
        {
            "url": url_for("uploads.get_uploaded_image", filename=filename, _external=True),
            "filename": filename,
        },
        "Image uploaded successfully.",
        201,
    )


@uploads_bp.get("/<path:filename>")
def get_uploaded_image(filename):
    return send_from_directory(upload_directory(), filename)
