import os
from datetime import timedelta
from pathlib import Path


def default_database_url():
    """Store production data on App Service's persistent /home share."""
    if os.getenv("WEBSITE_HOSTNAME"):
        data_directory = Path(os.getenv("PAWRISE_DATA_DIR", "/home/data"))
        data_directory.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{(data_directory / 'pawrise.db').as_posix()}"
    return "sqlite:///pawrise.db"


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or default_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "development-only-change-this-secret-before-deployment",
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JSON_SORT_KEYS = False
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MEDICAL_MODEL = os.getenv("OPENAI_MEDICAL_MODEL", "gpt-5-nano")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER") or (
        "/home/data/uploads" if os.getenv("WEBSITE_HOSTNAME") else None
    )
    MEDICAL_RECORD_UPLOAD_FOLDER = os.getenv("MEDICAL_RECORD_UPLOAD_FOLDER") or (
        "/home/data/medical_records" if os.getenv("WEBSITE_HOSTNAME") else None
    )

    @staticmethod
    def frontend_origins():
        configured = os.getenv(
            "FRONTEND_ORIGINS",
            "http://127.0.0.1:5173,http://localhost:5173",
        )
        return [origin.strip() for origin in configured.split(",") if origin.strip()]


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-only-secret-at-least-32-bytes-long"
