from io import BytesIO


def test_image_upload_requires_authentication(client):
    response = client.post(
        "/api/uploads",
        data={"image": (BytesIO(b"image-data"), "pet.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401


def test_image_upload_rejects_unsupported_files(client, auth_headers):
    response = client.post(
        "/api/uploads",
        headers=auth_headers,
        data={"image": (BytesIO(b"not-an-image"), "notes.txt")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "UNSUPPORTED_IMAGE"


def test_image_upload_returns_a_working_url(client, auth_headers, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = tmp_path
    response = client.post(
        "/api/uploads",
        headers=auth_headers,
        data={"image": (BytesIO(b"small-test-image"), "pet.png")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    payload = response.get_json()["data"]
    image_response = client.get(f"/api/uploads/{payload['filename']}")
    assert image_response.status_code == 200
    assert image_response.data == b"small-test-image"
