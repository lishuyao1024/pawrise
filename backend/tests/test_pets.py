from datetime import date, datetime, timezone

from app.extensions import db
from app.models import CareReminder, Memory, Pet, User


VALID_PET = {
    "name": "Dami",
    "species": "Cat",
    "breed": "Siamese",
    "birthday": "2023-04-18",
    "adoption_date": "2023-06-12",
    "weight_lb": 9.2,
    "image_url": "/uploads/pets/dami-profile.png",
    "notes": "Gentle, vocal, and happiest near the window.",
}


def test_create_pet_persists_database_row(app, client, auth_headers):
    response = client.post("/api/pets", headers=auth_headers, json=VALID_PET)

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["data"]["name"] == "Dami"
    assert payload["data"]["weight_lb"] == 9.2
    assert payload["data"]["age_years"] >= 3

    with app.app_context():
        pet = Pet.query.one()
        assert pet.name == "Dami"
        assert pet.species == "Cat"


def test_pet_endpoints_require_authentication(client):
    assert client.get("/api/pets").status_code == 401
    assert client.post("/api/pets", json=VALID_PET).status_code == 401


def test_list_pets_returns_only_authenticated_users_pets(
    app,
    client,
    auth_headers,
    create_user,
):
    client.post("/api/pets", headers=auth_headers, json=VALID_PET)
    other_user_id = create_user("Other User", "other@example.com")

    with app.app_context():
        db.session.add(
            Pet(
                user_id=other_user_id,
                name="Hidden Pet",
                species="Dog",
            )
        )
        db.session.commit()

    response = client.get("/api/pets", headers=auth_headers)

    assert response.status_code == 200
    pets = response.get_json()["data"]
    assert [pet["name"] for pet in pets] == ["Dami"]


def test_get_pet_includes_related_summary(app, client, auth_headers):
    create_response = client.post("/api/pets", headers=auth_headers, json=VALID_PET)
    pet_id = create_response.get_json()["data"]["id"]

    with app.app_context():
        db.session.add_all(
            [
                CareReminder(
                    pet_id=pet_id,
                    care_type="checkup",
                    due_date=date(2026, 9, 1),
                    repeat_rule="none",
                ),
                CareReminder(
                    pet_id=pet_id,
                    care_type="vaccine",
                    due_date=date(2026, 6, 1),
                    repeat_rule="yearly",
                    completed_at=datetime.now(timezone.utc),
                ),
                Memory(
                    pet_id=pet_id,
                    title="Sunny afternoon",
                    memory_date=date(2026, 7, 1),
                ),
            ]
        )
        db.session.commit()

    response = client.get(f"/api/pets/{pet_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["summary"] == {
        "active_reminders": 1,
        "completed_reminders": 1,
        "memories": 1,
    }


def test_update_pet_changes_database(app, client, auth_headers):
    create_response = client.post("/api/pets", headers=auth_headers, json=VALID_PET)
    pet_id = create_response.get_json()["data"]["id"]
    updated = {
        **VALID_PET,
        "weight_lb": 9.5,
        "notes": "Updated after the July checkup.",
    }

    response = client.put(
        f"/api/pets/{pet_id}",
        headers=auth_headers,
        json=updated,
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["weight_lb"] == 9.5

    with app.app_context():
        pet = db.session.get(Pet, pet_id)
        assert float(pet.weight_lb) == 9.5
        assert pet.notes == "Updated after the July checkup."


def test_delete_pet_cascades_related_records(app, client, auth_headers):
    create_response = client.post("/api/pets", headers=auth_headers, json=VALID_PET)
    pet_id = create_response.get_json()["data"]["id"]

    with app.app_context():
        db.session.add(
            CareReminder(
                pet_id=pet_id,
                care_type="checkup",
                due_date=date(2026, 9, 1),
                repeat_rule="none",
            )
        )
        db.session.add(
            Memory(
                pet_id=pet_id,
                title="Sunny afternoon",
                memory_date=date(2026, 7, 1),
            )
        )
        db.session.commit()

    response = client.delete(f"/api/pets/{pet_id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.get_json()["data"]["deleted_pet_id"] == pet_id
    with app.app_context():
        assert db.session.get(Pet, pet_id) is None
        assert CareReminder.query.count() == 0
        assert Memory.query.count() == 0


def test_user_cannot_access_another_users_pet(
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
        pet_id = pet.id

    assert client.get(f"/api/pets/{pet_id}", headers=auth_headers).status_code == 404
    assert (
        client.put(
            f"/api/pets/{pet_id}",
            headers=auth_headers,
            json=VALID_PET,
        ).status_code
        == 404
    )
    assert client.delete(f"/api/pets/{pet_id}", headers=auth_headers).status_code == 404


def test_create_pet_rejects_invalid_values(client, auth_headers):
    response = client.post(
        "/api/pets",
        headers=auth_headers,
        json={
            "name": "",
            "species": "",
            "birthday": "2999-01-01",
            "adoption_date": "not-a-date",
            "weight_lb": -2,
        },
    )

    assert response.status_code == 400
    details = response.get_json()["error"]["details"]
    assert set(details) == {
        "name",
        "species",
        "birthday",
        "adoption_date",
        "weight_lb",
    }


def test_nonexistent_pet_returns_not_found(client, auth_headers):
    response = client.get("/api/pets/9999", headers=auth_headers)

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "PET_NOT_FOUND"
