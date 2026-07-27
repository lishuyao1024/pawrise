import pytest

from app import create_app
from app.extensions import db
from app.models import User


@pytest.fixture()
def app():
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "JWT_SECRET_KEY": "test-only-secret-at-least-32-bytes-long",
        }
    )

    with test_app.app_context():
        db.create_all()
        yield test_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def registered_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Shuyao Li",
            "email": "shuyao@example.com",
            "password": "PawRise123!",
        },
    )
    payload = response.get_json()
    return {
        "response": response,
        "user": payload["data"]["user"],
        "access_token": payload["data"]["access_token"],
    }


@pytest.fixture()
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['access_token']}"}


@pytest.fixture()
def create_user(app):
    def factory(full_name, email, password="PawRise123!"):
        with app.app_context():
            user = User(full_name=full_name, email=email.lower())
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            return user.id

    return factory
