import re
from datetime import date, datetime


FREQUENCIES = (
    (r"\bevery\s+morning\b", "every morning", 1),
    (r"\bevery\s+evening\b", "every evening", 1),
    (r"\bevery\s+night\b|\bat\s+night\b", "every night", 1),
    (r"\bonce\s+(?:a\s+)?daily\b|\bonce\s+per\s+day\b", "once daily", 1),
    (r"\btwice\s+(?:a\s+)?daily\b|\btwice\s+per\s+day\b", "twice daily", 2),
    (r"\bthree\s+times\s+(?:a\s+)?daily\b", "three times daily", 3),
    (r"\bfour\s+times\s+(?:a\s+)?daily\b", "four times daily", 4),
)

ACTION_PATTERN = r"(?:give|administer|take|apply)"
DOSE_PATTERN = (
    r"\d+(?:\.\d+)?\s*"
    r"(?:mcg|mg|g|ml|mL|tablet(?:s)?|capsule(?:s)?|drop(?:s)?|unit(?:s)?)"
)

NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
}

DATE_FORMATS = (
    "%B %d, %Y",
    "%b %d, %Y",
    "%B %d %Y",
    "%b %d %Y",
    "%B %d",
    "%b %d",
    "%m/%d/%Y",
    "%m/%d/%y",
    "%Y-%m-%d",
)


def sentences_from(text):
    return [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+|[\r\n]+", text or "")
        if sentence.strip()
    ]


def medication_clauses_from(sentence):
    """Split a sentence only when a new medication action clearly begins."""
    return [
        clause.strip()
        for clause in re.split(
            rf"\s+(?:and|then)\s+(?={ACTION_PATTERN}\b)",
            sentence,
            flags=re.IGNORECASE,
        )
        if clause.strip()
    ]


def positive_number(raw_value):
    if not raw_value:
        return None
    if raw_value.isdigit():
        return int(raw_value)

    parts = raw_value.lower().replace("-", " ").split()
    values = [NUMBER_WORDS.get(part) for part in parts]
    if not values or any(value is None for value in values):
        return None
    if len(values) == 1:
        return values[0]
    if len(values) == 2 and values[0] in {20, 30, 40, 50} and values[1] < 10:
        return values[0] + values[1]
    return None


def parse_date(raw_value, reference_date=None):
    cleaned = raw_value.strip().rstrip(".,")
    for date_format in DATE_FORMATS:
        try:
            parsed = datetime.strptime(cleaned, date_format).date()
        except ValueError:
            continue
        if "%Y" not in date_format and "%y" not in date_format:
            year = (reference_date or date.today()).year
            parsed = parsed.replace(year=year)
        return parsed
    return None


def medication_from_sentence(sentence, reference_date):
    action_match = re.search(rf"\b{ACTION_PATTERN}\s+", sentence, re.IGNORECASE)
    if not action_match:
        return None

    medication_text = sentence[action_match.end():].strip().rstrip(".")
    dose_match = re.search(rf"\b(?P<dose>{DOSE_PATTERN})\b", medication_text, re.IGNORECASE)

    if dose_match:
        raw_name = medication_text[:dose_match.start()].strip()
        dose = dose_match.group("dose").strip()
    else:
        raw_name = re.split(
            r"\b(?:once|twice|three\s+times|four\s+times|every|for|with|at\s+night|on\s+an\s+empty\s+stomach)\b",
            medication_text,
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()
        dose = ""

    name_match = re.fullmatch(
        r"[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z][A-Za-z0-9_-]*){0,4}",
        raw_name,
    )
    if not name_match:
        return None

    frequency = None
    for pattern, label, _count in FREQUENCIES:
        if re.search(pattern, sentence, re.IGNORECASE):
            frequency = label
            break

    every_hours = re.search(r"\bevery\s+(\d{1,2})\s+hours?\b", sentence, re.IGNORECASE)
    if every_hours:
        hours = int(every_hours.group(1))
        if hours in {6, 8, 12, 24}:
            frequency = f"every {hours} hours"

    duration_match = re.search(
        r"\bfor\s+(\d{1,2}|[a-z]+(?:[-\s][a-z]+)?)\s+days?\b",
        sentence,
        re.IGNORECASE,
    )
    parsed_duration = positive_number(duration_match.group(1)) if duration_match else None
    duration_days = parsed_duration or 1

    instructions = []
    for phrase in ("with food", "on an empty stomach", "with water"):
        if phrase in sentence.lower():
            instructions.append(phrase)

    return {
        "include": True,
        "name": raw_name.title(),
        "dose": dose,
        "frequency": frequency or "once daily",
        "duration_days": min(max(duration_days, 1), 60),
        "start_date": (reference_date or date.today()).isoformat(),
        "instructions": ", ".join(instructions),
        "source_text": sentence,
    }


def follow_up_from_sentence(sentence, reference_date):
    if not re.search(r"\bfollow[- ]?up\b|\brecheck\b", sentence, re.IGNORECASE):
        return None
    date_match = re.search(
        r"(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)",
        sentence,
        re.IGNORECASE,
    )
    if not date_match:
        return None
    parsed = parse_date(date_match.group(1), reference_date)
    if parsed is None:
        return None
    return {
        "include": True,
        "date": parsed.isoformat(),
        "clinic": "",
        "source_text": sentence,
    }


def extract_medical_record_local(text, reference_date=None):
    """Create a reviewable local extraction draft.

    This deterministic extractor keeps the MVP usable without an external model.
    Its output shape is intentionally model-agnostic so an AI provider can replace
    it later without changing the confirmation or reminder-creation workflow.
    """
    medications = []
    follow_up = None

    for sentence in sentences_from(text):
        for clause in medication_clauses_from(sentence):
            medication = medication_from_sentence(clause, reference_date)
            if medication:
                medications.append(medication)
        candidate_follow_up = follow_up_from_sentence(sentence, reference_date)
        if candidate_follow_up:
            follow_up = candidate_follow_up

    return {
        "medications": medications,
        "follow_up": follow_up,
        "extractor": "local_rules_v2",
    }


# Backward-compatible name for callers that explicitly want the offline extractor.
extract_medical_record = extract_medical_record_local
