from app.extensions import db
from app.models import UserSetting


def test_get_settings_returns_registration_defaults(client, auth_headers):
    response = client.get("/api/settings", headers=auth_headers)

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["email_reminders"] is True
    assert payload["default_lead_days"] == 7
    assert payload["show_overdue_alerts"] is True
    assert "user_id" not in payload


def test_update_settings_changes_existing_database_row(
    app,
    client,
    auth_headers,
    registered_user,
):
    response = client.put(
        "/api/settings",
        headers=auth_headers,
        json={
            "email_reminders": False,
            "default_lead_days": 3,
            "show_overdue_alerts": False,
        },
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["default_lead_days"] == 3
    with app.app_context():
        settings = db.session.get(
            UserSetting,
            registered_user["user"]["id"],
        )
        assert settings.email_reminders is False
        assert settings.show_overdue_alerts is False
        assert UserSetting.query.count() == 1


def test_update_settings_rejects_invalid_values(client, auth_headers):
    response = client.put(
        "/api/settings",
        headers=auth_headers,
        json={
            "email_reminders": "yes",
            "default_lead_days": 31,
            "show_overdue_alerts": 1,
        },
    )

    assert response.status_code == 400
    assert set(response.get_json()["error"]["details"]) == {
        "email_reminders",
        "default_lead_days",
        "show_overdue_alerts",
    }


def test_settings_endpoints_require_authentication(client):
    assert client.get("/api/settings").status_code == 401
    assert client.put("/api/settings", json={}).status_code == 401
