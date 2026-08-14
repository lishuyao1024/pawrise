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
    assert payload["data"]["user"]["avatar_url"] is None
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
    assert payload["avatar_url"] is None


def test_update_current_user_requires_token(client):
    response = client.patch("/api/auth/me", json={"full_name": "New Name"})

    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTHORIZATION_REQUIRED"


def test_update_current_user_persists_name_and_avatar(client, auth_headers):
    avatar_url = "http://localhost/api/uploads/profile-avatar.png"
    response = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"full_name": "  Howard Lian  ", "avatar_url": avatar_url},
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["full_name"] == "Howard Lian"
    assert payload["email"] == "shuyao@example.com"
    assert payload["avatar_url"] == avatar_url

    restored = client.get("/api/auth/me", headers=auth_headers)
    assert restored.status_code == 200
    assert restored.get_json()["data"]["full_name"] == "Howard Lian"
    assert restored.get_json()["data"]["avatar_url"] == avatar_url


def test_update_current_user_can_remove_avatar(client, auth_headers):
    client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"avatar_url": "/api/uploads/profile-avatar.png"},
    )

    response = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"avatar_url": None},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["avatar_url"] is None


def test_update_current_user_rejects_invalid_profile_without_partial_save(
    client,
    auth_headers,
):
    response = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"full_name": "Changed Name", "avatar_url": "https://example.com/a.png"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["details"] == {
        "avatar_url": "Avatar must be a valid uploaded image URL."
    }
    restored = client.get("/api/auth/me", headers=auth_headers).get_json()["data"]
    assert restored["full_name"] == "Shuyao Li"
    assert restored["avatar_url"] is None


def test_update_current_user_validates_body_and_fields(client, auth_headers):
    no_fields = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"email": "new@example.com"},
    )
    blank_name = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"full_name": "   "},
    )
    long_avatar = client.patch(
        "/api/auth/me",
        headers=auth_headers,
        json={"avatar_url": "/api/uploads/" + "a" * 500},
    )

    assert no_fields.status_code == 400
    assert blank_name.status_code == 400
    assert "full_name" in blank_name.get_json()["error"]["details"]
    assert long_avatar.status_code == 400
    assert "avatar_url" in long_avatar.get_json()["error"]["details"]
