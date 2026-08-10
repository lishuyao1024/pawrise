from pathlib import Path

import click
from flask import Flask, send_from_directory
from sqlalchemy import inspect, text
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config

from .extensions import cors, db, jwt, migrate


def create_app(config_object=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    if config_object:
        if isinstance(config_object, dict):
            app.config.from_mapping(config_object)
        else:
            app.config.from_object(config_object)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": Config.frontend_origins()}},
    )

    from . import models  # noqa: F401
    from .routes.auth import auth_bp
    from .routes.dashboard import dashboard_bp
    from .routes.health import health_bp
    from .routes.memories import memories_bp
    from .routes.medical_records import medical_records_bp
    from .routes.pets import pets_bp
    from .routes.reminders import reminders_bp
    from .routes.settings import settings_bp
    from .routes.uploads import uploads_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(memories_bp)
    app.register_blueprint(medical_records_bp)
    app.register_blueprint(pets_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(uploads_bp)
    register_frontend_routes(app)
    register_jwt_error_handlers()
    register_cli_commands(app)

    return app


def register_frontend_routes(app):
    """Serve the Vite production build from the same origin as the API."""
    frontend_directory = Path(app.root_path).parents[1] / "frontend" / "dist"

    @app.get("/")
    @app.get("/<path:path>")
    def frontend(path=""):
        requested_file = frontend_directory / path
        if path and requested_file.is_file():
            return send_from_directory(frontend_directory, path)
        if (frontend_directory / "index.html").is_file():
            return send_from_directory(frontend_directory, "index.html")
        return {
            "error": {
                "code": "FRONTEND_NOT_BUILT",
                "message": "The frontend production build is unavailable.",
            }
        }, 503


def register_cli_commands(app):
    @app.cli.command("init-db")
    def init_db_command():
        """Create tables and apply safe SQLite additions for local development."""
        db.create_all()
        upgrade_existing_sqlite_schema()
        click.echo(f"Initialized database at {app.config['SQLALCHEMY_DATABASE_URI']}.")


def upgrade_existing_sqlite_schema():
    """Apply narrow additive upgrades to existing local SQLite databases.

    Flask-SQLAlchemy's create_all creates missing tables but does not add columns
    to an existing table. PawRise uses SQLite for the capstone, so this narrow,
    additive upgrade preserves existing local data without requiring a reset.
    """
    if db.engine.dialect.name != "sqlite":
        return

    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())
    with db.engine.begin() as connection:
        if "care_reminders" in table_names:
            reminder_columns = {
                column["name"]
                for column in inspector.get_columns("care_reminders")
            }
            if "medical_record_id" not in reminder_columns:
                connection.execute(
                    text(
                        "ALTER TABLE care_reminders "
                        "ADD COLUMN medical_record_id INTEGER "
                        "REFERENCES medical_records(id) ON DELETE SET NULL"
                    )
                )
            if "custom_label" not in reminder_columns:
                connection.execute(
                    text(
                        "ALTER TABLE care_reminders "
                        "ADD COLUMN custom_label VARCHAR(100)"
                    )
                )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_reminders_medical_record_id "
                    "ON care_reminders (medical_record_id)"
                )
            )

        if "pets" in table_names:
            pet_columns = {
                column["name"] for column in inspector.get_columns("pets")
            }
            if "sex" not in pet_columns:
                connection.execute(text("ALTER TABLE pets ADD COLUMN sex VARCHAR(10)"))
            if "estimated_age_value" not in pet_columns:
                connection.execute(
                    text("ALTER TABLE pets ADD COLUMN estimated_age_value INTEGER")
                )
            if "estimated_age_unit" not in pet_columns:
                connection.execute(
                    text("ALTER TABLE pets ADD COLUMN estimated_age_unit VARCHAR(10)")
                )


def register_jwt_error_handlers():
    from .api import error_response

    @jwt.unauthorized_loader
    def missing_token(reason):
        return error_response(
            "AUTHORIZATION_REQUIRED",
            "A valid access token is required.",
            401,
        )

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return error_response(
            "INVALID_TOKEN",
            "The access token is invalid.",
            401,
        )

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_payload):
        return error_response(
            "TOKEN_EXPIRED",
            "The access token has expired.",
            401,
        )
