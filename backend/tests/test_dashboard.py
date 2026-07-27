from datetime import date, timedelta

from app.extensions import db
from app.models import CareReminder, Memory, Pet


def create_pet(client, auth_headers, name):
    response = client.post(
        "/api/pets",
        headers=auth_headers,
        json={
            "name": name,
            "species": "Cat",
            "birthday": "2023-04-18",
        },
    )
    return response.get_json()["data"]["id"]


def test_dashboard_aggregates_source_tables(app, client, auth_headers):
    dami_id = create_pet(client, auth_headers, "Dami")
    roro_id = create_pet(client, auth_headers, "Roro")

    with app.app_context():
        db.session.add_all(
            [
                CareReminder(
                    pet_id=dami_id,
                    care_type="medication",
                    due_date=date.today() + timedelta(days=2),
                    repeat_rule="none",
                ),
                CareReminder(
                    pet_id=roro_id,
                    care_type="vaccine",
                    due_date=date.today() - timedelta(days=2),
                    repeat_rule="yearly",
                ),
                Memory(
                    pet_id=dami_id,
                    title="Dami memory",
                    memory_date=date.today() - timedelta(days=2),
                ),
                Memory(
                    pet_id=roro_id,
                    title="Roro memory",
                    memory_date=date.today() - timedelta(days=1),
                ),
            ]
        )
        db.session.commit()

    response = client.get("/api/dashboard", headers=auth_headers)

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["summary"] == {
        "pet_count": 2,
        "upcoming_count": 1,
        "overdue_count": 1,
        "memory_count": 2,
    }
    assert [pet["name"] for pet in payload["pets"]] == ["Dami", "Roro"]
    assert payload["upcoming_reminders"][0]["status"] == "due_soon"
    assert payload["overdue_items"][0]["status"] == "overdue"
    assert payload["recent_memories"][0]["title"] == "Roro memory"


def test_dashboard_can_filter_one_owned_pet(app, client, auth_headers):
    dami_id = create_pet(client, auth_headers, "Dami")
    roro_id = create_pet(client, auth_headers, "Roro")
    with app.app_context():
        db.session.add_all(
            [
                Memory(
                    pet_id=dami_id,
                    title="Dami memory",
                    memory_date=date.today(),
                ),
                Memory(
                    pet_id=roro_id,
                    title="Roro memory",
                    memory_date=date.today(),
                ),
            ]
        )
        db.session.commit()

    response = client.get(
        f"/api/dashboard?pet_id={dami_id}",
        headers=auth_headers,
    )

    payload = response.get_json()["data"]
    assert payload["summary"]["pet_count"] == 1
    assert payload["summary"]["memory_count"] == 1
    assert [pet["name"] for pet in payload["pets"]] == ["Dami"]
    assert payload["recent_memories"][0]["title"] == "Dami memory"


def test_dashboard_rejects_another_users_pet(
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

    response = client.get(
        f"/api/dashboard?pet_id={private_pet_id}",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "PET_NOT_FOUND"


def test_dashboard_requires_authentication(client):
    assert client.get("/api/dashboard").status_code == 401
