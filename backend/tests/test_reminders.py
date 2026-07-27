from datetime import date, datetime, timedelta, timezone

from app.extensions import db
from app.models import CareReminder, Pet
from app.routes.reminders import add_months


def future_date(days):
    return (date.today() + timedelta(days=days)).isoformat()


def create_pet(client, auth_headers, name="Dami"):
    response = client.post(
        "/api/pets",
        headers=auth_headers,
        json={"name": name, "species": "Cat"},
    )
    assert response.status_code == 201
    return response.get_json()["data"]["id"]


def valid_reminder(pet_id, **overrides):
    payload = {
        "pet_id": pet_id,
        "care_type": "medication",
        "due_date": future_date(30),
        "repeat_rule": "every_2_months",
        "notes": "Flea prevention refill.",
    }
    payload.update(overrides)
    return payload


def test_create_reminder_persists_active_row(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)

    response = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id),
    )

    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["pet_name"] == "Dami"
    assert payload["status"] == "upcoming"
    assert payload["completed_at"] is None

    with app.app_context():
        reminder = CareReminder.query.one()
        assert reminder.pet_id == pet_id
        assert reminder.repeat_rule == "every_2_months"


def test_reminder_endpoints_require_authentication(client):
    assert client.get("/api/reminders").status_code == 401
    assert client.get("/api/reminders/history").status_code == 401
    assert client.post("/api/reminders", json={}).status_code == 401


def test_create_reminder_rejects_invalid_fields(client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    response = client.post(
        "/api/reminders",
        headers=auth_headers,
        json={
            "pet_id": pet_id,
            "care_type": "invalid",
            "due_date": date.today().isoformat(),
            "repeat_rule": "weekly",
            "notes": 123,
        },
    )

    assert response.status_code == 400
    assert set(response.get_json()["error"]["details"]) == {
        "care_type",
        "due_date",
        "repeat_rule",
        "notes",
    }


def test_create_reminder_rejects_another_users_pet(
    app,
    client,
    auth_headers,
    create_user,
):
    other_user_id = create_user("Other User", "other@example.com")
    with app.app_context():
        pet = Pet(user_id=other_user_id, name="Private Pet", species="Dog")
        db.session.add(pet)
        db.session.commit()
        private_pet_id = pet.id

    response = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(private_pet_id),
    )

    assert response.status_code == 400
    assert "pet_id" in response.get_json()["error"]["details"]


def test_list_reminders_filters_status_type_and_sorts(
    app,
    client,
    auth_headers,
):
    pet_id = create_pet(client, auth_headers)
    with app.app_context():
        db.session.add_all(
            [
                CareReminder(
                    pet_id=pet_id,
                    care_type="vaccine",
                    due_date=date.today() - timedelta(days=2),
                    repeat_rule="yearly",
                ),
                CareReminder(
                    pet_id=pet_id,
                    care_type="medication",
                    due_date=date.today() + timedelta(days=3),
                    repeat_rule="none",
                ),
                CareReminder(
                    pet_id=pet_id,
                    care_type="medication",
                    due_date=date.today() + timedelta(days=40),
                    repeat_rule="none",
                ),
            ]
        )
        db.session.commit()

    all_response = client.get("/api/reminders", headers=auth_headers)
    all_items = all_response.get_json()["data"]
    assert [item["status"] for item in all_items] == [
        "overdue",
        "due_soon",
        "upcoming",
    ]

    filtered = client.get(
        "/api/reminders?care_type=medication&status=upcoming&order=desc",
        headers=auth_headers,
    )
    items = filtered.get_json()["data"]
    assert len(items) == 1
    assert items[0]["care_type"] == "medication"
    assert items[0]["status"] == "upcoming"


def test_list_reminders_returns_only_current_users_records(
    app,
    client,
    auth_headers,
    create_user,
):
    own_pet_id = create_pet(client, auth_headers)
    other_user_id = create_user("Other User", "other@example.com")
    with app.app_context():
        other_pet = Pet(user_id=other_user_id, name="Other Pet", species="Dog")
        db.session.add(other_pet)
        db.session.flush()
        db.session.add_all(
            [
                CareReminder(
                    pet_id=own_pet_id,
                    care_type="checkup",
                    due_date=date.today() + timedelta(days=20),
                    repeat_rule="none",
                ),
                CareReminder(
                    pet_id=other_pet.id,
                    care_type="checkup",
                    due_date=date.today() + timedelta(days=10),
                    repeat_rule="none",
                ),
            ]
        )
        db.session.commit()

    response = client.get("/api/reminders", headers=auth_headers)
    assert len(response.get_json()["data"]) == 1
    assert response.get_json()["data"][0]["pet_id"] == own_pet_id


def test_update_reminder_changes_database(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id),
    ).get_json()["data"]

    response = client.put(
        f"/api/reminders/{created['id']}",
        headers=auth_headers,
        json=valid_reminder(
            pet_id,
            care_type="checkup",
            due_date=future_date(45),
            repeat_rule="every_6_months",
            notes="Updated clinic appointment.",
        ),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["care_type"] == "checkup"
    with app.app_context():
        reminder = db.session.get(CareReminder, created["id"])
        assert reminder.repeat_rule == "every_6_months"
        assert reminder.notes == "Updated clinic appointment."


def test_delete_reminder_removes_database_row(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id),
    ).get_json()["data"]

    response = client.delete(
        f"/api/reminders/{created['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(CareReminder, created["id"]) is None


def test_complete_non_repeating_reminder_moves_it_to_history(
    app,
    client,
    auth_headers,
):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id, repeat_rule="none"),
    ).get_json()["data"]

    response = client.post(
        f"/api/reminders/{created['id']}/complete",
        headers=auth_headers,
        json={},
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["completed_reminder"]["status"] == "completed"
    assert payload["next_reminder"] is None
    assert client.get("/api/reminders", headers=auth_headers).get_json()["data"] == []
    history = client.get(
        "/api/reminders/history",
        headers=auth_headers,
    ).get_json()["data"]
    assert len(history) == 1
    assert history[0]["status"] == "completed"


def test_complete_repeating_reminder_creates_next_occurrence(
    app,
    client,
    auth_headers,
):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id, repeat_rule="every_2_months"),
    ).get_json()["data"]

    response = client.post(
        f"/api/reminders/{created['id']}/complete",
        headers=auth_headers,
        json={"completed_at": datetime.now(timezone.utc).isoformat()},
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    completed = payload["completed_reminder"]
    next_reminder = payload["next_reminder"]
    assert completed["status"] == "completed"
    assert next_reminder["source_reminder_id"] == completed["id"]
    assert next_reminder["due_date"] == add_months(
        date.fromisoformat(completed["due_date"]),
        2,
    ).isoformat()

    with app.app_context():
        assert CareReminder.query.count() == 2


def test_repeating_date_handles_month_end():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)


def test_completed_reminder_cannot_be_completed_or_edited_twice(
    client,
    auth_headers,
):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/reminders",
        headers=auth_headers,
        json=valid_reminder(pet_id, repeat_rule="none"),
    ).get_json()["data"]
    endpoint = f"/api/reminders/{created['id']}"
    client.post(f"{endpoint}/complete", headers=auth_headers, json={})

    second_complete = client.post(
        f"{endpoint}/complete",
        headers=auth_headers,
        json={},
    )
    edit = client.put(
        endpoint,
        headers=auth_headers,
        json=valid_reminder(pet_id),
    )

    assert second_complete.status_code == 409
    assert edit.status_code == 409


def test_user_cannot_modify_another_users_reminder(
    app,
    client,
    auth_headers,
    create_user,
):
    other_user_id = create_user("Other User", "other@example.com")
    with app.app_context():
        other_pet = Pet(user_id=other_user_id, name="Other Pet", species="Dog")
        db.session.add(other_pet)
        db.session.flush()
        reminder = CareReminder(
            pet_id=other_pet.id,
            care_type="checkup",
            due_date=date.today() + timedelta(days=20),
            repeat_rule="none",
        )
        db.session.add(reminder)
        db.session.commit()
        reminder_id = reminder.id

    assert (
        client.delete(
            f"/api/reminders/{reminder_id}",
            headers=auth_headers,
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/reminders/{reminder_id}/complete",
            headers=auth_headers,
            json={},
        ).status_code
        == 404
    )
