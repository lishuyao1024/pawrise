from datetime import date, timedelta

from app.extensions import db
from app.models import Memory, Pet


def create_pet(client, auth_headers, name="Dami"):
    response = client.post(
        "/api/pets",
        headers=auth_headers,
        json={"name": name, "species": "Cat"},
    )
    return response.get_json()["data"]["id"]


def valid_memory(pet_id, **overrides):
    payload = {
        "pet_id": pet_id,
        "title": "Window sunshine nap",
        "memory_date": (date.today() - timedelta(days=3)).isoformat(),
        "category": "daily_moment",
        "scene": "Quiet afternoon at home",
        "description": "Dami found the warmest patch of light.",
        "image_url": "/uploads/memories/dami-window-nap.png",
    }
    payload.update(overrides)
    return payload


def test_create_memory_persists_database_row(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    response = client.post(
        "/api/memories",
        headers=auth_headers,
        json=valid_memory(pet_id),
    )

    assert response.status_code == 201
    payload = response.get_json()["data"]
    assert payload["pet_name"] == "Dami"
    assert payload["title"] == "Window sunshine nap"
    with app.app_context():
        assert Memory.query.one().category == "daily_moment"


def test_memory_endpoints_require_authentication(client):
    assert client.get("/api/memories").status_code == 401
    assert client.post("/api/memories", json={}).status_code == 401


def test_create_memory_rejects_invalid_fields(client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    response = client.post(
        "/api/memories",
        headers=auth_headers,
        json={
            "pet_id": pet_id,
            "title": "",
            "memory_date": (date.today() + timedelta(days=1)).isoformat(),
            "category": "unknown",
            "scene": 123,
            "description": 456,
        },
    )

    assert response.status_code == 400
    assert set(response.get_json()["error"]["details"]) == {
        "title",
        "memory_date",
        "category",
        "scene",
        "description",
    }


def test_create_memory_rejects_another_users_pet(
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

    response = client.post(
        "/api/memories",
        headers=auth_headers,
        json=valid_memory(pet_id),
    )
    assert response.status_code == 400
    assert "pet_id" in response.get_json()["error"]["details"]


def test_list_memories_filters_and_orders_current_users_data(
    app,
    client,
    auth_headers,
    create_user,
):
    own_pet_id = create_pet(client, auth_headers)
    second_pet_id = create_pet(client, auth_headers, "Roro")
    other_user_id = create_user("Other User", "other@example.com")

    with app.app_context():
        other_pet = Pet(user_id=other_user_id, name="Hidden Pet", species="Dog")
        db.session.add(other_pet)
        db.session.flush()
        db.session.add_all(
            [
                Memory(
                    pet_id=own_pet_id,
                    title="Older birthday",
                    memory_date=date.today() - timedelta(days=20),
                    category="birthday",
                ),
                Memory(
                    pet_id=own_pet_id,
                    title="Newest birthday",
                    memory_date=date.today() - timedelta(days=2),
                    category="birthday",
                ),
                Memory(
                    pet_id=second_pet_id,
                    title="Other own memory",
                    memory_date=date.today() - timedelta(days=1),
                    category="daily_moment",
                ),
                Memory(
                    pet_id=other_pet.id,
                    title="Hidden memory",
                    memory_date=date.today(),
                    category="birthday",
                ),
            ]
        )
        db.session.commit()

    response = client.get(
        f"/api/memories?pet_id={own_pet_id}&category=birthday",
        headers=auth_headers,
    )
    titles = [item["title"] for item in response.get_json()["data"]]
    assert titles == ["Newest birthday", "Older birthday"]


def test_update_memory_changes_database(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/memories",
        headers=auth_headers,
        json=valid_memory(pet_id),
    ).get_json()["data"]

    response = client.put(
        f"/api/memories/{created['id']}",
        headers=auth_headers,
        json=valid_memory(
            pet_id,
            title="Updated sunshine nap",
            description="Updated memory story.",
        ),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["title"] == "Updated sunshine nap"
    with app.app_context():
        memory = db.session.get(Memory, created["id"])
        assert memory.description == "Updated memory story."


def test_delete_memory_removes_database_row(app, client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    created = client.post(
        "/api/memories",
        headers=auth_headers,
        json=valid_memory(pet_id),
    ).get_json()["data"]

    response = client.delete(
        f"/api/memories/{created['id']}",
        headers=auth_headers,
    )

    assert response.status_code == 200
    with app.app_context():
        assert db.session.get(Memory, created["id"]) is None


def test_user_cannot_modify_another_users_memory(
    app,
    client,
    auth_headers,
    create_user,
):
    other_user_id = create_user("Other User", "other@example.com")
    with app.app_context():
        pet = Pet(user_id=other_user_id, name="Other Pet", species="Dog")
        db.session.add(pet)
        db.session.flush()
        memory = Memory(
            pet_id=pet.id,
            title="Private memory",
            memory_date=date.today(),
        )
        db.session.add(memory)
        db.session.commit()
        pet_id = pet.id
        memory_id = memory.id

    assert (
        client.put(
            f"/api/memories/{memory_id}",
            headers=auth_headers,
            json=valid_memory(pet_id),
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/memories/{memory_id}",
            headers=auth_headers,
        ).status_code
        == 404
    )
