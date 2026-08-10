import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///pawrise.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "development-only-change-this-secret-before-deployment",
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JSON_SORT_KEYS = False
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MEDICAL_MODEL = os.getenv("OPENAI_MEDICAL_MODEL", "gpt-5-nano")

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
