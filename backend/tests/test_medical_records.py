from datetime import date, timedelta
from io import BytesIO

from app.extensions import db
from app.models import CareReminder, MedicalRecord, Pet


def iso_after(days):
    return (date.today() + timedelta(days=days)).isoformat()


def create_pet(client, auth_headers, name="Coco"):
    response = client.post(
        "/api/pets",
        headers=auth_headers,
        json={"name": name, "species": "Dog"},
    )
    assert response.status_code == 201
    return response.get_json()["data"]["id"]


def create_record(client, auth_headers, pet_id, source_text=None):
    response = client.post(
        "/api/medical-records",
        headers=auth_headers,
        data={
            "pet_id": str(pet_id),
            "title": "Spay surgery discharge",
            "visit_date": date.today().isoformat(),
            "source_text": source_text
            or (
                "Give Carprofen 25 mg once daily with food for 3 days. "
                f"Follow-up appointment on {(date.today() + timedelta(days=10)).strftime('%B %d, %Y')}."
            ),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    return response.get_json()["data"]


def valid_confirmation(record):
    draft = record["extracted_data"]
    draft["medications"][0]["start_date"] = iso_after(1)
    draft["follow_up"]["date"] = iso_after(10)
    return {"extracted_data": draft}


def test_medical_record_endpoints_require_authentication(client):
    assert client.get("/api/medical-records").status_code == 401
    assert client.post("/api/medical-records", data={}).status_code == 401


def test_create_record_builds_reviewable_extraction_draft(
    app, client, auth_headers
):
    pet_id = create_pet(client, auth_headers)
    record = create_record(client, auth_headers, pet_id)

    assert record["status"] == "draft"
    assert record["pet_name"] == "Coco"
    assert record["generated_reminder_count"] == 0
    assert record["extracted_data"]["medications"][0]["name"] == "Carprofen"
    assert record["extracted_data"]["medications"][0]["dose"] == "25 mg"
    assert "symptoms" not in record["extracted_data"]
    assert record["extracted_data"]["follow_up"] is not None

    with app.app_context():
        assert MedicalRecord.query.count() == 1
        assert CareReminder.query.count() == 0


def test_extraction_supports_topical_action_word_duration_and_two_medications(
    client, auth_headers
):
    pet_id = create_pet(client, auth_headers)
    record = create_record(
        client,
        auth_headers,
        pet_id,
        (
            "Apply povidone-iodine every morning and take potassium "
            "clavulanate once daily for seven days."
        ),
    )

    medications = record["extracted_data"]["medications"]
    assert len(medications) == 2
    assert medications[0]["name"] == "Povidone-Iodine"
    assert medications[0]["dose"] == ""
    assert medications[0]["frequency"] == "every morning"
    assert medications[1]["name"] == "Potassium Clavulanate"
    assert medications[1]["dose"] == ""
    assert medications[1]["frequency"] == "once daily"
    assert medications[1]["duration_days"] == 7


def test_record_requires_document_or_pasted_text(client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    response = client.post(
        "/api/medical-records",
        headers=auth_headers,
        data={"pet_id": str(pet_id), "title": "Empty record"},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert "document" in response.get_json()["error"]["details"]


def test_image_record_uses_ai_vision_without_pasted_text(
    app, client, auth_headers, monkeypatch
):
    pet_id = create_pet(client, auth_headers)
    app.config["OPENAI_API_KEY"] = "test-key"

    def fake_image_extraction(image_bytes, mime_type, reference_date, **kwargs):
        assert image_bytes == b"fake-veterinary-image"
        assert mime_type == "image/png"
        return {
            "transcription": (
                "Carprofen 25 mg tablets. Give 1 tablet once daily with food "
                "for 5 days. Next appointment: 10/01/2026."
            ),
            "medications": [
                {
                    "include": True,
                    "name": "Carprofen",
                    "dose": "25 mg",
                    "frequency": "once daily",
                    "duration_days": 5,
                    "start_date": reference_date.isoformat(),
                    "instructions": "Give 1 tablet with food.",
                    "source_text": "Carprofen 25 mg tablets.",
                }
            ],
            "follow_up": {
                "include": True,
                "date": "2026-10-01",
                "clinic": "",
                "source_text": "Next appointment: 10/01/2026.",
            },
            "extractor": "openai-vision:test-model",
        }

    monkeypatch.setattr(
        "app.routes.medical_records.extract_medical_record_from_image",
        fake_image_extraction,
    )
    response = client.post(
        "/api/medical-records",
        headers=auth_headers,
        data={
            "pet_id": str(pet_id),
            "title": "Photographed veterinary record",
            "visit_date": date.today().isoformat(),
            "document": (
                BytesIO(b"fake-veterinary-image"),
                "record.png",
                "image/png",
            ),
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    record = response.get_json()["data"]
    assert record["source_text"].startswith("Carprofen 25 mg")
    assert record["extracted_data"]["extractor"] == "openai-vision:test-model"
    assert record["extracted_data"]["medications"][0]["dose"] == "25 mg"
    assert record["extracted_data"]["follow_up"]["date"] == "2026-10-01"


def test_confirm_record_creates_standard_linked_reminders(
    app, client, auth_headers
):
    pet_id = create_pet(client, auth_headers)
    record = create_record(client, auth_headers, pet_id)

    response = client.post(
        f"/api/medical-records/{record['id']}/confirm",
        headers=auth_headers,
        json=valid_confirmation(record),
    )

    assert response.status_code == 201
    result = response.get_json()["data"]
    assert result["medical_record"]["status"] == "confirmed"
    assert len(result["created_reminders"]) == 4

    reminders = client.get("/api/reminders", headers=auth_headers).get_json()["data"]
    assert [item["care_type"] for item in reminders].count("medication") == 3
    assert [item["care_type"] for item in reminders].count("other") == 0
    assert [item["care_type"] for item in reminders].count("checkup") == 1
    assert all(item["medical_record_id"] == record["id"] for item in reminders)
    assert all(item["source_type"] == "medical_record" for item in reminders)
    assert all(
        item["medical_record_title"] == "Spay surgery discharge" for item in reminders
    )

    with app.app_context():
        assert CareReminder.query.count() == 4
        assert MedicalRecord.query.one().status == "confirmed"


def test_confirmation_requires_reviewable_valid_values(client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    record = create_record(client, auth_headers, pet_id)
    draft = record["extracted_data"]
    draft["medications"][0]["dose"] = ""
    draft["follow_up"]["date"] = iso_after(10)

    response = client.post(
        f"/api/medical-records/{record['id']}/confirm",
        headers=auth_headers,
        json={"extracted_data": draft},
    )

    assert response.status_code == 400
    assert "medications.0" in response.get_json()["error"]["details"]


def test_record_cannot_create_duplicate_reminders(client, auth_headers):
    pet_id = create_pet(client, auth_headers)
    record = create_record(client, auth_headers, pet_id)
    payload = valid_confirmation(record)
    first = client.post(
        f"/api/medical-records/{record['id']}/confirm",
        headers=auth_headers,
        json=payload,
    )
    second = client.post(
        f"/api/medical-records/{record['id']}/confirm",
        headers=auth_headers,
        json=payload,
    )

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.get_json()["error"]["code"] == "MEDICAL_RECORD_ALREADY_CONFIRMED"


def test_list_records_is_isolated_by_authenticated_user(
    app, client, auth_headers, create_user
):
    own_pet_id = create_pet(client, auth_headers)
    create_record(client, auth_headers, own_pet_id)
    other_user_id = create_user("Other User", "other@example.com")

    with app.app_context():
        other_pet = Pet(user_id=other_user_id, name="Private Pet", species="Cat")
        db.session.add(other_pet)
        db.session.flush()
        db.session.add(
            MedicalRecord(
                pet_id=other_pet.id,
                title="Private record",
                source_text="Private instructions.",
                extracted_data={},
            )
        )
        db.session.commit()

    response = client.get("/api/medical-records", headers=auth_headers)
    records = response.get_json()["data"]
    assert len(records) == 1
    assert records[0]["title"] == "Spay surgery discharge"
    assert "source_text" not in records[0]


def test_deleting_record_can_delete_incomplete_but_preserve_completed_history(
    app, client, auth_headers
):
    pet_id = create_pet(client, auth_headers)
    record = create_record(client, auth_headers, pet_id)
    created = client.post(
        f"/api/medical-records/{record['id']}/confirm",
        headers=auth_headers,
        json=valid_confirmation(record),
    ).get_json()["data"]["created_reminders"]

    completed_id = created[0]["id"]
    client.post(
        f"/api/reminders/{completed_id}/complete",
        headers=auth_headers,
        json={},
    )
    response = client.delete(
        f"/api/medical-records/{record['id']}?delete_incomplete_reminders=true",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["deleted_incomplete_reminders"] == 3
    with app.app_context():
        assert MedicalRecord.query.count() == 0
        assert CareReminder.query.count() == 1
        preserved = db.session.get(CareReminder, completed_id)
        assert preserved.completed_at is not None
        assert preserved.medical_record_id is None


def test_user_cannot_access_another_users_record(
    app, client, auth_headers, create_user
):
    other_user_id = create_user("Other User", "other@example.com")
    with app.app_context():
        other_pet = Pet(user_id=other_user_id, name="Private Pet", species="Cat")
        db.session.add(other_pet)
        db.session.flush()
        record = MedicalRecord(
            pet_id=other_pet.id,
            title="Private record",
            source_text="Private instructions.",
            extracted_data={},
        )
        db.session.add(record)
        db.session.commit()
        record_id = record.id

    assert client.get(f"/api/medical-records/{record_id}", headers=auth_headers).status_code == 404
    assert client.delete(f"/api/medical-records/{record_id}", headers=auth_headers).status_code == 404
