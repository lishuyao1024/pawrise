import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Cat, CheckCircle2, ChevronRight, Clock3, Dog, Download, Eye, EyeOff, FileText, Footprints, HeartPulse, LogOut, Mars, PawPrint, Pencil, Pill, Plus, Repeat2, Scale, Scissors, ShieldCheck, Sparkles, Stethoscope, Syringe, Trash2, Upload, UserRound, Users, Venus, Worm, X } from "lucide-react";
import authBrandPanel from "./assets/auth-brand-panel-v2.png";
import damiProfile from "./assets/dami-profile.png";
import roroProfile from "./assets/roro-profile.png";
import { api, AUTH_SESSION_EXPIRED_EVENT, clearAccessToken, hasAccessToken, setAccessToken } from "./api.js";
import CommunityView from "./CommunityView.jsx";

const CAT_DEFAULT_PHOTOS = [
  damiProfile,
  roroProfile,
  "/default-pets/cat-1.jpg",
  "/default-pets/cat-4.jpg",
];

const DOG_DEFAULT_PHOTOS = [
  "/default-pets/dog-1.jpg",
  "/default-pets/dog-3.jpg",
  "/default-pets/dog-4.jpg",
];

const PET_PHOTO_POSITIONS = new Map([
  [damiProfile, "45% 40%"],
  [roroProfile, "50% 36%"],
  ["/default-pets/cat-1.jpg", "50% 12%"],
  ["/default-pets/cat-4.jpg", "50% 10%"],
  ["/default-pets/dog-1.jpg", "50% 5%"],
  ["/default-pets/dog-3.jpg", "50% 14%"],
  ["/default-pets/dog-4.jpg", "50% 12%"],
]);

function defaultPetPhotoPool(species) {
  return species?.trim().toLowerCase() === "dog" ? DOG_DEFAULT_PHOTOS : CAT_DEFAULT_PHOTOS;
}

function randomDefaultPetPhoto(species) {
  const pool = defaultPetPhotoPool(species);
  return pool[Math.floor(Math.random() * pool.length)];
}

function stableDefaultPetPhoto(species, id) {
  const pool = defaultPetPhotoPool(species);
  const numericId = Number(id);
  const index = Number.isFinite(numericId) ? Math.abs(numericId) % pool.length : 0;
  return pool[index];
}

function petPhotoStyle(image) {
  return { objectPosition: PET_PHOTO_POSITIONS.get(image) || "50% 38%" };
}

const isoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const todayIso = () => isoDate(new Date());
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return isoDate(date);
};

function formatEnglishDateInput(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : String(value || "");
}

function parseEnglishDateInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const englishMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!englishMatch && !isoMatch) return null;
  const monthValue = englishMatch?.[1] ?? isoMatch[2];
  const dayValue = englishMatch?.[2] ?? isoMatch[3];
  const yearValue = englishMatch?.[3] ?? isoMatch[1];
  const month = Number(monthValue);
  const day = Number(dayValue);
  const year = Number(yearValue);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function EnglishDateInput({ value, onChange, min, max, ariaLabel, className }) {
  const [displayValue, setDisplayValue] = useState(() => formatEnglishDateInput(value));
  const calendarInputRef = useRef(null);

  useEffect(() => {
    setDisplayValue(formatEnglishDateInput(value));
  }, [value]);

  function commitValue() {
    const parsed = parseEnglishDateInput(displayValue);
    const valid = parsed !== null && (!parsed || ((!min || parsed >= min) && (!max || parsed <= max)));
    if (valid) onChange(parsed);
    else setDisplayValue(formatEnglishDateInput(value));
  }

  function openCalendar() {
    const calendarInput = calendarInputRef.current;
    if (!calendarInput) return;
    if (typeof calendarInput.showPicker === "function") calendarInput.showPicker();
    else calendarInput.click();
  }

  return (
    <span className={className ? `english-date-input ${className}` : "english-date-input"}>
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        placeholder="MM/DD/YYYY"
        type="text"
        value={displayValue}
        onBlur={commitValue}
        onChange={(event) => setDisplayValue(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
      <button aria-label={`Choose ${ariaLabel?.replace(", MM/DD/YYYY", "") || "date"} from calendar`} className="english-date-picker-button" type="button" onClick={openCalendar}>
        <CalendarDays aria-hidden="true" />
      </button>
      <input
        ref={calendarInputRef}
        aria-hidden="true"
        className="english-date-native-picker"
        max={max}
        min={min}
        tabIndex={-1}
        type="date"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}

const primaryNavigation = [
  { page: "Home", label: "Dashboard", Icon: HeartPulse },
  { page: "Care Planner", label: "Care Planner", Icon: CalendarDays },
  { page: "Medical Records", label: "Smart Records", Icon: FileText },
  { page: "Community", label: "Community", Icon: Users },
  { page: "My Pets", label: "My Pets", Icon: PawPrint },
  { page: "Settings", label: "Settings", Icon: UserRound },
];

const initialPets = [
  {
    id: "dami",
    name: "Dami",
    breed: "Siamese cat",
    age: "3 years",
    birthday: "Apr 18, 2023",
    adoption: "Jun 12, 2023",
    weight: "9.2 lb",
    image: damiProfile,
    note: "Gentle, vocal, and happiest near the window.",
  },
  {
    id: "roro",
    name: "Roro",
    breed: "Abyssinian cat",
    age: "2 years",
    birthday: "Sep 03, 2024",
    adoption: "Oct 20, 2024",
    weight: "8.4 lb",
    image: roroProfile,
    note: "Curious, quick, and always inspecting new shelves.",
  },
];

const initialReminders = [
  {
    id: 1,
    petId: "dami",
    type: "Vaccine",
    due: "2026-07-18",
    repeat: "Every year",
    note: "Rabies vaccine at Green Valley Vet.",
  },
  {
    id: 2,
    petId: "dami",
    type: "Medication",
    due: "2026-07-24",
    repeat: "Every 2 months",
    note: "Flea prevention refill.",
  },
  {
    id: 3,
    petId: "roro",
    type: "Deworming",
    due: "2026-08-03",
    repeat: "Every 2 months",
    note: "Follow package dosage and confirm with clinic label.",
  },
  {
    id: 4,
    petId: "roro",
    type: "Checkup",
    due: "2026-09-07",
    repeat: "Every 6 months",
    note: "Routine exam, healthy coat and appetite.",
  },
];

const emptyPetDraft = {
  name: "",
  species: "Cat",
  sex: "",
  breed: "",
  age: "",
  ageMode: "birthday",
  birthday: "",
  estimatedAge: "",
  estimatedAgeUnit: "years",
  adoption: "",
  weight: "",
  note: "",
};

const emptyHealthDraft = {
  petId: "",
  type: "Vaccine",
  customType: "",
  due: tomorrowIso(),
  repeat: "Does not repeat",
  repeatInterval: 1,
  repeatUnit: "week",
  note: "",
};

const emptyMedicalRecordDraft = {
  petId: "",
  title: "",
  visitDate: todayIso(),
  sourceText: "",
};

function petName(pets, id) {
  return pets.find((pet) => pet.id === id)?.name ?? "All pets";
}

function dateValue(value) {
  return new Date(`${value}T12:00:00`);
}

function formatCareDate(value) {
  return dateValue(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function daysUntil(value) {
  const due = dateValue(value);
  const today = dateValue(todayIso());
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDay - todayDay) / 86400000);
}

function isDueWithinNextTwoWeeks(value) {
  const days = daysUntil(value);
  return days >= 0 && days <= 14;
}

function isDueWithinNextSevenDays(value) {
  const days = daysUntil(value);
  return days >= 0 && days <= 7;
}

function careDueCountdown(value) {
  const days = daysUntil(value);
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function approximateAgeLabel(value, unit) {
  if (value === "" || value == null) return "Age not set";
  const singularUnit = unit === "months" ? "month" : "year";
  const label = Number(value) === 1 ? singularUnit : unit;
  return `About ${value} ${label}`;
}

function PetAgeField({ className = "", petDraft, setPetDraft }) {
  const approximate = petDraft.ageMode === "approximate";
  const maximum = petDraft.estimatedAgeUnit === "months" ? 1200 : 100;

  return (
    <fieldset className={`pet-age-field ${className}`.trim()}>
      <legend>Age information</legend>
      <div className="age-mode-toggle" aria-label="Age entry method">
        <button
          aria-pressed={!approximate}
          className={!approximate ? "selected" : ""}
          type="button"
          onClick={() => setPetDraft((current) => ({ ...current, ageMode: "birthday" }))}
        >
          Exact birthday
        </button>
        <button
          aria-pressed={approximate}
          className={approximate ? "selected" : ""}
          type="button"
          onClick={() => setPetDraft((current) => ({ ...current, ageMode: "approximate" }))}
        >
          Approx. age
        </button>
      </div>

      {approximate ? (
        <div className="approximate-age-field">
          <span>Best estimate</span>
          <div className="approximate-age-control">
            <input
              aria-label="Approximate age"
              inputMode="numeric"
              max={maximum}
              min="1"
              step="1"
              type="number"
              value={petDraft.estimatedAge}
              onChange={(event) => setPetDraft((current) => ({ ...current, estimatedAge: event.target.value }))}
              placeholder="3"
            />
            <select
              aria-label="Approximate age unit"
              value={petDraft.estimatedAgeUnit}
              onChange={(event) => setPetDraft((current) => ({ ...current, estimatedAgeUnit: event.target.value }))}
            >
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
          <small>An estimate is enough—you can update it later.</small>
        </div>
      ) : (
        <label className="exact-birthday-field">
          <span>Birthday</span>
          <EnglishDateInput ariaLabel="Birthday, MM/DD/YYYY" max={todayIso()} value={petDraft.birthday} onChange={(birthday) => setPetDraft((current) => ({ ...current, birthday }))} />
        </label>
      )}
    </fieldset>
  );
}

function reminderStatus(due) {
  const days = daysUntil(due);
  if (days < 0) return "overdue";
  if (days <= 7) return "due-soon";
  return "upcoming";
}

const repeatToApi = {
  "Does not repeat": "none",
  "Every week": "weekly",
  "Every 2 weeks": "every_2_weeks",
  "Every month": "monthly",
  "Every 2 months": "every_2_months",
  "Every 3 months": "every_3_months",
  "Every 6 months": "every_6_months",
  "Every year": "yearly",
};

const repeatFromApi = Object.fromEntries(Object.entries(repeatToApi).map(([label, value]) => [value, label]));

function repeatSummary(record, oneTimeLabel = "One-time care") {
  if (record.repeat === "Does not repeat") return oneTimeLabel;
  if (record.repeat !== "Custom interval") return record.repeat;
  const interval = Number(record.repeatInterval) || 1;
  const unit = record.repeatUnit || "week";
  if (interval === 1) return `Every ${unit}`;
  return `Every ${interval} ${unit}s`;
}

function normalizeUser(user = {}) {
  return {
    name: user.full_name || "",
    email: user.email || "",
    avatarUrl: user.avatar_url || "",
    role: user.role || "user",
  };
}

function normalizePet(pet) {
  const ageIsEstimated = Boolean(pet.age_is_estimated);
  return {
    id: String(pet.id),
    name: pet.name,
    species: pet.species,
    sex: pet.sex || "",
    breed: pet.breed || pet.species,
    age: ageIsEstimated
      ? approximateAgeLabel(pet.estimated_age_value, pet.estimated_age_unit)
      : pet.age_years == null ? "Age not set" : `${pet.age_years} years`,
    ageMode: ageIsEstimated ? "approximate" : "birthday",
    birthday: pet.birthday || "",
    estimatedAge: pet.estimated_age_value ?? "",
    estimatedAgeUnit: pet.estimated_age_unit || "years",
    ageIsEstimated,
    adoption: pet.adoption_date || "",
    weight: pet.weight_lb ?? "",
    image: pet.image_url || stableDefaultPetPhoto(pet.species, pet.id),
    note: pet.notes || "No notes yet.",
  };
}

function normalizeReminder(reminder) {
  const category = reminder.care_type === "other"
    ? "Custom"
    : reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1);
  return {
    id: String(reminder.id),
    petId: String(reminder.pet_id),
    type: reminder.care_type === "other" ? (reminder.custom_label || "Custom") : category,
    category,
    customType: reminder.custom_label || "",
    due: reminder.due_date,
    repeat: reminder.repeat_rule === "custom"
      ? "Custom interval"
      : repeatFromApi[reminder.repeat_rule] || "Does not repeat",
    repeatInterval: reminder.repeat_interval ?? 1,
    repeatUnit: reminder.repeat_unit || "week",
    note: reminder.notes || "",
    status: reminder.status,
    completedId: String(reminder.id),
    completedAt: reminder.completed_at || "",
    completedOn: reminder.completed_at ? new Date(reminder.completed_at).toLocaleDateString("en-US") : "",
    medicalRecordId: reminder.medical_record_id ? String(reminder.medical_record_id) : null,
    medicalRecordTitle: reminder.medical_record_title || "",
    sourceType: reminder.source_type || "manual",
  };
}

function petPayload(draft) {
  const approximate = draft.ageMode === "approximate";
  return {
    name: draft.name.trim(),
    species: draft.species.trim(),
    sex: draft.sex || null,
    breed: draft.breed.trim() || null,
    birthday: approximate ? null : draft.birthday || null,
    estimated_age_value: approximate && draft.estimatedAge !== "" ? Number(draft.estimatedAge) : null,
    estimated_age_unit: approximate && draft.estimatedAge !== "" ? draft.estimatedAgeUnit : null,
    adoption_date: draft.adoption || null,
    weight_lb: draft.weight === "" ? null : Number(draft.weight),
    image_url: draft.image || randomDefaultPetPhoto(draft.species),
    notes: draft.note?.trim() || null,
  };
}

function reminderPayload(draft) {
  const payload = {
    pet_id: Number(draft.petId),
    care_type: draft.type === "Custom" ? "other" : draft.type.toLowerCase(),
    custom_label: draft.type === "Custom" ? draft.customType.trim() : null,
    due_date: draft.due,
    repeat_rule: draft.repeat === "Custom interval" ? "custom" : repeatToApi[draft.repeat] || "none",
    notes: draft.note?.trim() || null,
  };
  if (draft.repeat === "Custom interval") {
    payload.repeat_interval = Number(draft.repeatInterval);
    payload.repeat_unit = draft.repeatUnit;
  }
  return payload;
}

function timeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Morning";
  }
  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "Evening";
  }
  return "Night";
}

function StatusPill({ status }) {
  return <span className={`status-pill ${status}`}>{status === "due-soon" ? "due soon" : status}</span>;
}

function carePresentation(type = "") {
  const normalized = type.toLowerCase();
  if (normalized.includes("vaccine") || normalized.includes("vaccination")) return { Icon: Syringe, label: "Vet", key: "vaccine" };
  if (normalized.includes("deworm")) return { Icon: Worm, label: "Preventive", key: "deworming" };
  if (normalized.includes("medication") || normalized.includes("medicine")) return { Icon: Pill, label: "Medication", key: "medication" };
  if (normalized.includes("weight")) return { Icon: Scale, label: "Health", key: "weight" };
  if (normalized.includes("checkup") || normalized.includes("appointment") || normalized.includes("vet")) return { Icon: Stethoscope, label: "Vet", key: "checkup" };
  if (normalized.includes("groom") || normalized.includes("brush") || normalized.includes("nail")) return { Icon: Scissors, label: "Grooming", key: "grooming" };
  if (normalized.includes("walk") || normalized.includes("activity") || normalized.includes("exercise") || normalized.includes("play")) return { Icon: Footprints, label: "Activity", key: "activity" };
  return { Icon: CalendarDays, label: "Care", key: "care" };
}

function ActiveReminderRow({ completing, onComplete, onDelete, onEdit, pet, record }) {
  const presentation = carePresentation(record.type);
  const RecordIcon = presentation.Icon;
  const dueOffset = daysUntil(record.due);
  const dueState = dueOffset < 0 ? "Overdue" : dueOffset <= 1 ? "Due" : "—";

  return (
    <article className={`care-ledger-row care-kind-${presentation.key}`} role="row">
      <span className="care-row-type-icon" aria-hidden="true"><RecordIcon /></span>
      <time className="care-ledger-date" dateTime={record.due}>{formatCareDate(record.due)}</time>
      <div className="care-ledger-type">
        <strong title={record.type}>{record.type}</strong>
        <span title={record.note || repeatSummary(record)}>{record.note || repeatSummary(record)}</span>
        {record.sourceType === "medical_record" && <em>Medical record</em>}
      </div>
      <span className="care-ledger-repeat">{repeatSummary(record)}</span>
      <span className={`care-ledger-status${dueOffset < 0 ? " overdue" : ""}`}>{dueState}</span>
      <div className="care-ledger-actions">
        <button className="care-ledger-done" disabled={completing} type="button" onClick={() => onComplete(record.id)}>
          {completing ? "Saving..." : "Done"}
        </button>
        <button aria-label={`Edit ${record.type} for ${pet.name}`} type="button" onClick={() => onEdit(record)}>Edit</button>
        <button aria-label={`Delete ${record.type} for ${pet.name}`} className="danger" type="button" onClick={() => onDelete(record.id)}>Delete <Trash2 aria-hidden="true" /></button>
      </div>
    </article>
  );
}

function AuthView({ notice, onAuthenticate }) {
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get("mode") === "signup" ? "signup" : "login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (notice) setMessage(notice);
  }, [notice]);

  function selectMode(nextMode) {
    setMode(nextMode);
    setMessage("");
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (mode === "signup" && !fullName.trim()) {
      setMessage("Enter your full name to create an account.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email address and password.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      await onAuthenticate({
        mode,
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setMessage(detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section
        aria-label="PawRise — Pet care made clear."
        className="auth-brand-panel"
        style={{ backgroundImage: `url(${authBrandPanel})` }}
      >
        <div className="sr-only">
          <h1>PawRise</h1>
          <p>Pet care made clear.</p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-shell">
          <a className="auth-home-link" href="/">
            <ArrowLeft aria-hidden="true" />
            Back to home
          </a>
          <span className="auth-mobile-brand"><img alt="" aria-hidden="true" src="/pawrise-mark-v2.png" />PawRise</span>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="auth-intro">
            {mode === "login" ? "Continue to your pet care journal." : "Start with your details. You can add your pets next."}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => selectMode("login")} role="tab" type="button">Log in</button>
            <button aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => selectMode("signup")} role="tab" type="button">Sign up</button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {mode === "signup" && (
              <label>
                <span>Full name</span>
                <input autoComplete="name" onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" type="text" value={fullName} />
              </label>
            )}
            <label>
              <span>Email address</span>
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} />
            </label>
            <label>
              <span>Password</span>
              <div className="auth-password-field">
                <input autoComplete={mode === "login" ? "current-password" : "new-password"} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} type={showPassword ? "text" : "password"} value={password} />
                <button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} type="button">
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </label>

            {mode === "login" && <button className="auth-forgot" onClick={() => setMessage("Password reset is ready for account integration.")} type="button">Forgot password?</button>}
            {message && <p className="auth-message" role="alert">{message}</p>}
            <button className="auth-primary" disabled={submitting} type="submit">
              {submitting ? "Connecting..." : mode === "login" ? "Continue" : "Create account"}
            </button>
          </form>

          <div className="auth-switch">
            <span>{mode === "login" ? "New to PawRise?" : "Already have an account?"}</span>
            <button onClick={() => selectMode(mode === "login" ? "signup" : "login")} type="button">
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PetOnboardingView({ petDraft, setPetDraft, onSave, onSkip, statusMessage }) {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPetPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setMessage("");
    try {
      const uploaded = await api.uploadImage(file);
      setPetDraft((current) => ({ ...current, image: uploaded.url, photoName: file.name }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <main className="pet-onboarding-page">
      <section className="pet-onboarding-card" aria-labelledby="pet-onboarding-title">
        <aside className="pet-onboarding-intro">
          <div className="pet-onboarding-brand"><img alt="" aria-hidden="true" src="/pawrise-mark-v2.png" /><span>PawRise</span></div>
          <div className="account-created-pill"><CheckCircle2 aria-hidden="true" />Account created</div>
          <h2>One more step</h2>
          <p>Add your first pet so we can personalize care tips, reminders, and support just for them.</p>

          <div className="onboarding-photo-wrap">
            <label className={petDraft.image ? "pet-photo-picker onboarding-photo has-image" : "pet-photo-picker onboarding-photo"}>
              <input accept="image/jpeg,image/png" disabled={photoUploading} type="file" onChange={uploadPetPhoto} />
              {petDraft.image ? (
                <img alt="Pet profile preview" src={petDraft.image} style={petPhotoStyle(petDraft.image)} />
              ) : (
                <><PawPrint aria-hidden="true" /><strong>{photoUploading ? "Uploading..." : "Add photo"}</strong></>
              )}
            </label>
            <small>{petDraft.photoName || "JPG or PNG, up to 5 MB"}</small>
          </div>
        </aside>

        <section className="pet-onboarding-form-panel">
          <div className="pet-onboarding-heading">
            <h1 id="pet-onboarding-title">Add your pet</h1>
            <button type="button" onClick={onSkip}>Skip for now</button>
          </div>

          <form className="onboarding-pet-form" onSubmit={onSave}>
            <label className="onboarding-name-field">
              <span>Name</span>
              <input autoFocus required value={petDraft.name} onChange={(event) => setPetDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Pet name" />
            </label>

            <fieldset className="onboarding-species-field">
              <legend>Species</legend>
              <div className="pet-choice-row two-options">
                <button className={petDraft.species === "Cat" ? "selected" : ""} type="button" onClick={() => setPetDraft((current) => ({ ...current, species: "Cat" }))}><Cat aria-hidden="true" />Cat</button>
                <button className={petDraft.species === "Dog" ? "selected" : ""} type="button" onClick={() => setPetDraft((current) => ({ ...current, species: "Dog" }))}><Dog aria-hidden="true" />Dog</button>
              </div>
            </fieldset>

            <label className="onboarding-breed-field">
              <span>Breed</span>
              <input value={petDraft.breed} onChange={(event) => setPetDraft((current) => ({ ...current, breed: event.target.value }))} placeholder={petDraft.species === "Dog" ? "Golden retriever" : "British shorthair"} />
            </label>

            <fieldset className="onboarding-sex-field">
              <legend>Sex</legend>
              <div className="pet-choice-row two-options">
                <button className={petDraft.sex === "male" ? "selected boy-option" : "boy-option"} type="button" onClick={() => setPetDraft((current) => ({ ...current, sex: "male" }))}><Mars aria-hidden="true" />Boy</button>
                <button className={petDraft.sex === "female" ? "selected girl-option" : "girl-option"} type="button" onClick={() => setPetDraft((current) => ({ ...current, sex: "female" }))}><Venus aria-hidden="true" />Girl</button>
              </div>
            </fieldset>

            <PetAgeField className="onboarding-age-field" petDraft={petDraft} setPetDraft={setPetDraft} />

            <label className="onboarding-home-field">
              <span>Day they came home</span>
              <EnglishDateInput ariaLabel="Day they came home, MM/DD/YYYY" max={todayIso()} value={petDraft.adoption} onChange={(adoption) => setPetDraft((current) => ({ ...current, adoption }))} />
            </label>

            <label className="onboarding-weight-field">
              <span>Weight</span>
              <span className="pet-weight-control"><input inputMode="decimal" min="0" step="0.1" type="number" value={petDraft.weight} onChange={(event) => setPetDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="0.0" /><strong>lb</strong></span>
            </label>

            <label className="onboarding-notes-field">
              <span>Notes</span>
              <textarea value={petDraft.note} onChange={(event) => setPetDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Personality, care notes, or routines" />
            </label>

            {(message || statusMessage) && <p className="onboarding-message" role="status">{message || statusMessage}</p>}
            <button className="primary-button onboarding-save" disabled={photoUploading} type="submit">{photoUploading ? "Uploading..." : "Save profile"}</button>
          </form>
        </section>
      </section>
    </main>
  );
}

function HomeView({
  pets,
  reminders,
  selectedPet,
  switchPet,
  completeReminder,
  openPage,
  userName,
}) {
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const visibleReminders = useMemo(
    () =>
      (selectedPet === "all" ? reminders : reminders.filter((reminder) => reminder.petId === selectedPet))
        .slice()
        .sort((first, second) => dateValue(first.due) - dateValue(second.due)),
    [reminders, selectedPet],
  );
  const overdueReminders = visibleReminders.filter((item) => daysUntil(item.due) < 0);
  const todayReminders = visibleReminders.filter((item) => daysUntil(item.due) === 0);
  const upcomingReminders = visibleReminders.filter((item) => daysUntil(item.due) > 0);
  const displayedUpcoming = showAllUpcoming ? upcomingReminders : upcomingReminders.slice(0, 3);
  const greeting = timeGreeting();

  function taskRow(item, tone) {
    const presentation = carePresentation(item.type);
    const PetImage = pets.find((pet) => pet.id === item.petId)?.image;
    const formattedDate = formatCareDate(item.due).replace(",", "").split(" ");
    const days = daysUntil(item.due);
    const statusLabel = tone === "today"
      ? "Due today"
      : tone === "overdue"
        ? `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`
        : days === 1
          ? "Due tomorrow"
          : `Due in ${days} days`;

    return (
      <article className={`dashboard-care-row ${tone} care-kind-${presentation.key}`} key={item.id}>
        <time className="dashboard-care-date" dateTime={item.due}>
          <span>{formattedDate[0]}</span>
          <strong>{formattedDate[1]}</strong>
          <small>{formattedDate[2]}</small>
        </time>
        <span className="dashboard-care-pet">
          {PetImage && <img alt="" src={PetImage} style={petPhotoStyle(PetImage)} />}
          <strong>{petName(pets, item.petId)}</strong>
        </span>
        <span className="dashboard-care-details">
          <strong>{item.type}</strong>
          <small>{item.note || repeatSummary(item)}</small>
          {item.sourceType === "medical_record" && <em>From Medical Record</em>}
        </span>
        <span className="dashboard-care-status">{statusLabel}</span>
        <button type="button" onClick={() => completeReminder(item.id)}>Mark done</button>
      </article>
    );
  }

  return (
    <>
      <header className="topbar dashboard-topbar">
        <div>
          <span className="eyebrow">PawRise home</span>
          <h1>Good {greeting}, {userName.split(" ")[0]}</h1>
          <p>See what needs care today, then jump into the right space when you need more detail.</p>
        </div>
        <div className="actions">
          <button className="primary-button" type="button" onClick={() => openPage("Care Planner")}>
            Add care reminder
          </button>
        </div>
      </header>

      <section className="pet-switcher dashboard-pet-filter" aria-label="Pet filter">
        <button className={selectedPet === "all" ? "selected" : ""} onClick={() => switchPet("all")} type="button">
          All pets
        </button>
        {pets.map((pet) => (
          <button
            className={selectedPet === pet.id ? "selected" : ""}
            key={pet.id}
            onClick={() => switchPet(pet.id)}
            type="button"
          >
            <img alt={`${pet.name} profile`} src={pet.image} style={petPhotoStyle(pet.image)} />
            <span>{pet.name}</span>
          </button>
        ))}
      </section>

      <section className="dashboard-care-board">
        <section className="dashboard-care-main">
          <header className="dashboard-care-heading">
            <div>
              <span className="eyebrow">Care focus</span>
              <h2>Today's care focus</h2>
            </div>
            <div className="dashboard-care-summary" aria-label="Care summary">
              <span className="today"><strong>{todayReminders.length}</strong> due today</span>
              <span className="upcoming"><strong>{upcomingReminders.length}</strong> upcoming</span>
              <span className="overdue"><strong>{overdueReminders.length}</strong> overdue</span>
            </div>
          </header>

          <div className="dashboard-care-stream">
            <section className="dashboard-care-section today" aria-labelledby="dashboard-due-today">
              <h3 id="dashboard-due-today">Due today <strong>{todayReminders.length}</strong></h3>
              <div className="dashboard-care-list">
                {todayReminders.map((item) => taskRow(item, "today"))}
                {todayReminders.length === 0 && <p className="dashboard-care-empty">Nothing else is due today.</p>}
              </div>
            </section>

            <section className="dashboard-care-section upcoming" aria-labelledby="dashboard-upcoming">
              <h3 id="dashboard-upcoming">Upcoming <strong>{upcomingReminders.length}</strong></h3>
              <div className="dashboard-care-list">
                {displayedUpcoming.map((item) => taskRow(item, "upcoming"))}
                {upcomingReminders.length === 0 && <p className="dashboard-care-empty">No upcoming care is scheduled.</p>}
              </div>
              {upcomingReminders.length > 3 && (
                <button
                  aria-expanded={showAllUpcoming}
                  className="dashboard-view-upcoming"
                  type="button"
                  onClick={() => setShowAllUpcoming((current) => !current)}
                >
                  {showAllUpcoming ? "Show fewer upcoming" : `View all upcoming (${upcomingReminders.length})`}
                  <ChevronRight aria-hidden="true" />
                </button>
              )}
            </section>
          </div>
        </section>

        <aside className="dashboard-overdue-panel" aria-labelledby="dashboard-overdue">
          <h2 id="dashboard-overdue">Overdue <strong>{overdueReminders.length}</strong></h2>
          <div className="dashboard-overdue-list">
            {overdueReminders.map((item) => taskRow(item, "overdue"))}
            {overdueReminders.length === 0 && (
              <div className="dashboard-overdue-empty">
                <CheckCircle2 aria-hidden="true" />
                <strong>No overdue care</strong>
                <span>Everything is currently on track.</span>
              </div>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}

function MyPetsView({
  pets,
  healthRecords,
  selectedPetId,
  formMode,
  petDraft,
  openPetDetail,
  startAddPet,
  startEditPet,
  cancelPetForm,
  savePet,
  deletePet,
  setPetDraft,
  setToast,
  openPage,
}) {
  const formPanelRef = useRef(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!formMode || !formPanelRef.current) return;
    formPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [formMode]);

  async function uploadPetPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const uploaded = await api.uploadImage(file);
      setPetDraft((current) => ({ ...current, image: uploaded.url, photoName: file.name }));
      setToast(`${file.name} uploaded. Save the profile to keep this photo.`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">Pet profiles</span>
          <h1>My Pets</h1>
          <p>Keep each pet's profile, care links, and everyday details in one warm place.</p>
        </div>
        <div className="actions">
          <button className="secondary-button" type="button" onClick={() => openPage("Home")}>
            Back home
          </button>
          <button className="primary-button" type="button" onClick={startAddPet}>
            Add pet
          </button>
        </div>
      </header>

      <section className="pets-layout">
        {pets.length > 0 ? (
          <section className="pet-detail-grid" aria-label="Pet profile detail cards">
            {pets.map((pet) => {
              const selectedRecords = healthRecords.filter((record) => record.petId === pet.id);

              return (
                <article className={pet.id === selectedPetId ? "pet-detail-panel selected" : "pet-detail-panel"} key={pet.id}>
                  <button className="detail-photo" onClick={() => openPetDetail(pet.id)} type="button">
                    <img alt={`${pet.name} detail`} src={pet.image} style={petPhotoStyle(pet.image)} />
                  </button>
                  <div className="detail-heading">
                    <div>
                      <span className="eyebrow">Pet profile</span>
                      <h2>{pet.name}</h2>
                      <p>{pet.breed} · {pet.age}</p>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => startEditPet(pet)}>
                      Edit
                    </button>
                  </div>

                  <dl className="detail-list">
                    <div>
                      <dt>{pet.ageIsEstimated ? "Approximate age" : "Birthday"}</dt>
                      <dd>{pet.ageIsEstimated ? pet.age : pet.birthday ? formatCareDate(pet.birthday) : "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Sex</dt>
                      <dd>{pet.sex === "male" ? "Boy" : pet.sex === "female" ? "Girl" : "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Adoption day</dt>
                      <dd>{pet.adoption ? formatCareDate(pet.adoption) : "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Weight</dt>
                      <dd>{pet.weight === "" ? "Not set" : `${pet.weight} lb`}</dd>
                    </div>
                    <div>
                      <dt>Notes</dt>
                      <dd>{pet.note}</dd>
                    </div>
                  </dl>

                  <div className="pet-module-links" aria-label={`${pet.name} module links`}>
                    <button type="button" onClick={() => openPage("Care Planner")}>
                      <strong>{selectedRecords.length}</strong>
                      <span>Care reminders</span>
                    </button>
                    <button type="button" onClick={() => openPage("Settings")}>
                      <strong>On</strong>
                      <span>Notification settings</span>
                    </button>
                  </div>

                  <button className="danger-button" type="button" onClick={() => deletePet(pet.id)}>
                    Delete profile
                  </button>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="empty-state">
            <span className="eyebrow">No pets yet</span>
            <h2>Add your first pet profile</h2>
            <p>Create a home base for care records and reminders.</p>
            <button className="primary-button" type="button" onClick={startAddPet}>
              Add first pet
            </button>
          </div>
        )}

        {formMode && (
          <section className="pet-form-panel" ref={formPanelRef} aria-label={formMode === "add" ? "Add pet form" : "Edit pet form"}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{formMode === "add" ? "New profile" : "Edit profile"}</span>
                <h2>{formMode === "add" ? "Add pet" : `Edit ${petDraft.name}`}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={cancelPetForm}>
                Cancel
              </button>
            </div>

            <form className="pet-form pet-profile-form" onSubmit={savePet}>
              <div className="pet-photo-field">
                <label className={petDraft.image ? "pet-photo-picker has-image" : "pet-photo-picker"}>
                  <input accept="image/jpeg,image/png,image/gif,image/webp" disabled={photoUploading} type="file" onChange={uploadPetPhoto} />
                  {petDraft.image ? (
                    <img alt="Pet profile preview" src={petDraft.image} style={petPhotoStyle(petDraft.image)} />
                  ) : (
                    <><PawPrint aria-hidden="true" /><strong>{photoUploading ? "Uploading..." : "Add photo"}</strong></>
                  )}
                </label>
                <small>{petDraft.photoName || "JPG or PNG, up to 5 MB"}</small>
              </div>

              <label className="pet-name-field">
                <span>Name</span>
                <input autoFocus={formMode === "add"} value={petDraft.name} onChange={(event) => setPetDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Pet name" />
              </label>

              <fieldset className="pet-choice-field species-field">
                <legend>Species</legend>
                <div className="pet-choice-row two-options">
                  <button className={petDraft.species === "Cat" ? "selected" : ""} type="button" onClick={() => setPetDraft((current) => ({ ...current, species: "Cat" }))}><Cat aria-hidden="true" />Cat</button>
                  <button className={petDraft.species === "Dog" ? "selected" : ""} type="button" onClick={() => setPetDraft((current) => ({ ...current, species: "Dog" }))}><Dog aria-hidden="true" />Dog</button>
                </div>
              </fieldset>

              <label className="pet-breed-field">
                <span>Breed</span>
                <input value={petDraft.breed} onChange={(event) => setPetDraft((current) => ({ ...current, breed: event.target.value }))} placeholder={petDraft.species === "Dog" ? "Golden retriever" : "British shorthair"} />
              </label>

              <fieldset className="pet-choice-field sex-field">
                <legend>Sex</legend>
                <div className="pet-choice-row two-options">
                  <button className={petDraft.sex === "male" ? "selected boy-option" : "boy-option"} type="button" onClick={() => setPetDraft((current) => ({ ...current, sex: "male" }))}><Mars aria-hidden="true" />Boy</button>
                  <button className={petDraft.sex === "female" ? "selected girl-option" : "girl-option"} type="button" onClick={() => setPetDraft((current) => ({ ...current, sex: "female" }))}><Venus aria-hidden="true" />Girl</button>
                </div>
              </fieldset>

              <PetAgeField className="pet-date-card" petDraft={petDraft} setPetDraft={setPetDraft} />

              <label className="pet-home-date-field">
                <span>Day they came home</span>
                <EnglishDateInput ariaLabel="Day they came home, MM/DD/YYYY" max={todayIso()} value={petDraft.adoption} onChange={(adoption) => setPetDraft((current) => ({ ...current, adoption }))} />
              </label>

              <label className="pet-weight-field">
                <span>Weight</span>
                <span className="pet-weight-control"><input inputMode="decimal" min="0" step="0.1" type="number" value={petDraft.weight} onChange={(event) => setPetDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="8.4" /><strong>lb</strong></span>
              </label>

              <label className="pet-notes-field">
                <span>Notes</span>
                <textarea value={petDraft.note} onChange={(event) => setPetDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Personality, care notes, or routines" />
              </label>

              <button className="primary-button pet-save-profile" disabled={photoUploading} type="submit">{photoUploading ? "Uploading..." : "Save profile"}</button>
            </form>
          </section>
        )}
      </section>
    </>
  );
}

function HealthCareView({
  pets,
  records,
  filterType,
  sortOrder,
  formMode,
  healthDraft,
  careHistory,
  completeReminder,
  setFilterType,
  setSortOrder,
  setHealthDraft,
  startAddHealth,
  startEditHealth,
  cancelHealthForm,
  saveHealthRecord,
  deleteHealthRecord,
}) {
  const careComposerRef = useRef(null);
  const [petFilter, setPetFilter] = useState("All");
  const [careView, setCareView] = useState("active");
  const [historyMonthFilter, setHistoryMonthFilter] = useState("All");
  const [historySortOrder, setHistorySortOrder] = useState("Newest");
  const [completingReminderId, setCompletingReminderId] = useState(null);
  const recordTypes = ["All", "Vaccine", "Deworming", "Checkup", "Medication", "Weight", "Activity", "Grooming", "Custom"];
  const CareTypeIcon = carePresentation(healthDraft.type).Icon;
  const filteredRecords = useMemo(() => records
    .filter((record) => (filterType === "All" || record.category === filterType) && (petFilter === "All" || record.petId === petFilter))
    .slice()
    .sort((a, b) => {
      const first = dateValue(a.due);
      const second = dateValue(b.due);
      const difference = sortOrder === "Soonest" ? first - second : second - first;
      return difference || Number(a.id) - Number(b.id);
    }), [filterType, petFilter, records, sortOrder]);
  const historyMonthOptions = useMemo(() => {
    const months = new Map();
    careHistory.forEach((record) => {
      const completedDate = new Date(record.completedAt);
      if (Number.isNaN(completedDate.getTime())) return;
      const key = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`;
      if (!months.has(key)) {
        months.set(key, {
          key,
          label: completedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          timestamp: completedDate.getTime(),
        });
      }
    });
    return Array.from(months.values()).sort((first, second) => second.timestamp - first.timestamp);
  }, [careHistory]);
  const filteredHistory = useMemo(() => careHistory
    .filter((record) => {
      if (filterType !== "All" && record.category !== filterType) return false;
      if (petFilter !== "All" && record.petId !== petFilter) return false;
      if (historyMonthFilter === "All") return true;
      const completedDate = new Date(record.completedAt);
      if (Number.isNaN(completedDate.getTime())) return false;
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`;
      return monthKey === historyMonthFilter;
    })
    .slice()
    .sort((first, second) => {
      const firstDate = new Date(first.completedAt).getTime() || 0;
      const secondDate = new Date(second.completedAt).getTime() || 0;
      return historySortOrder === "Newest" ? secondDate - firstDate : firstDate - secondDate;
    }), [careHistory, filterType, historyMonthFilter, historySortOrder, petFilter]);
  const activePetGroups = useMemo(() => pets
    .map((pet) => {
      const petRecords = filteredRecords.filter((record) => record.petId === pet.id);
      return {
        pet,
        records: petRecords,
        overdue: petRecords.filter((record) => daysUntil(record.due) < 0),
        comingUp: petRecords.filter((record) => {
          const days = daysUntil(record.due);
          return days >= 0 && days <= 14;
        }),
        later: petRecords.filter((record) => daysUntil(record.due) > 14),
      };
    })
    .filter((group) => group.records.length > 0)
    .sort((first, second) => {
      const firstDue = dateValue(first.records[0].due);
      const secondDue = dateValue(second.records[0].due);
      const difference = sortOrder === "Soonest" ? firstDue - secondDue : secondDue - firstDue;
      return difference || first.pet.name.localeCompare(second.pet.name);
    }), [filteredRecords, pets, sortOrder]);
  const completedPetGroups = useMemo(() => pets
    .map((pet) => {
      const petRecords = filteredHistory.filter((record) => record.petId === pet.id);
      const monthMap = new Map();
      petRecords.forEach((record) => {
        const completedDate = new Date(record.completedAt);
        const validDate = !Number.isNaN(completedDate.getTime());
        const key = validDate
          ? `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, "0")}`
          : "unknown";
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            key,
            label: validDate
              ? completedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : "Completion date unavailable",
            records: [],
          });
        }
        monthMap.get(key).records.push(record);
      });
      const months = Array.from(monthMap.values()).map((month) => {
        const categoryMap = new Map();
        month.records.forEach((record) => {
          if (!categoryMap.has(record.type)) categoryMap.set(record.type, []);
          categoryMap.get(record.type).push(record);
        });
        return {
          ...month,
          categories: Array.from(categoryMap.entries()).map(([type, categoryRecords]) => ({ type, records: categoryRecords })),
        };
      });
      return { pet, records: petRecords, months };
    })
    .filter((group) => group.records.length > 0), [filteredHistory, pets]);

  function completedDateLabel(record) {
    const completedDate = new Date(record.completedAt);
    return Number.isNaN(completedDate.getTime())
      ? record.completedOn || "Date unavailable"
      : completedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  async function handleCompleteReminder(id) {
    if (completingReminderId) return;
    setCompletingReminderId(id);
    try {
      await completeReminder(id);
    } finally {
      setCompletingReminderId(null);
    }
  }

  function handleEditReminder(record) {
    startEditHealth(record);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        careComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        careComposerRef.current?.querySelector("select")?.focus({ preventScroll: true });
      });
    });
  }

  function resetCareFilters() {
    setPetFilter("All");
    setFilterType("All");
    setSortOrder("Soonest");
  }

  return (
    <>
      <header className="topbar health-topbar">
        <div>
          <span className="eyebrow">Health tracker</span>
          <h1>Care Planner</h1>
          <p>Plan vaccines, checkups, medication, and everyday care before they are due.</p>
        </div>
      </header>

      <section className="care-reminder-workspace">
        <section
          className={`care-composer${formMode === "edit" ? " is-editing" : ""}`}
          ref={careComposerRef}
          aria-label={formMode === "edit" ? "Edit care reminder" : "Add care reminder"}
        >
          <div className="composer-heading">
            <div>
              <h2><CalendarDays aria-hidden="true" />{formMode === "edit" ? `Edit ${healthDraft.type} reminder` : "Add care reminder"}</h2>
            </div>
            {formMode === "edit" && <span className="editing-badge">Editing reminder</span>}
          </div>

          <form className="care-reminder-form" onSubmit={saveHealthRecord}>
            <label className="care-field feature-field care-field-pet">
              <span className="care-field-icon" aria-hidden="true"><PawPrint /></span>
              <span>Pet</span>
              <select value={healthDraft.petId} onChange={(event) => setHealthDraft((current) => ({ ...current, petId: event.target.value }))}>
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </label>
            <label className={`care-field feature-field care-field-type care-kind-${carePresentation(healthDraft.type).key}`}>
              <span className={`care-field-icon care-kind-${carePresentation(healthDraft.type).key}`} aria-hidden="true"><CareTypeIcon /></span>
              <span>Care type</span>
              <select value={healthDraft.type} onChange={(event) => setHealthDraft((current) => ({ ...current, type: event.target.value }))}>
                {recordTypes.filter((type) => type !== "All").map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            {healthDraft.type === "Custom" && (
              <label className="care-custom-type">
                <span>Custom care type</span>
                <input autoFocus maxLength={100} value={healthDraft.customType} onChange={(event) => setHealthDraft((current) => ({ ...current, customType: event.target.value }))} placeholder="For example: Grooming or Nail trim" />
              </label>
            )}
            <label className="care-field feature-field care-field-date">
              <span className="care-field-icon" aria-hidden="true"><CalendarDays /></span>
              <span>Due date</span>
              <EnglishDateInput ariaLabel="Due date, MM/DD/YYYY" min={todayIso()} value={healthDraft.due} onChange={(due) => setHealthDraft((current) => ({ ...current, due }))} />
            </label>
            <label className="care-field feature-field care-field-repeat">
              <span className="care-field-icon" aria-hidden="true"><Repeat2 /></span>
              <span>Repeat</span>
              <select value={healthDraft.repeat} onChange={(event) => setHealthDraft((current) => ({ ...current, repeat: event.target.value }))}>
                <option>Does not repeat</option>
                <option>Every week</option>
                <option>Every 2 weeks</option>
                <option>Every month</option>
                <option>Every 2 months</option>
                <option>Every 3 months</option>
                <option>Every 6 months</option>
                <option>Every year</option>
                <option>Custom interval</option>
              </select>
            </label>
            {healthDraft.repeat === "Custom interval" && (
              <fieldset className="care-custom-repeat">
                <legend>Custom schedule</legend>
                <span>Repeat every</span>
                <input
                  aria-label="Custom repeat interval"
                  inputMode="numeric"
                  max="999"
                  min="1"
                  step="1"
                  type="number"
                  value={healthDraft.repeatInterval}
                  onChange={(event) => setHealthDraft((current) => ({ ...current, repeatInterval: event.target.value }))}
                />
                <select
                  aria-label="Custom repeat unit"
                  value={healthDraft.repeatUnit}
                  onChange={(event) => setHealthDraft((current) => ({ ...current, repeatUnit: event.target.value }))}
                >
                  <option value="day">Day(s)</option>
                  <option value="week">Week(s)</option>
                  <option value="month">Month(s)</option>
                  <option value="year">Year(s)</option>
                </select>
                <small>PawRise will create the next reminder after you mark this one done.</small>
              </fieldset>
            )}
            <label className="care-notes">
              <span>Notes</span>
              <textarea value={healthDraft.note} onChange={(event) => setHealthDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Add notes (optional)..." maxLength={500} />
              <small>{healthDraft.note.length}/500</small>
            </label>
            <div className="composer-actions">
              {formMode === "edit" && <button className="secondary-button" type="button" onClick={cancelHealthForm}>Cancel</button>}
              <button className="primary-button save-reminder-button" type="submit">Save reminder</button>
            </div>
          </form>
        </section>

        <section className="care-reminders-panel">
          <div className="care-list-heading">
            <div className="care-records-heading">
              <div className="care-view-tabs" role="tablist" aria-label="Care record view">
                <button aria-selected={careView === "active"} className={careView === "active" ? "active" : ""} role="tab" type="button" onClick={() => setCareView("active")}>Active reminders <strong>{records.length}</strong></button>
                <button aria-selected={careView === "completed"} className={careView === "completed" ? "active" : ""} role="tab" type="button" onClick={() => setCareView("completed")}>Completed <strong>{careHistory.length}</strong></button>
              </div>
            </div>
            <div className={`care-filters care-filters-${careView}`}>
              <label><span>Pet</span><select aria-label="Filter by pet" value={petFilter} onChange={(event) => setPetFilter(event.target.value)}>
                  <option>All</option>
                  {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
                </select></label>
              <label><span>Care type</span><select aria-label="Filter by care type" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                  {recordTypes.map((type) => <option key={type}>{type}</option>)}
                </select></label>
              {careView === "completed" && <label><span>Completed month</span><select aria-label="Filter by completion month" value={historyMonthFilter} onChange={(event) => setHistoryMonthFilter(event.target.value)}>
                  <option value="All">All months</option>
                  {historyMonthOptions.map((month) => <option key={month.key} value={month.key}>{month.label}</option>)}
                </select></label>}
              <label><span>Sort</span>{careView === "active" ? (
                <select aria-label="Sort by due date" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                  <option>Soonest</option>
                  <option>Latest</option>
                </select>
              ) : (
                <select aria-label="Sort by completion date" value={historySortOrder} onChange={(event) => setHistorySortOrder(event.target.value)}>
                  <option>Newest</option>
                  <option>Oldest</option>
                </select>
              )}</label>
            </div>
          </div>

          {careView === "completed" ? (
            <div className="care-history-archive" role="tabpanel" aria-label="Completed care archive">
              {completedPetGroups.map(({ pet, records: petRecords, months }) => (
                <section className="care-history-pet" key={`history-pet-${pet.id}`}>
                  <header className="care-history-pet-header">
                    <img alt={`${pet.name} profile`} src={pet.image} style={petPhotoStyle(pet.image)} />
                    <div><span>Pet care archive</span><h3>{pet.name}</h3><p>{pet.breed} · {pet.species}</p></div>
                    <strong>{petRecords.length} completed</strong>
                  </header>
                  <div className="care-history-months">
                    {months.map((month) => (
                      <section className="care-history-month" key={`${pet.id}-${month.key}`}>
                        <div className="care-history-month-heading"><h4>{month.label}</h4><span>{month.records.length} {month.records.length === 1 ? "record" : "records"}</span></div>
                        <div className="care-history-categories">
                          {month.categories.map((category) => {
                            const presentation = carePresentation(category.type);
                            const CategoryIcon = presentation.Icon;
                            return (
                              <details className={`care-history-category care-kind-${presentation.key}`} key={`${pet.id}-${month.key}-${category.type}`} open={category.records.length <= 4}>
                                <summary><span className="care-history-type-icon" aria-hidden="true"><CategoryIcon /></span><span><strong>{category.type}</strong><small>Completed care</small></span><b>{category.records.length} {category.records.length === 1 ? "record" : "records"}</b><ChevronRight aria-hidden="true" /></summary>
                                <div className="care-history-records">
                                  {category.records.map((record) => (
                                    <article className="care-history-record" key={`history-${record.completedId}`}>
                                      <span className="care-history-record-marker" aria-hidden="true"><CheckCircle2 /></span>
                                      <div className="care-history-record-copy">
                                        <div><strong>{record.type}</strong>{record.sourceType === "medical_record" && <span className="record-source-badge">Medical record</span>}</div>
                                        <p>{record.note || "No notes were added for this care item."}</p>
                                        <small><span>Planned for {formatCareDate(record.due)}</span><span>{repeatSummary(record)}</span></small>
                                      </div>
                                      <div className="care-history-completed-date"><span>Completed</span><strong>{completedDateLabel(record)}</strong></div>
                                    </article>
                                  ))}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              ))}
              {!completedPetGroups.length && <div className="care-archive-empty"><CheckCircle2 aria-hidden="true" /><h3>No completed care found</h3><p>Try another pet, care type, or month. Finished reminders will be filed here automatically.</p></div>}
            </div>
          ) : (
            <div className="care-active-groups" role="tabpanel" aria-label="Active care reminders">
              {activePetGroups.map(({ pet, records: petRecords }) => (
                <section className="care-active-pet" key={`active-pet-${pet.id}`}>
                  <header className="care-active-pet-header">
                    <img alt={`${pet.name} profile`} src={pet.image} style={petPhotoStyle(pet.image)} />
                    <div><span>Active care plan</span><h3 title={pet.name}>{pet.name}</h3><p>{[pet.breed, pet.species].filter((value, index, values) => value && values.indexOf(value) === index).join(" · ")}</p></div>
                    <span className="care-active-count" aria-label={`${petRecords.length} active reminders`}>{petRecords.length} active</span>
                  </header>

                  <div className="care-active-pet-body">
                    <div className="care-ledger-head" role="row">
                      <span aria-hidden="true" />
                      <span>Due date</span>
                      <span>Care type</span>
                      <span>Details / repeat</span>
                      <span>Urgent</span>
                      <span>Actions</span>
                    </div>
                    <div className="care-ledger-rows" role="rowgroup">
                      {petRecords.map((record) => <ActiveReminderRow completing={completingReminderId === record.id} key={record.id} onComplete={handleCompleteReminder} onDelete={deleteHealthRecord} onEdit={handleEditReminder} pet={pet} record={record} />)}
                    </div>
                  </div>
                </section>
              ))}
              {!activePetGroups.length && <div className="care-archive-empty"><CalendarDays aria-hidden="true" /><h3>No active reminders found</h3><p>{pets.length ? "Try another pet or care type, or reset the filters." : "Add a pet first, then create their first care reminder."}</p>{pets.length > 0 && <button className="secondary-button" type="button" onClick={resetCareFilters}>Reset filters</button>}</div>}
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function MedicalRecordsView({ pets, records, refreshData, setToast }) {
  const [draft, setDraft] = useState(emptyMedicalRecordDraft);
  const [documentFile, setDocumentFile] = useState(null);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      petId: pets.some((pet) => pet.id === current.petId) ? current.petId : pets[0]?.id ?? "",
    }));
  }, [pets]);

  async function uploadRecord(event) {
    event.preventDefault();
    if (!draft.petId || !draft.title.trim() || (!documentFile && !draft.sourceText.trim())) {
      setToast("Choose a pet, add a title, and upload a document or paste the veterinary instructions.");
      return;
    }
    const formData = new FormData();
    formData.append("pet_id", draft.petId);
    formData.append("title", draft.title.trim());
    formData.append("visit_date", draft.visitDate);
    if (documentFile) formData.append("document", documentFile);
    if (draft.sourceText.trim()) formData.append("source_text", draft.sourceText.trim());

    setSubmitting(true);
    try {
      const record = await api.medicalRecords.create(formData);
      setPendingRecord(record);
      setReviewData(record.extracted_data);
      await refreshData();
      const usedVision = record.extracted_data?.extractor?.startsWith("openai-vision:");
      setToast(usedVision
        ? "Image read by AI. Review every extracted item before creating reminders."
        : "Extraction draft ready. Review every item before creating reminders.");
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openDraft(recordId) {
    try {
      const record = await api.medicalRecords.get(recordId);
      setPendingRecord(record);
      setReviewData(record.extracted_data);
      setToast("Medical record extraction opened for review.");
    } catch (error) {
      setToast(error.message);
    }
  }

  function updateMedication(index, field, value) {
    setReviewData((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  async function confirmExtraction() {
    if (!pendingRecord || !reviewData) return;
    setSubmitting(true);
    try {
      const result = await api.medicalRecords.confirm(pendingRecord.id, reviewData);
      await refreshData();
      setPendingRecord(null);
      setReviewData(null);
      setDocumentFile(null);
      setDraft({ ...emptyMedicalRecordDraft, petId: pets[0]?.id ?? "" });
      setFileInputKey((current) => current + 1);
      setToast(`${result.created_reminders.length} reminders created in the existing Care Reminder system.`);
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRecord(record) {
    if (!window.confirm(`Delete “${record.title}”? The original medical record will be removed.`)) return;
    const deleteIncomplete = record.incomplete_reminder_count > 0
      ? window.confirm(`This record has ${record.incomplete_reminder_count} incomplete reminders. Delete those reminders too?`)
      : false;
    try {
      await api.medicalRecords.remove(record.id, deleteIncomplete);
      if (pendingRecord?.id === record.id) {
        setPendingRecord(null);
        setReviewData(null);
      }
      await refreshData();
      setToast(deleteIncomplete ? "Medical record and its incomplete reminders deleted." : "Medical record deleted. Existing reminder history was preserved.");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function openOriginalDocument(record) {
    try {
      const blob = await api.medicalRecords.document(record.id);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      setToast("Original medical record opened in a new tab.");
    } catch (error) {
      setToast(error.message);
    }
  }

  const extractedCount = reviewData
    ? (reviewData.medications?.length ?? 0) + (reviewData.follow_up ? 1 : 0)
    : 0;

  return (
    <>
      <header className="topbar medical-records-topbar">
        <div>
          <span className="eyebrow">AI-assisted veterinary documents</span>
          <h1>Smart Records</h1>
          <p>Turn confirmed medication and follow-up details into the same reminders already used across PawRise.</p>
        </div>
      </header>

      <section className="medical-records-layout">
        <section className="medical-upload-panel">
          <div className="medical-section-heading">
            <span className="medical-icon"><Upload aria-hidden="true" /></span>
            <div><h2>Add medical record</h2><p>Nothing becomes a reminder until you review and confirm it.</p></div>
          </div>
          <form className="medical-upload-form" onSubmit={uploadRecord}>
            <label>
              Pet
              <select value={draft.petId} onChange={(event) => setDraft((current) => ({ ...current, petId: event.target.value }))}>
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </label>
            <label>
              Record title
              <input value={draft.title} maxLength={150} placeholder="Spay surgery discharge" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label>
              Visit date
              <EnglishDateInput ariaLabel="Visit date, MM/DD/YYYY" max={todayIso()} value={draft.visitDate} onChange={(visitDate) => setDraft((current) => ({ ...current, visitDate }))} />
            </label>
            <label className="medical-file-field">
              Veterinary document
              <input className="medical-file-input" key={fileInputKey} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
              <span className="medical-file-control">
                <span className="medical-file-button">Choose file</span>
                <span className={documentFile ? "medical-file-name has-file" : "medical-file-name"}>{documentFile?.name || "No file selected"}</span>
              </span>
              <small>PDF and TXT are read from text. JPG, PNG, and WebP records are read with AI vision.</small>
            </label>
            <label className="medical-source-field">
              Veterinary instructions
              <textarea value={draft.sourceText} onChange={(event) => setDraft((current) => ({ ...current, sourceText: event.target.value }))} placeholder="Give Carprofen 25 mg once daily with food for 3 days. Follow-up appointment on August 19, 2026." />
              <small>Optional backup text for any document. Images can now be submitted without transcription.</small>
            </label>
            <button className="primary-button medical-extract-button" disabled={submitting || !pets.length} type="submit">
              <Sparkles aria-hidden="true" />{submitting ? "Extracting..." : "Extract for review"}
            </button>
          </form>
        </section>

        <section className="medical-review-panel">
          <div className="medical-section-heading">
            <span className="medical-icon"><Sparkles aria-hidden="true" /></span>
            <div><h2>Review extraction</h2><p>Compare the draft with the original instructions and correct any errors.</p></div>
          </div>
          {pendingRecord && reviewData ? (
            <div className="extraction-review">
              <div className="review-summary">
                <div><span className="eyebrow">Draft only</span><h3>{pendingRecord.title}</h3><p>{pendingRecord.pet_name} · {extractedCount} extracted items</p></div>
                <span className="draft-status">Needs confirmation</span>
              </div>

              <div className="review-group">
                <h3>Medication</h3>
                {(reviewData.medications ?? []).length ? reviewData.medications.map((item, index) => (
                  <article className={!item.include ? "review-item excluded" : "review-item"} key={`medication-${index}`}>
                    <label className="include-control"><input type="checkbox" checked={item.include} onChange={(event) => updateMedication(index, "include", event.target.checked)} />Include</label>
                    <div className="review-fields medication-fields">
                      <label>Name<input value={item.name} onChange={(event) => updateMedication(index, "name", event.target.value)} /></label>
                      <label className={!item.dose.trim() ? "missing-review-value" : ""}>Dose (required)<input value={item.dose} placeholder="Enter the veterinarian's dose" onChange={(event) => updateMedication(index, "dose", event.target.value)} />{!item.dose.trim() && <small>Not found in the source. Check the original document and enter it here.</small>}</label>
                      <label>Frequency<input value={item.frequency} onChange={(event) => updateMedication(index, "frequency", event.target.value)} /></label>
                      <label>Start date<EnglishDateInput ariaLabel="Medication start date, MM/DD/YYYY" min={todayIso()} value={item.start_date} onChange={(startDate) => updateMedication(index, "start_date", startDate)} /></label>
                      <label className={item.duration_days ? "" : "missing-review-value"}>Days (required)<input min="1" max="60" type="number" value={item.duration_days ?? ""} placeholder="Enter days" onChange={(event) => updateMedication(index, "duration_days", event.target.value === "" ? "" : Number(event.target.value))} />{!item.duration_days && <small>Not found in the source. Enter the prescribed duration.</small>}</label>
                      <label className="wide-field">Instructions<input value={item.instructions} onChange={(event) => updateMedication(index, "instructions", event.target.value)} /></label>
                    </div>
                    <p className="source-quote"><strong>Source:</strong> {item.source_text}</p>
                  </article>
                )) : <p className="empty-care-copy">No medication was detected. Paste clearer instructions or add reminders manually.</p>}
              </div>

              {reviewData.follow_up && (
                <div className="review-group">
                  <h3>Follow-up</h3>
                  <article className={!reviewData.follow_up.include ? "review-item excluded" : "review-item"}>
                    <label className="include-control"><input type="checkbox" checked={reviewData.follow_up.include} onChange={(event) => setReviewData((current) => ({ ...current, follow_up: { ...current.follow_up, include: event.target.checked } }))} />Include</label>
                    <div className="review-fields">
                      <label>Date<EnglishDateInput ariaLabel="Follow-up date, MM/DD/YYYY" min={todayIso()} value={reviewData.follow_up.date} onChange={(date) => setReviewData((current) => ({ ...current, follow_up: { ...current.follow_up, date } }))} /></label>
                      <label>Clinic<input value={reviewData.follow_up.clinic} placeholder="Optional" onChange={(event) => setReviewData((current) => ({ ...current, follow_up: { ...current.follow_up, clinic: event.target.value } }))} /></label>
                    </div>
                    <p className="source-quote"><strong>Source:</strong> {reviewData.follow_up.source_text}</p>
                  </article>
                </div>
              )}

              <div className="review-safety-note"><ShieldCheck aria-hidden="true" /><p>PawRise organizes the veterinarian’s words. It does not diagnose, calculate a dose, or add treatment advice.</p></div>
              <button className="primary-button confirm-extraction-button" disabled={submitting} type="button" onClick={confirmExtraction}>{submitting ? "Creating reminders..." : "Confirm and create reminders"}</button>
            </div>
          ) : (
            <div className="medical-review-empty"><FileText aria-hidden="true" /><h3>No draft open</h3><p>Upload a record or reopen an unconfirmed draft from the list below.</p></div>
          )}
        </section>
      </section>

      <section className="medical-record-list-panel">
        <div className="medical-section-heading">
          <span className="medical-icon"><FileText aria-hidden="true" /></span>
          <div><h2>Saved medical records</h2><p>Medical records are the source; linked reminders continue through the existing care workflow.</p></div>
        </div>
        <div className="medical-record-list">
          {records.map((record) => (
            <article className="medical-record-row" key={record.id}>
              <div className="medical-record-mark"><FileText aria-hidden="true" /></div>
              <div className="medical-record-copy"><span className="eyebrow">{record.pet_name}</span><h3>{record.title}</h3><p>{record.visit_date ? formatCareDate(record.visit_date) : "Visit date not set"} · {record.original_filename || "Pasted instructions"}</p></div>
              <div className="medical-record-stats"><strong>{record.generated_reminder_count}</strong><span>linked reminders</span></div>
              <span className={`record-status ${record.status}`}>{record.status === "confirmed" ? "Confirmed" : "Needs review"}</span>
              <div className="medical-record-actions">
                {record.document_url && <button className="secondary-button" type="button" onClick={() => openOriginalDocument(record)}>View original</button>}
                {record.status === "draft" && <button className="secondary-button" type="button" onClick={() => openDraft(record.id)}>Review</button>}
                <button className="icon-text-button danger" type="button" onClick={() => deleteRecord(record)}><Trash2 aria-hidden="true" />Delete</button>
              </div>
            </article>
          ))}
          {!records.length && <div className="medical-review-empty"><FileText aria-hidden="true" /><h3>No medical records yet</h3><p>Add the first veterinary document above.</p></div>}
        </div>
      </section>
    </>
  );
}

function SettingsView({ onLogout, onUserUpdate, setToast, user }) {
  const [emailReminders, setEmailReminders] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [reminderTiming, setReminderTiming] = useState(7);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: user.name, avatarUrl: user.avatarUrl || "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const profileInitials = (profileDraft.name || user.name || "P")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!editingProfile) {
      setProfileDraft({ name: user.name, avatarUrl: user.avatarUrl || "" });
    }
  }, [editingProfile, user.avatarUrl, user.name]);

  useEffect(() => {
    let active = true;
    api.settings.get()
      .then((settings) => {
        if (!active) return;
        setEmailReminders(settings.email_reminders);
        setOverdueAlerts(settings.show_overdue_alerts);
        setReminderTiming(settings.default_lead_days);
      })
      .catch((error) => setToast(error.message));
    return () => { active = false; };
  }, [setToast]);

  async function saveSettings() {
    setSaving(true);
    try {
      await api.settings.update({
        email_reminders: emailReminders,
        default_lead_days: Number(reminderTiming),
        show_overdue_alerts: overdueAlerts,
      });
      setToast("Notification settings saved to PawRise.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function exportPawRiseData() {
    setExporting(true);
    try {
      const [pets, reminders, careHistory, medicalRecords, memories, settings] = await Promise.all([
        api.pets.list(),
        api.reminders.list(),
        api.reminders.history(),
        api.medicalRecords.list(),
        api.memories.list(),
        api.settings.get(),
      ]);
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ format: "a4", unit: "pt" });
      const pageWidth = document.internal.pageSize.getWidth();
      const pageHeight = document.internal.pageSize.getHeight();
      const margin = 48;
      const contentWidth = pageWidth - (margin * 2);
      let cursorY = 54;

      const text = (value, fallback = "Not set") => {
        if (value === null || value === undefined || value === "") return fallback;
        return String(value);
      };
      const petNames = new Map(pets.map((pet) => [String(pet.id), pet.name]));
      const petName = (petId) => petNames.get(String(petId)) || "Unknown pet";
      const careLabel = (item) => item.care_type === "other"
        ? text(item.custom_label, "Custom care")
        : text(item.care_type, "Care task").replaceAll("_", " ");

      function ensureSpace(height = 30) {
        if (cursorY + height <= pageHeight - 54) return;
        document.addPage();
        cursorY = 54;
      }

      function addSection(title) {
        ensureSpace(48);
        cursorY += 10;
        document.setFillColor(235, 242, 231);
        document.roundedRect(margin, cursorY, contentWidth, 28, 7, 7, "F");
        document.setFont("helvetica", "bold");
        document.setFontSize(13);
        document.setTextColor(75, 99, 72);
        document.text(title, margin + 12, cursorY + 19);
        cursorY += 40;
      }

      function addRecord(title, detail) {
        document.setFont("helvetica", "normal");
        document.setFontSize(10);
        const detailLines = document.splitTextToSize(detail, contentWidth - 16);
        const recordHeight = 25 + (detailLines.length * 13);
        ensureSpace(recordHeight);
        document.setFont("helvetica", "bold");
        document.setTextColor(55, 48, 43);
        document.text(text(title, "Untitled"), margin + 8, cursorY + 11);
        document.setFont("helvetica", "normal");
        document.setTextColor(105, 96, 87);
        document.text(detailLines, margin + 8, cursorY + 27);
        cursorY += recordHeight;
      }

      document.setFillColor(224, 105, 83);
      document.roundedRect(margin, cursorY, 42, 42, 11, 11, "F");
      document.setFont("helvetica", "bold");
      document.setFontSize(22);
      document.setTextColor(255, 255, 255);
      document.text("P", margin + 14, cursorY + 29);
      document.setTextColor(55, 48, 43);
      document.setFontSize(24);
      document.text("PawRise Data Report", margin + 56, cursorY + 19);
      document.setFont("helvetica", "normal");
      document.setFontSize(10);
      document.setTextColor(105, 96, 87);
      document.text(`Prepared ${new Date().toLocaleString("en-US")}`, margin + 56, cursorY + 36);
      cursorY += 68;

      addSection("Account overview");
      addRecord(user.name, `${user.email}  |  ${pets.length} pets  |  ${reminders.length} active reminders  |  ${careHistory.length} completed care items`);
      addRecord("Notification preferences", `Email reminders: ${settings.email_reminders ? "On" : "Off"}  |  Overdue alerts: ${settings.show_overdue_alerts ? "On" : "Off"}  |  Default notice: ${settings.default_lead_days} days before`);

      addSection(`Pet profiles (${pets.length})`);
      if (!pets.length) addRecord("No pet profiles", "No pets have been added to this PawRise account.");
      pets.forEach((pet) => addRecord(
        pet.name,
        `${text(pet.species)}  |  ${text(pet.breed)}  |  ${text(pet.sex)}  |  Birthday: ${text(pet.birthday)}  |  Adoption date: ${text(pet.adoption_date)}  |  Weight: ${pet.weight_lb ? `${pet.weight_lb} lb` : "Not set"}${pet.notes ? `  |  Notes: ${pet.notes}` : ""}`,
      ));

      addSection(`Active care reminders (${reminders.length})`);
      if (!reminders.length) addRecord("No active reminders", "There are no upcoming care tasks in this account.");
      reminders.forEach((item) => addRecord(
        `${careLabel(item)} — ${petName(item.pet_id)}`,
        `Due: ${text(item.due_date)}  |  Repeat: ${text(item.repeat_rule, "none")}  |  Status: ${text(item.status)}${item.notes ? `  |  Notes: ${item.notes}` : ""}`,
      ));

      addSection(`Care history (${careHistory.length})`);
      if (!careHistory.length) addRecord("No completed care", "Completed care tasks will appear here.");
      careHistory.forEach((item) => addRecord(
        `${careLabel(item)} — ${petName(item.pet_id)}`,
        `Completed: ${text(item.completed_at)}${item.notes ? `  |  Notes: ${item.notes}` : ""}`,
      ));

      addSection(`Medical records (${medicalRecords.length})`);
      if (!medicalRecords.length) addRecord("No medical records", "No veterinary records have been saved.");
      medicalRecords.forEach((record) => addRecord(
        text(record.title, "Medical record"),
        `${petName(record.pet_id)}  |  Visit date: ${text(record.visit_date)}  |  Status: ${text(record.status)}  |  Linked reminders: ${record.generated_reminder_count ?? 0}`,
      ));

      addSection(`Memories (${memories.length})`);
      if (!memories.length) addRecord("No memories", "No memories have been saved.");
      memories.forEach((memory) => addRecord(
        text(memory.title, "Memory"),
        `${petName(memory.pet_id)}  |  Date: ${text(memory.memory_date)}${memory.description ? `  |  ${memory.description}` : ""}`,
      ));

      const pageCount = document.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        document.setPage(page);
        document.setDrawColor(225, 215, 202);
        document.line(margin, pageHeight - 38, pageWidth - margin, pageHeight - 38);
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        document.setTextColor(130, 120, 110);
        document.text("PawRise — Pet care made clear.", margin, pageHeight - 23);
        document.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 23, { align: "right" });
      }

      document.save(`pawrise-data-${new Date().toISOString().slice(0, 10)}.pdf`);
      setToast("Your PawRise PDF report is ready.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setExporting(false);
    }
  }

  function startProfileEdit() {
    setProfileDraft({ name: user.name, avatarUrl: user.avatarUrl || "" });
    setEditingProfile(true);
  }

  function cancelProfileEdit() {
    setProfileDraft({ name: user.name, avatarUrl: user.avatarUrl || "" });
    setEditingProfile(false);
  }

  async function uploadProfileAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast("Please choose an image smaller than 5 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const uploaded = await api.uploadImage(file);
      setProfileDraft((current) => ({ ...current, avatarUrl: uploaded.url }));
      setToast("Your new photo is ready. Save the profile to keep it.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const fullName = profileDraft.name.trim();
    if (!fullName) {
      setToast("Please enter your display name.");
      return;
    }

    setProfileSaving(true);
    try {
      const savedUser = await api.updateMe({
        full_name: fullName,
        avatar_url: profileDraft.avatarUrl || null,
      });
      onUserUpdate(normalizeUser(savedUser));
      setEditingProfile(false);
      setToast("Your profile has been updated.");
    } catch (error) {
      setToast(error.message);
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <>
      <header className="topbar settings-topbar">
        <div>
          <span className="eyebrow">Account & preferences</span>
          <h1>Settings</h1>
          <p>Manage your account, care notifications, and PawRise preferences.</p>
        </div>
      </header>

      <section className="settings-layout">
        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-icon"><UserRound aria-hidden="true" /></span>
            <div><h2>Account</h2><p>Your PawRise profile and sign-in details.</p></div>
          </div>
          {!editingProfile ? (
            <div className="account-row">
              <div className="account-avatar">
                {user.avatarUrl ? <img alt={`${user.name}'s profile`} src={user.avatarUrl} /> : profileInitials}
              </div>
              <div className="account-copy"><strong>{user.name}</strong><span>{user.email}</span></div>
              <button className="secondary-button settings-button-with-icon" type="button" onClick={startProfileEdit}>
                <Pencil aria-hidden="true" />Edit profile
              </button>
            </div>
          ) : (
            <form className="account-profile-form" onSubmit={saveProfile}>
              <div className="account-avatar-editor">
                <button
                  aria-label="Choose a new profile photo"
                  className="account-avatar-preview"
                  disabled={avatarUploading || profileSaving}
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {profileDraft.avatarUrl ? <img alt="Profile preview" src={profileDraft.avatarUrl} /> : <strong>{profileInitials}</strong>}
                  <span><Upload aria-hidden="true" /></span>
                </button>
                <input
                  ref={avatarInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="account-avatar-input"
                  disabled={avatarUploading || profileSaving}
                  type="file"
                  onChange={uploadProfileAvatar}
                />
                <div className="account-avatar-actions">
                  <button className="secondary-button" disabled={avatarUploading || profileSaving} type="button" onClick={() => avatarInputRef.current?.click()}>
                    {avatarUploading ? "Uploading..." : "Choose photo"}
                  </button>
                  {profileDraft.avatarUrl && (
                    <button className="icon-text-button danger" disabled={avatarUploading || profileSaving} type="button" onClick={() => setProfileDraft((current) => ({ ...current, avatarUrl: "" }))}>
                      <Trash2 aria-hidden="true" />Remove
                    </button>
                  )}
                  <small>JPG, PNG, GIF, or WebP · up to 5 MB</small>
                </div>
              </div>

              <div className="account-profile-fields">
                <label className="account-profile-field">
                  <span>Display name</span>
                  <input
                    required
                    maxLength={100}
                    type="text"
                    value={profileDraft.name}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="account-profile-field account-email-field">
                  <span>Email address</span>
                  <input readOnly type="email" value={user.email} />
                  <small>Your email is used to sign in and cannot be changed here.</small>
                </label>
              </div>

              <div className="account-profile-actions">
                <button className="secondary-button" disabled={profileSaving || avatarUploading} type="button" onClick={cancelProfileEdit}>Cancel</button>
                <button className="primary-button" disabled={profileSaving || avatarUploading} type="submit">
                  {profileSaving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-icon"><Bell aria-hidden="true" /></span>
            <div><h2>Care notifications</h2><p>Choose how PawRise helps you stay ahead of care dates.</p></div>
          </div>
          <div className="settings-list">
            <label className="settings-toggle-row">
              <span><strong>Email reminders</strong><small>Receive an email before an upcoming care task is due.</small></span>
              <input aria-label="Email reminders" checked={emailReminders} disabled={saving} type="checkbox" onChange={(event) => setEmailReminders(event.target.checked)} />
            </label>
            <label className="settings-control-row">
              <span><strong>Remind me</strong><small>Set the default notice before a care task is due.</small></span>
              <select value={reminderTiming} onChange={(event) => setReminderTiming(Number(event.target.value))}>
                <option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>1 week before</option><option value={14}>2 weeks before</option>
              </select>
            </label>
            <label className="settings-toggle-row">
              <span><strong>Overdue alerts</strong><small>Highlight overdue care tasks across your dashboard.</small></span>
              <input aria-label="Overdue alerts" checked={overdueAlerts} disabled={saving} type="checkbox" onChange={(event) => setOverdueAlerts(event.target.checked)} />
            </label>
          </div>
          <button className="primary-button" disabled={saving} type="button" onClick={saveSettings}>
            {saving ? "Saving..." : "Save notification settings"}
          </button>
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-icon"><ShieldCheck aria-hidden="true" /></span>
            <div><h2>Data & privacy</h2><p>Keep a copy of your pet-care information.</p></div>
          </div>
          <div className="settings-action-row">
            <span><strong>Export PawRise data</strong><small>Download a readable PDF report with your profiles, care history, records, memories, and preferences.</small></span>
            <button className="secondary-button settings-button-with-icon" disabled={exporting} type="button" onClick={exportPawRiseData}>
              <Download aria-hidden="true" />{exporting ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </section>

        <section className="settings-section logout-section">
          <div className="settings-section-heading">
            <span className="settings-icon logout-icon"><LogOut aria-hidden="true" /></span>
            <div><h2>Log out</h2><p>Sign out of PawRise on this device.</p></div>
          </div>
          <button className="logout-button" type="button" onClick={onLogout}><LogOut aria-hidden="true" />Log out</button>
        </section>
      </section>
    </>
  );
}

function PlaceholderPage({ page, openPage }) {
  return (
    <section className="placeholder-page">
      <span className="eyebrow">{page}</span>
      <h1>{page}</h1>
      <p>This module is ready to build next. My Pets is now the complete profile foundation.</p>
      <button className="secondary-button" type="button" onClick={() => openPage("My Pets")}>
        Back to My Pets
      </button>
    </section>
  );
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(hasAccessToken());
  const [showPetOnboarding, setShowPetOnboarding] = useState(false);
  const [user, setUser] = useState({ name: "", email: "", avatarUrl: "", role: "user" });
  const [activePage, setActivePage] = useState("Home");
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("all");
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [careHistory, setCareHistory] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [formMode, setFormMode] = useState(null);
  const [petDraft, setPetDraft] = useState(emptyPetDraft);
  const [editingPetId, setEditingPetId] = useState(null);
  const [healthFormMode, setHealthFormMode] = useState("add");
  const [healthDraft, setHealthDraft] = useState(emptyHealthDraft);
  const [editingHealthId, setEditingHealthId] = useState(null);
  const [healthFilterType, setHealthFilterType] = useState("All");
  const [healthSortOrder, setHealthSortOrder] = useState("Soonest");
  const [toast, setToast] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    function handleExpiredSession(event) {
      resetAuthenticatedState(event.detail?.message || "Your session has expired. Please log in again.");
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function loadAllData() {
    const [petData, reminderData, historyData, medicalRecordData] = await Promise.all([
      api.pets.list(),
      api.reminders.list(),
      api.reminders.history(),
      api.medicalRecords.list(),
    ]);
    const nextPets = petData.map(normalizePet);
    const defaultPetId = nextPets[0]?.id ?? "";
    setPets(nextPets);
    setReminders(reminderData.map(normalizeReminder));
    setCareHistory(historyData.map(normalizeReminder));
    setMedicalRecords(medicalRecordData);
    setSelectedPetId((current) => nextPets.some((pet) => pet.id === current) ? current : defaultPetId || null);
    setSelectedPet((current) => current === "all" || nextPets.some((pet) => pet.id === current) ? current : "all");
    setHealthDraft((current) => ({ ...current, petId: nextPets.some((pet) => pet.id === current.petId) ? current.petId : defaultPetId }));
  }

  useEffect(() => {
    if (!hasAccessToken()) {
      setIsRestoring(false);
      return;
    }
    let active = true;
    Promise.all([api.me(), loadAllData()])
      .then(([currentUser]) => {
        if (!active) return;
        setUser(normalizeUser(currentUser));
        setIsAuthenticated(true);
      })
      .catch(() => {
        clearAccessToken();
        if (active) setIsAuthenticated(false);
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });
    return () => { active = false; };
  }, []);

  function openPage(page) {
    setActivePage(page);
    setToast(["My Pets", "Care Planner", "Medical Records", "Community", "Settings"].includes(page) ? `${page} opened.` : `${page} module is ready to build next.`);
  }

  async function authenticate(credentials) {
    const result = credentials.mode === "signup"
      ? await api.register({ full_name: credentials.fullName, email: credentials.email, password: credentials.password })
      : await api.login({ email: credentials.email, password: credentials.password });
    setAccessToken(result.access_token);
    setAuthNotice("");
    setUser(normalizeUser(result.user));
    await loadAllData();
    setIsAuthenticated(true);
    setPetDraft({ ...emptyPetDraft, image: "" });
    setShowPetOnboarding(credentials.mode === "signup");
    setActivePage("Home");
    setToast(credentials.mode === "signup" ? "Account created." : "Welcome to PawRise.");
  }

  function resetAuthenticatedState(notice = "") {
    clearAccessToken();
    setIsAuthenticated(false);
    setUser({ name: "", email: "", avatarUrl: "", role: "user" });
    setPets([]);
    setReminders([]);
    setCareHistory([]);
    setMedicalRecords([]);
    setShowPetOnboarding(false);
    setActivePage("Home");
    setToast("");
    setAuthNotice(notice);
    const loginUrl = new URL(window.location.href);
    loginUrl.searchParams.set("mode", "login");
    window.history.replaceState(null, "", loginUrl);
  }

  function logout() {
    resetAuthenticatedState();
  }

  function openPetDetail(id) {
    setSelectedPetId(id);
    setActivePage("My Pets");
    setFormMode(null);
    setToast(`${petName(pets, id)} profile opened.`);
  }

  async function completeReminder(id) {
    const completed = reminders.find((item) => item.id === id);
    if (!completed) return;
    try {
      await api.reminders.complete(id);
      await loadAllData();
      setToast(completed.repeat === "Does not repeat" ? "Reminder completed and moved to care history." : `Completed. The next ${completed.type.toLowerCase()} reminder was scheduled by PawRise.`);
    } catch (error) {
      setToast(error.message);
    }
  }

  function switchPet(id) {
    setSelectedPet(id);
    if (id !== "all") {
      setSelectedPetId(id);
    }
    setToast(id === "all" ? "Showing the whole household." : `Showing ${petName(pets, id)}.`);
  }

  function startAddPet() {
    setFormMode("add");
    setEditingPetId(null);
    setPetDraft({ ...emptyPetDraft, image: "" });
    setToast("Add pet form opened.");
  }

  function startEditPet(pet) {
    setFormMode("edit");
    setEditingPetId(pet.id);
    setPetDraft({ ...pet });
    setToast(`Editing ${pet.name}.`);
  }

  function cancelPetForm() {
    setFormMode(null);
    setEditingPetId(null);
    setPetDraft(emptyPetDraft);
    setToast("Profile edit cancelled.");
  }

  async function savePet(event) {
    event.preventDefault();
    if (!petDraft.name.trim() || !petDraft.species.trim()) {
      setToast("Name and species are required.");
      return;
    }
    try {
      const saved = formMode === "edit"
        ? await api.pets.update(editingPetId, petPayload(petDraft))
        : await api.pets.create(petPayload(petDraft));
      await loadAllData();
      setSelectedPetId(String(saved.id));
      setToast(`${petDraft.name} profile ${formMode === "edit" ? "updated" : "saved"} in the database.`);
      setFormMode(null);
      setEditingPetId(null);
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    }
  }

  async function saveOnboardingPet(event) {
    event.preventDefault();
    if (!petDraft.name.trim() || !petDraft.species.trim()) {
      setToast("Name and species are required.");
      return;
    }
    try {
      const saved = await api.pets.create(petPayload(petDraft));
      await loadAllData();
      setSelectedPetId(String(saved.id));
      setSelectedPet(String(saved.id));
      setPetDraft(emptyPetDraft);
      setShowPetOnboarding(false);
      setActivePage("Home");
      setToast(`${saved.name} is ready in PawRise.`);
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    }
  }

  async function deletePet(id) {
    const target = petName(pets, id);
    if (!window.confirm(`Delete ${target}'s profile? This cannot be undone in this prototype.`)) {
      return;
    }
    try {
      await api.pets.remove(id);
      await loadAllData();
      setToast(`${target} profile and related records deleted from the database.`);
    } catch (error) {
      setToast(error.message);
    }
  }

  function startAddHealth() {
    setHealthFormMode("add");
    setEditingHealthId(null);
    setHealthDraft({ ...emptyHealthDraft, petId: selectedPet === "all" ? pets[0]?.id ?? "" : selectedPet });
    setToast("Care reminder form reset.");
  }

  function startEditHealth(record) {
    setHealthFormMode("edit");
    setEditingHealthId(record.id);
    setHealthDraft({ ...record, type: record.category, customType: record.customType || "" });
    setToast(`Editing ${record.type} reminder.`);
  }

  function cancelHealthForm() {
    setHealthFormMode("add");
    setEditingHealthId(null);
    setHealthDraft({ ...emptyHealthDraft, petId: pets[0]?.id ?? "" });
    setToast("Reminder edit cancelled.");
  }

  async function saveHealthRecord(event) {
    event.preventDefault();
    if (!healthDraft.petId || !healthDraft.type || !healthDraft.due) {
      setToast("Pet, care type, and due date are required.");
      return;
    }
    if (healthDraft.type === "Custom" && !healthDraft.customType.trim()) {
      setToast("Enter a name for the custom care type.");
      return;
    }
    if (healthDraft.repeat === "Custom interval") {
      const interval = Number(healthDraft.repeatInterval);
      if (!Number.isInteger(interval) || interval < 1 || interval > 999) {
        setToast("Enter a whole number from 1 to 999 for the repeat interval.");
        return;
      }
      if (!["day", "week", "month", "year"].includes(healthDraft.repeatUnit)) {
        setToast("Choose days, weeks, months, or years for the repeat interval.");
        return;
      }
    }
    if (dateValue(healthDraft.due) < dateValue(todayIso())) {
      setToast("Choose today or a future due date.");
      return;
    }

    try {
      if (healthFormMode === "edit") {
        await api.reminders.update(editingHealthId, reminderPayload(healthDraft));
      } else {
        await api.reminders.create(reminderPayload(healthDraft));
      }
      await loadAllData();
      setToast(`${healthDraft.type} reminder ${healthFormMode === "edit" ? "updated" : "saved"} in the database.`);
      setHealthFormMode("add");
      setEditingHealthId(null);
      setHealthDraft({ ...emptyHealthDraft, petId: pets[0]?.id ?? "" });
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    }
  }

  async function deleteHealthRecord(id) {
    const target = reminders.find((record) => record.id === id);
    if (!window.confirm(`Delete this ${target?.type ?? "care"} reminder?`)) {
      return;
    }
    try {
      await api.reminders.remove(id);
      await loadAllData();
      setToast("Care reminder deleted from the database.");
    } catch (error) {
      setToast(error.message);
    }
  }

  if (isRestoring) {
    return <main className="auth-page"><section className="auth-form-panel"><div className="auth-form-shell"><h1>Loading PawRise...</h1><p>Restoring your secure session.</p></div></section></main>;
  }

  if (!isAuthenticated) {
    return <AuthView notice={authNotice} onAuthenticate={authenticate} />;
  }

  if (showPetOnboarding) {
    return (
      <PetOnboardingView
        onSave={saveOnboardingPet}
        onSkip={() => {
          setShowPetOnboarding(false);
          setActivePage("Home");
          setToast("You can add a pet anytime from My Pets.");
        }}
        petDraft={petDraft}
        setPetDraft={setPetDraft}
        statusMessage={toast}
      />
    );
  }

  return (
    <main className="app-shell">
      <div className="pawrise-ambient" aria-hidden="true">
        <span className="pawrise-ambient-orb pawrise-ambient-coral" />
        <span className="pawrise-ambient-orb pawrise-ambient-sage" />
        <span className="pawrise-ambient-orb pawrise-ambient-rose" />
      </div>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><img alt="" src="/pawrise-mark-v2.png" /></div>
          <div>
            <p>PawRise</p>
            <span>Life care journal</span>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="nav-list">
          {primaryNavigation.map(({ page, label, Icon }) => {
            const isActive = page === activePage;
            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "active" : ""}
                key={page}
                onClick={() => openPage(page)}
                type="button"
              >
                <span className="nav-icon" aria-hidden="true"><Icon /></span>
                <span className="nav-label">{label}</span>
              </button>
            );
          })}
        </nav>

      </aside>

      <section className="workspace">
        {activePage === "Home" && (
          <HomeView
            completeReminder={completeReminder}
            openPage={openPage}
            pets={pets}
            reminders={reminders}
            selectedPet={selectedPet}
            switchPet={switchPet}
            userName={user.name}
          />
        )}
        {activePage === "My Pets" && (
          <MyPetsView
            cancelPetForm={cancelPetForm}
            deletePet={deletePet}
            formMode={formMode}
            openPage={openPage}
            openPetDetail={openPetDetail}
            petDraft={petDraft}
            pets={pets}
            healthRecords={reminders}
            savePet={savePet}
            selectedPetId={selectedPetId}
            setPetDraft={setPetDraft}
            setToast={setToast}
            startAddPet={startAddPet}
            startEditPet={startEditPet}
          />
        )}
        {activePage === "Care Planner" && (
          <HealthCareView
            cancelHealthForm={cancelHealthForm}
            careHistory={careHistory}
            completeReminder={completeReminder}
            deleteHealthRecord={deleteHealthRecord}
            filterType={healthFilterType}
            formMode={healthFormMode}
            healthDraft={healthDraft}
            openPage={openPage}
            pets={pets}
            records={reminders}
            saveHealthRecord={saveHealthRecord}
            setFilterType={setHealthFilterType}
            setHealthDraft={setHealthDraft}
            setSortOrder={setHealthSortOrder}
            sortOrder={healthSortOrder}
            startAddHealth={startAddHealth}
            startEditHealth={startEditHealth}
          />
        )}
        {activePage === "Medical Records" && (
          <MedicalRecordsView
            pets={pets}
            records={medicalRecords}
            refreshData={loadAllData}
            setToast={setToast}
          />
        )}
        {activePage === "Community" && (
          <CommunityView
            openPage={openPage}
            pets={pets}
            refreshData={loadAllData}
            setToast={setToast}
            user={user}
          />
        )}
        {activePage === "Settings" && <SettingsView onLogout={logout} onUserUpdate={setUser} setToast={setToast} user={user} />}
        {!["Home", "My Pets", "Care Planner", "Medical Records", "Community", "Settings"].includes(activePage) && <PlaceholderPage openPage={openPage} page={activePage} />}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}
