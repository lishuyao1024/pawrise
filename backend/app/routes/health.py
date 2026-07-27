from flask import Blueprint, jsonify
from sqlalchemy import text

from ..extensions import db


health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health_check():
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "DATABASE_UNAVAILABLE",
                        "message": "The database connection is unavailable.",
                    },
                }
            ),
            503,
        )

    return jsonify(
        {
            "success": True,
            "message": "PawRise API is running.",
            "data": {
                "service": "pawrise-backend",
                "database": "connected",
            },
        }
    )
