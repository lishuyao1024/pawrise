from datetime import date
from types import SimpleNamespace

from app.services.ai_medical_extraction import (
    FollowUpResult,
    MedicalRecordResult,
    MedicationResult,
    extract_medical_record,
    extract_medical_record_with_ai,
)


class FakeResponses:
    def __init__(self, parsed=None, error=None):
        self.parsed = parsed
        self.error = error
        self.kwargs = None

    def parse(self, **kwargs):
        self.kwargs = kwargs
        if self.error:
            raise self.error
        return SimpleNamespace(output_parsed=self.parsed)


class FakeClient:
    def __init__(self, parsed=None, error=None):
        self.responses = FakeResponses(parsed, error)


def test_ai_extraction_returns_reviewable_structured_data():
    parsed = MedicalRecordResult(
        medications=[
            MedicationResult(
                name="Povidone-iodine",
                dose="",
                frequency="every morning",
                duration_days=None,
                instructions="apply topically",
                source_text="Apply povidone-iodine every morning.",
            ),
            MedicationResult(
                name="Potassium clavulanate",
                dose="",
                frequency="once daily",
                duration_days=7,
                instructions="",
                source_text="Take potassium clavulanate once daily for seven days.",
            ),
        ],
        follow_up=FollowUpResult(
            date="2026-08-19",
            clinic="",
            source_text="Follow up August 19, 2026.",
        ),
    )
    client = FakeClient(parsed=parsed)

    result = extract_medical_record_with_ai(
        "Veterinary instructions",
        date(2026, 8, 9),
        client=client,
        model="test-model",
    )

    assert result["extractor"] == "openai:test-model"
    assert len(result["medications"]) == 2
    assert result["medications"][0]["dose"] == ""
    assert result["medications"][0]["duration_days"] is None
    assert result["medications"][1]["duration_days"] == 7
    assert result["follow_up"]["date"] == "2026-08-19"
    assert client.responses.kwargs["text_format"] is MedicalRecordResult


def test_ai_failure_uses_local_fallback():
    client = FakeClient(error=RuntimeError("temporary failure"))

    result = extract_medical_record(
        "Give Carprofen 25 mg once daily for 3 days.",
        date(2026, 8, 9),
        client=client,
    )

    assert result["extractor"] == "local_rules_v2"
    assert result["fallback_used"] is True
    assert result["medications"][0]["name"] == "Carprofen"
