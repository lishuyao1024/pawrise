from pathlib import Path

import click
from flask import Flask

from config import Config

from .extensions import cors, db, jwt, migrate


def create_app(config_object=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

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
    from .routes.pets import pets_bp
    from .routes.reminders import reminders_bp
    from .routes.settings import settings_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(memories_bp)
    app.register_blueprint(pets_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(settings_bp)
    register_jwt_error_handlers()
    register_cli_commands(app)

    return app


def register_cli_commands(app):
    @app.cli.command("init-db")
    def init_db_command():
        """Create all database tables for local development."""
        db.create_all()
        click.echo(f"Initialized database at {app.config['SQLALCHEMY_DATABASE_URI']}.")


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
