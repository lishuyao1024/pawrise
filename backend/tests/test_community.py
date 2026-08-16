from datetime import date

from app.extensions import db
from app.models import CommunityBlock, CommunityPost, CommunityReport, Memory, Pet, User


def create_pet(client, headers, name="Dami", species="Cat"):
    return client.post(
        "/api/pets",
        headers=headers,
        json={"name": name, "species": species},
    ).get_json()["data"]


def create_memory(client, headers, pet_id, title="Sunny window"):
    return client.post(
        "/api/memories",
        headers=headers,
        json={
            "pet_id": pet_id,
            "title": title,
            "memory_date": date.today().isoformat(),
            "category": "daily_moment",
            "description": "A quiet afternoon together.",
            "image_url": "/api/uploads/community-test.jpg",
        },
    ).get_json()["data"]


def register(client, name, email):
    payload = client.post(
        "/api/auth/register",
        json={"full_name": name, "email": email, "password": "PawRise123!"},
    ).get_json()["data"]
    return payload, {"Authorization": f"Bearer {payload['access_token']}"}


def test_share_memory_creates_public_copy_without_changing_private_memory(app, client, auth_headers):
    pet = create_pet(client, auth_headers)
    memory = create_memory(client, auth_headers, pet["id"])

    response = client.post(
        "/api/community/posts",
        headers=auth_headers,
        json={"memory_id": memory["id"]},
    )

    assert response.status_code == 201
    post = response.get_json()["data"]
    assert post["title"] == memory["title"]
    assert post["pet"]["name"] == "Dami"
    assert post["viewer_owns"] is True
    with app.app_context():
        assert Memory.query.count() == 1
        assert CommunityPost.query.one().source_memory_id == memory["id"]


def test_different_user_can_see_and_like_public_post(client, auth_headers):
    pet = create_pet(client, auth_headers)
    memory = create_memory(client, auth_headers, pet["id"])
    post = client.post(
        "/api/community/posts", headers=auth_headers, json={"memory_id": memory["id"]}
    ).get_json()["data"]
    _, other_headers = register(client, "Other Person", "other-person@example.com")

    feed = client.get("/api/community/posts", headers=other_headers).get_json()["data"]
    assert [item["id"] for item in feed] == [post["id"]]
    liked = client.post(
        f"/api/community/posts/{post['id']}/likes", headers=other_headers
    ).get_json()["data"]
    assert liked["like_count"] == 1
    assert liked["viewer_has_liked"] is True


def test_private_memory_is_not_visible_until_explicitly_shared(client, auth_headers):
    pet = create_pet(client, auth_headers)
    create_memory(client, auth_headers, pet["id"])
    _, other_headers = register(client, "Other Person", "private-check@example.com")
    assert client.get("/api/community/posts", headers=other_headers).get_json()["data"] == []


def test_owner_can_delete_post_without_deleting_memory(app, client, auth_headers):
    pet = create_pet(client, auth_headers)
    memory = create_memory(client, auth_headers, pet["id"])
    post = client.post(
        "/api/community/posts", headers=auth_headers, json={"memory_id": memory["id"]}
    ).get_json()["data"]

    assert client.delete(f"/api/community/posts/{post['id']}", headers=auth_headers).status_code == 200
    with app.app_context():
        assert CommunityPost.query.count() == 0
        assert db.session.get(Memory, memory["id"]) is not None


def test_other_user_cannot_delete_post_but_admin_can(app, client, auth_headers):
    pet = create_pet(client, auth_headers)
    memory = create_memory(client, auth_headers, pet["id"])
    post = client.post(
        "/api/community/posts", headers=auth_headers, json={"memory_id": memory["id"]}
    ).get_json()["data"]
    other, other_headers = register(client, "Other Person", "moderator@example.com")
    assert client.delete(f"/api/community/posts/{post['id']}", headers=other_headers).status_code == 403
    with app.app_context():
        db.session.get(User, other["user"]["id"]).role = "admin"
        db.session.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": "moderator@example.com", "password": "PawRise123!"},
    ).get_json()["data"]
    admin_headers = {"Authorization": f"Bearer {login['access_token']}"}
    assert client.delete(f"/api/community/posts/{post['id']}", headers=admin_headers).status_code == 200


def test_report_and_block_hide_another_users_posts(app, client, auth_headers):
    pet = create_pet(client, auth_headers)
    memory = create_memory(client, auth_headers, pet["id"])
    post = client.post(
        "/api/community/posts", headers=auth_headers, json={"memory_id": memory["id"]}
    ).get_json()["data"]
    other, other_headers = register(client, "Other Person", "blocker@example.com")

    report = client.post(
        f"/api/community/posts/{post['id']}/reports",
        headers=other_headers,
        json={"reason": "This should be reviewed."},
    )
    assert report.status_code == 201
    assert client.post(
        f"/api/community/blocks/{post['author']['id']}", headers=other_headers
    ).status_code == 201
    assert client.get("/api/community/posts", headers=other_headers).get_json()["data"] == []
    with app.app_context():
        assert CommunityReport.query.count() == 1
        assert CommunityBlock.query.filter_by(blocker_id=other["user"]["id"]).count() == 1


def test_feed_filters_species_search_and_my_shares(client, auth_headers):
    cat = create_pet(client, auth_headers, "Dami", "Cat")
    dog = create_pet(client, auth_headers, "Milo", "Dog")
    for pet, title in ((cat, "Window sunshine"), (dog, "Park adventure")):
        memory = create_memory(client, auth_headers, pet["id"], title)
        client.post("/api/community/posts", headers=auth_headers, json={"memory_id": memory["id"]})

    cat_feed = client.get("/api/community/posts?species=cat", headers=auth_headers).get_json()["data"]
    search_feed = client.get("/api/community/posts?search=Park", headers=auth_headers).get_json()["data"]
    mine_feed = client.get("/api/community/posts?mine=true", headers=auth_headers).get_json()["data"]
    assert [post["pet"]["name"] for post in cat_feed] == ["Dami"]
    assert [post["pet"]["name"] for post in search_feed] == ["Milo"]
    assert len(mine_feed) == 2


def test_community_endpoints_require_authentication(client):
    assert client.get("/api/community/posts").status_code == 401
    assert client.post("/api/community/posts", json={}).status_code == 401
