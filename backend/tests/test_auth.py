from app.extensions import db
from app.models import User, UserSetting


def test_register_creates_user_settings_and_token(app, client):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "  Shuyao Li  ",
            "email": "SHUYAO@example.com",
            "password": "PawRise123!",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["success"] is True
    assert payload["data"]["user"]["full_name"] == "Shuyao Li"
    assert payload["data"]["user"]["email"] == "shuyao@example.com"
    assert payload["data"]["access_token"]
    assert "password_hash" not in payload["data"]["user"]

    with app.app_context():
        user = User.query.one()
        assert user.password_hash != "PawRise123!"
        assert user.check_password("PawRise123!")
        assert UserSetting.query.filter_by(user_id=user.id).one().default_lead_days == 7


def test_register_rejects_duplicate_email(client, registered_user):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Another User",
            "email": "SHUYAO@EXAMPLE.COM",
            "password": "Different123!",
        },
    )

    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_rejects_invalid_fields(client):
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "",
            "email": "not-an-email",
            "password": "short",
        },
    )

    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert set(details) == {"full_name", "email", "password"}


def test_login_returns_token(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "SHUYAO@example.com",
            "password": "PawRise123!",
        },
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["message"] == "Login successful."
    assert payload["data"]["access_token"]


def test_login_rejects_wrong_password(client, registered_user):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "shuyao@example.com",
            "password": "WrongPassword!",
        },
    )

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_current_user_requires_token(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTHORIZATION_REQUIRED"


def test_current_user_returns_authenticated_account(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["full_name"] == "Shuyao Li"
    assert payload["email"] == "shuyao@example.com"
