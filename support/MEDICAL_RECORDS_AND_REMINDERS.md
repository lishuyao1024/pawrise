# Medical Records and Care Reminders

## Feature Status

This feature is implemented in the PawRise React frontend and Flask API.

The feature lets a pet owner upload a veterinary medical record, review locally extracted information, and create standard PawRise care reminders from the confirmed information. Generated reminders use the same Home, Care Planner, completion, overdue, history, editing, and deletion behavior as reminders created manually.

The MVP uses a deterministic local extractor so it works without an external model key. The extraction result has a provider-neutral structure, allowing a hosted AI extractor to replace the local implementation later without changing confirmation or reminder behavior.

## Product Decision

Medical Records and Care Reminders are connected, but they have different responsibilities:

- **Medical Records** stores the original veterinary document and the information confirmed by the user.
- **Care Reminders** stores the actionable dates created from that confirmed information.
- **Home** displays upcoming and overdue reminders from the existing reminder system.
- **Care History** continues to display reminders after the user marks them as completed.

This feature does not introduce a separate Care Plans module or a second reminder system.

## Scope

Automated extraction is limited to two categories:

1. **Medication information**
   - Medication name
   - Dose
   - Frequency
   - Duration
   - Instructions explicitly written by the veterinarian, such as "with food"
2. **Follow-up information**
   - Follow-up date
   - Clinic or veterinarian name when present

Daily-care instructions, caregiver assignment, multi-user coordination, diagnosis, treatment recommendations, and prescription changes are out of scope.

## User Flow

```text
Medical Records
    -> Upload veterinary document
    -> Local rules extract medication and follow-up date
    -> User reviews and corrects every extracted item
    -> User confirms the result
    -> PawRise creates standard Care Reminders
    -> Reminders appear in Home and Care Planner
    -> Completed reminders appear in the existing Care History
```

AI extraction must never create reminders before the user confirms the extracted information.

## Confirmation Requirements

The confirmation screen must show:

- The extracted value
- The corresponding text from the original document
- An edit control
- An include/exclude control
- A final **Confirm and create reminders** action

Medication names, doses, frequencies, and dates require explicit confirmation. PawRise must not infer a dose or add medical advice that is not present in the source document.

## Reminder Mapping

Confirmed information is converted into the current `CareReminder` structure.

| Extracted information | Existing `care_type` | Reminder behavior |
|---|---|---|
| Medication dose | `medication` | Create one dated reminder for each scheduled day; preserve frequency in its notes |
| Follow-up visit | `checkup` | Create one reminder on the confirmed follow-up date |

For a finite medication course, PawRise creates individual non-repeating reminders. For example, a once-daily medication for three days creates three reminders with `repeat_rule: none`. The existing monthly and yearly repeat rules are not used to represent short medication courses.

The current reminder model is date-based. Medication times are preserved in the reminder notes until the product adds time-based reminder support.

## Shared Reminder Behavior

Medical-record reminders behave exactly like manually created care reminders:

- They appear in Home as upcoming, due soon, or overdue.
- They appear in the Care Planner reminder list.
- The user can edit or delete an active reminder.
- The user can mark a reminder as completed.
- Completed reminders move to the existing Care History.
- Dashboard counts and filters use the existing reminder data.

The only visible difference is a source label:

```text
Source: Medical Record
```

Manual reminders may display:

```text
Source: Manually added
```

## Record-to-Reminder Link

Each generated reminder keeps a reference to the medical record that created it through the implemented fields:

```text
medical_record_id
source_type = "medical_record"
```

This relationship enables both directions of navigation:

- From a reminder, the user can select **View Medical Record**.
- From a medical record, the user can see the reminders generated from it.

The original medical record remains the source of truth. A reminder is an actionable copy of confirmed information, not a replacement for the document.

## Edit and Delete Rules

- Editing a generated reminder does not change the original medical record.
- Completing a reminder does not change or remove the medical record.
- Deleting a reminder does not delete the medical record.
- Deleting a medical record requires confirmation.
- Before deleting a medical record, PawRise must tell the user how many incomplete reminders are linked to it and ask whether those reminders should also be deleted.
- Completed Care History entries should be preserved unless the user explicitly chooses to remove them.

## Example

A user uploads the following veterinary discharge instruction for Coco:

```text
Give Carprofen 25 mg once daily with food for 3 days.
Follow-up appointment on August 19.
```

After user confirmation, PawRise creates:

```text
Medication | August 10 | Carprofen 25 mg; with food; source: Medical Record
Medication | August 11 | Carprofen 25 mg; with food; source: Medical Record
Medication | August 12 | Carprofen 25 mg; with food; source: Medical Record
Checkup    | August 19 | Follow-up appointment; source: Medical Record
```

These items appear in the same Home reminder list as manually added vaccines, deworming, checkups, medications, weight records, and other reminders. When the user completes an item, PawRise processes it through the existing completion endpoint and displays it in Care History.

## Safety Boundary

PawRise organizes veterinary instructions; it does not practice veterinary medicine.

- AI output must be presented as an unconfirmed draft.
- The original document must remain available for comparison.
- PawRise must not calculate, increase, decrease, or replace a medication dose.

## Acceptance Criteria

The feature is complete when:

1. An authenticated user can upload and store a medical record for one of their pets.
2. The user can review, edit, include, or exclude every extracted item before confirmation.
3. No reminder is created without user confirmation.
4. Confirmed medication and follow-up items become standard Care Reminders.
5. Generated reminders appear in the existing Home and Care Planner views.
6. Generated reminders support the existing edit, delete, complete, overdue, and Care History behavior.
7. Each generated reminder links back to its source medical record.
8. Editing or deleting a reminder does not silently alter or delete the medical record.
9. The interface clearly distinguishes AI-extracted drafts from user-confirmed reminders.
