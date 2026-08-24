from app.extensions import db
from app.models import User


def test_regular_user_cannot_access_admin_posts(client, auth_headers):
    response = client.get("/api/admin/posts", headers=auth_headers)

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "FORBIDDEN"


def test_admin_can_access_admin_posts(app, client, registered_user):
    with app.app_context():
        user = db.session.get(User, registered_user["user"]["id"])
        user.role = "admin"
        db.session.commit()

    headers = {"Authorization": f"Bearer {registered_user['access_token']}"}
    response = client.get("/api/admin/posts", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"] == []
