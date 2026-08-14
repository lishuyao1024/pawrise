import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, CalendarDays, Cat, CheckCircle2, ChevronRight, Clock3, Dog, Download, Eye, EyeOff, FileText, Footprints, HeartPulse, LogOut, Mars, PawPrint, Pencil, Pill, Plus, Repeat2, Scale, Scissors, ShieldCheck, Sparkles, Stethoscope, Syringe, Trash2, Upload, UserRound, Venus, Worm, X } from "lucide-react";
import authBrandPanel from "./assets/auth-brand-panel.png";
import damiMemory from "./assets/dami-memory.png";
import damiProfile from "./assets/dami-profile.png";
import roroMemory from "./assets/roro-memory.png";
import roroProfile from "./assets/roro-profile.png";
import { api, AUTH_SESSION_EXPIRED_EVENT, clearAccessToken, hasAccessToken, setAccessToken } from "./api.js";

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

const primaryNavigation = [
  { page: "Home", label: "Dashboard", Icon: HeartPulse },
  { page: "Care Planner", label: "Care Planner", Icon: CalendarDays },
  { page: "Medical Records", label: "Medical Records", Icon: FileText },
  { page: "Memories", label: "Memories", Icon: Sparkles },
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

const initialMemories = [
  {
    id: 1,
    petId: "dami",
    title: "Window sunshine nap",
    date: "Jul 08, 2026",
    scene: "Quiet afternoon at home",
    description: "Dami found the warmest patch of light and stayed there until dinner.",
    image: damiMemory,
  },
  {
    id: 2,
    petId: "roro",
    title: "First shelf victory",
    date: "Jun 21, 2026",
    scene: "Living room adventure",
    description: "Roro climbed the new shelf for the first time and looked very proud of the discovery.",
    image: roroMemory,
  },
  {
    id: 3,
    petId: "dami",
    title: "Adoption day treat",
    date: "Jun 12, 2026",
    scene: "Small celebration",
    description: "A soft treat, a clean blanket, and extra brushing for Dami's adoption day.",
    image: damiProfile,
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

const emptyMemoryDraft = {
  petId: "",
  title: "",
  date: todayIso(),
  image: damiMemory,
  photoName: "",
};

const defaultMemoryTitles = [
  "A Happy Moment",
  "A Day to Remember",
  "A Little Adventure",
  "A Special Day Together",
  "Sweet Memories",
  "A Cozy Moment",
  "Another Beautiful Day",
  "Growing Up Together",
];

function randomMemoryTitle() {
  return defaultMemoryTitles[Math.floor(Math.random() * defaultMemoryTitles.length)];
}

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
          <input aria-label="Birthday" max={todayIso()} type="date" value={petDraft.birthday} onChange={(event) => setPetDraft((current) => ({ ...current, birthday: event.target.value }))} />
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

function normalizeMemory(memory) {
  return {
    id: String(memory.id),
    petId: String(memory.pet_id),
    title: memory.title,
    date: memory.memory_date,
    scene: memory.scene || memory.category?.replaceAll("_", " ") || "Everyday moment",
    description: memory.description || "A small memory worth keeping.",
    image: memory.image_url || (memory.pet_id % 2 === 0 ? roroMemory : damiMemory),
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

function ActiveReminderCard({ completing, onComplete, onDelete, onEdit, pet, record, urgency }) {
  const presentation = carePresentation(record.type);
  const RecordIcon = presentation.Icon;

  return (
    <article className={`care-reminder-card care-urgency-${urgency} care-kind-${presentation.key}`} role="listitem">
      <span className="care-row-type-icon" aria-hidden="true"><RecordIcon /></span>
      <div className="care-reminder-card-copy">
        <div className="care-reminder-title-row">
          <strong title={record.type}>{record.type}</strong>
          {record.sourceType === "medical_record" && <span className="record-source-badge">Medical record</span>}
        </div>
        <div className="care-reminder-due">
          <strong>{careDueCountdown(record.due)}</strong>
          <time dateTime={record.due}>{formatCareDate(record.due)}</time>
        </div>
        <div className="care-reminder-meta"><Repeat2 aria-hidden="true" /><span>{repeatSummary(record)}</span></div>
        {record.note && <p className="care-reminder-note" title={record.note}>{record.note}</p>}
      </div>
      <div className="care-reminder-card-actions">
        <button className="mark-done-button" disabled={completing} type="button" onClick={() => onComplete(record.id)}>
          <CheckCircle2 aria-hidden="true" />{completing ? "Saving..." : "Mark done"}
        </button>
        <button aria-label={`Edit ${record.type} for ${pet.name}`} className="icon-text-button" type="button" onClick={() => onEdit(record)}><Pencil aria-hidden="true" />Edit</button>
        <button aria-label={`Delete ${record.type} for ${pet.name}`} className="icon-text-button danger" type="button" onClick={() => onDelete(record.id)}><Trash2 aria-hidden="true" />Delete</button>
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
        aria-label="PawRise — Care today. Memories for life."
        className="auth-brand-panel"
        style={{ backgroundImage: `url(${authBrandPanel})` }}
      >
        <div className="sr-only">
          <h1>PawRise</h1>
          <p>Care today. Memories for life.</p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-shell">
          <a className="auth-home-link" href="/">
            <ArrowLeft aria-hidden="true" />
            Back to home
          </a>
          <span className="auth-mobile-brand">PawRise</span>
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
          <div className="pet-onboarding-brand"><PawPrint aria-hidden="true" /><span>PawRise</span></div>
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
              <input max={todayIso()} type="date" value={petDraft.adoption} onChange={(event) => setPetDraft((current) => ({ ...current, adoption: event.target.value }))} />
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
  careHistory,
  medicalRecords,
  selectedPet,
  switchPet,
  completeReminder,
  openPetDetail,
  openPage,
  startAddPet,
  userName,
}) {
  const isAllPets = selectedPet === "all";
  const activePetId = !isAllPets && pets.some((pet) => pet.id === selectedPet)
    ? selectedPet
    : null;
  const activePet = pets.find((pet) => pet.id === activePetId) ?? null;
  const sortedReminders = useMemo(
    () => reminders.slice().sort((a, b) => dateValue(a.due) - dateValue(b.due)),
    [reminders],
  );
  const scopedReminders = useMemo(
    () => isAllPets ? sortedReminders : sortedReminders.filter((reminder) => reminder.petId === activePetId),
    [activePetId, isAllPets, sortedReminders],
  );
  const upcomingReminders = useMemo(
    () => scopedReminders.filter((reminder) => isDueWithinNextSevenDays(reminder.due)),
    [scopedReminders],
  );
  const petReminders = useMemo(
    () => sortedReminders.filter((reminder) => reminder.petId === activePetId),
    [activePetId, sortedReminders],
  );
  const petHistory = useMemo(
    () => careHistory.filter((item) => item.petId === activePetId),
    [activePetId, careHistory],
  );
  const petMedicalRecords = useMemo(
    () => medicalRecords.filter((record) => String(record.pet_id) === activePetId),
    [activePetId, medicalRecords],
  );
  const reminderCounts = useMemo(
    () => reminders.reduce((counts, reminder) => {
      counts[reminder.petId] = (counts[reminder.petId] ?? 0) + 1;
      return counts;
    }, {}),
    [reminders],
  );
  const nextReminderByPet = useMemo(
    () => sortedReminders.reduce((nextByPet, reminder) => {
      if (!nextByPet[reminder.petId]) nextByPet[reminder.petId] = reminder;
      return nextByPet;
    }, {}),
    [sortedReminders],
  );
  const timelineItems = useMemo(
    () => petReminders
      .filter((item) => isDueWithinNextTwoWeeks(item.due))
      .map((item) => ({ ...item, timelineStatus: reminderStatus(item.due), completed: false }))
      .slice(0, 6),
    [petReminders],
  );
  const recentLogs = useMemo(() => {
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    return petHistory
      .filter((item) => {
        const completedTime = new Date(item.completedAt).getTime();
        return Number.isFinite(completedTime) && completedTime <= now && now - completedTime <= threeDays;
      })
      .slice()
      .sort((first, second) => new Date(second.completedAt) - new Date(first.completedAt))
      .slice(0, 5)
      .map((item) => ({
        id: `care-${item.completedId || item.id}`,
        completedAt: item.completedAt,
        title: item.type,
        detail: item.note || "Care item marked complete",
      }));
  }, [petHistory]);
  const householdFocusGroups = useMemo(() => ({
    overdue: sortedReminders.filter((item) => daysUntil(item.due) < 0),
    today: sortedReminders.filter((item) => daysUntil(item.due) === 0),
    next: sortedReminders.filter((item) => {
      const days = daysUntil(item.due);
      return days >= 1 && days <= 7;
    }),
  }), [sortedReminders]);
  const greeting = timeGreeting();
  const activeOverdueCount = petReminders.filter((item) => reminderStatus(item.due) === "overdue").length;
  const latestMedicalRecord = petMedicalRecords
    .slice()
    .sort((a, b) => new Date(b.visit_date || b.created_at || 0) - new Date(a.visit_date || a.created_at || 0))[0];
  const firstName = userName.trim().split(" ")[0] || "there";
  const taskCopy = reminders.length === 0
    ? "Your family has no active care tasks today."
    : `You have ${reminders.length} care ${reminders.length === 1 ? "task" : "tasks"} remaining for your family.`;

  function relativeDueLabel(due) {
    const days = daysUntil(due);
    if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  }

  function openAddPet() {
    startAddPet();
    openPage("My Pets");
  }

  if (!pets.length) {
    return (
      <section className="home-empty-state">
        <PawPrint aria-hidden="true" />
        <span className="eyebrow">Your PawRise family</span>
        <h1>Welcome home, {firstName}.</h1>
        <p>Add your first pet to see care reminders, health details, and memories together.</p>
        <button className="primary-button" type="button" onClick={openAddPet}><Plus aria-hidden="true" /> Add your first pet</button>
      </section>
    );
  }

  return (
    <div className="home-dashboard-page">
      <header className="home-welcome-bar">
        <div>
          <span className="eyebrow">PawRise family dashboard</span>
          <h1>Good {greeting}, {firstName}.</h1>
          <p>{taskCopy}</p>
        </div>
        <div className="home-welcome-actions">
          <button className="secondary-button" type="button" onClick={() => openPage("Memories")}>Add memory</button>
          <button className="primary-button" type="button" onClick={() => openPage("Care Planner")}>Add reminder</button>
        </div>
      </header>

      <section className="home-dashboard-v2">
        <aside className="home-family-rail" aria-label="My family">
          <div className="home-section-label"><span>My family</span><strong>{pets.length}</strong></div>
          <div className="home-family-list">
            <button className={isAllPets ? "selected home-all-pets-option" : "home-all-pets-option"} type="button" onClick={() => switchPet("all")}>
              <span className="home-all-pets-icon"><PawPrint aria-hidden="true" /></span>
              <span className="home-family-copy">
                <strong>All pets</strong>
                <small>{pets.length} {pets.length === 1 ? "companion" : "companions"}</small>
                <em>{reminders.length ? `${reminders.length} active care ${reminders.length === 1 ? "task" : "tasks"}` : "All care is on track"}</em>
              </span>
              <b>{reminders.length}</b>
            </button>
            {pets.map((pet) => (
              <button className={pet.id === activePetId ? "selected" : ""} key={pet.id} type="button" onClick={() => switchPet(pet.id)}>
                <img alt={`${pet.name} profile`} src={pet.image} style={petPhotoStyle(pet.image)} />
                <span className="home-family-copy">
                  <strong>{pet.name}</strong>
                  <small>{pet.breed} · {pet.age}</small>
                  <em>{nextReminderByPet[pet.id] ? `Next: ${nextReminderByPet[pet.id].type} · ${relativeDueLabel(nextReminderByPet[pet.id].due)}` : "No care scheduled"}</em>
                </span>
                <b>{reminderCounts[pet.id] ?? 0}</b>
              </button>
            ))}
          </div>
          <button className="home-add-pet" type="button" onClick={openAddPet}><Plus aria-hidden="true" /> Add new pet</button>
        </aside>

        <main className="home-center-column">
          {!isAllPets && upcomingReminders.length > 0 && <section className="home-upcoming-section">
            <div className="home-section-label">
              <span>Upcoming care</span>
              <button type="button" onClick={() => openPage("Care Planner")}>View full planner <ChevronRight aria-hidden="true" /></button>
            </div>
            <div className="home-upcoming-cards">
              {upcomingReminders.map((item) => {
                const presentation = carePresentation(item.type);
                const CareIcon = presentation.Icon;
                return (
                  <button className={`home-upcoming-card ${reminderStatus(item.due)} care-kind-${presentation.key}`} key={item.id} type="button" onClick={() => openPage("Care Planner")}>
                    <span className="home-care-icon"><CareIcon aria-hidden="true" /></span>
                    <span className="home-care-meta">{presentation.label} · {relativeDueLabel(item.due)} · {formatCareDate(item.due)}</span>
                    <strong>{item.type}</strong>
                    <div className="home-upcoming-detail">
                      <span className="home-upcoming-summary">
                        <strong title={petName(pets, item.petId)}>{petName(pets, item.petId)}</strong>
                        <span>{repeatSummary(item)}</span>
                      </span>
                      {item.note && <small title={item.note}>{item.note}</small>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>}

          {isAllPets ? (
            <section className="home-household-focus" aria-labelledby="household-focus-heading">
              <header className="home-household-focus-header">
                <div>
                  <span className="eyebrow">Care focus</span>
                  <h2 id="household-focus-heading">Your family’s care</h2>
                  <p>A calm, prioritized view of what needs attention now and over the next seven days.</p>
                </div>
                <div className="home-household-stats" aria-label="Household care summary">
                  <span className={householdFocusGroups.overdue.length ? "attention" : ""}><strong>{householdFocusGroups.overdue.length}</strong> overdue</span>
                  <span><strong>{householdFocusGroups.today.length}</strong> today</span>
                  <span><strong>{householdFocusGroups.next.length}</strong> next 7 days</span>
                </div>
              </header>

              {householdFocusGroups.overdue.length === 0 && (
                <div className="home-household-clear-status"><CheckCircle2 aria-hidden="true" /><span><strong>Nothing overdue</strong>Your family’s care is on track.</span></div>
              )}

              <div className="home-household-timeline">
                {[
                  { key: "overdue", title: "Needs attention", description: "Past due" },
                  { key: "today", title: "Today", description: "Due before the day ends" },
                  { key: "next", title: "Next 7 days", description: "A one-week look ahead" },
                ].filter((group) => householdFocusGroups[group.key].length > 0).map((group) => (
                  <section className={`home-household-group ${group.key}`} key={group.key}>
                    <div className="home-household-group-heading">
                      <div><h3>{group.title}</h3><p>{group.description}</p></div>
                      <strong>{householdFocusGroups[group.key].length}</strong>
                    </div>
                    <div className="home-household-care-list">
                      {householdFocusGroups[group.key].map((item) => {
                        const presentation = carePresentation(item.type);
                        const CareIcon = presentation.Icon;
                        const pet = pets.find((candidate) => candidate.id === item.petId);
                        return (
                          <article className={`home-household-care-item care-kind-${presentation.key}`} key={`${group.key}-${item.id}`}>
                            <span className="home-household-care-icon"><CareIcon aria-hidden="true" /></span>
                            <div className="home-household-care-copy">
                              <strong className="home-household-care-title">{item.type}</strong>
                              <span className="home-household-pet"><img alt="" src={pet?.image} style={petPhotoStyle(pet?.image)} /><strong>{pet?.name || "Pet"}</strong></span>
                              <p>{repeatSummary(item)}{item.note ? ` · ${item.note}` : ""}</p>
                            </div>
                            <time className="home-household-care-date" dateTime={item.due}>
                              <strong>{formatCareDate(item.due)}</strong>
                              <span>{relativeDueLabel(item.due)}</span>
                            </time>
                            <button type="button" onClick={() => completeReminder(item.id)}>Mark done</button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {householdFocusGroups.overdue.length + householdFocusGroups.today.length + householdFocusGroups.next.length === 0 && (
                <div className="home-household-all-clear"><PawPrint aria-hidden="true" /><h3>No care is due in the next seven days.</h3><p>You can relax for now or open the full planner to look further ahead.</p><button type="button" onClick={() => openPage("Care Planner")}>Open full planner <ChevronRight aria-hidden="true" /></button></div>
              )}
            </section>
          ) : (
          <article className="home-pet-focus-card">
            <div className="home-pet-focus-intro">
              <div className="home-pet-identity">
                <div className="home-pet-title-row"><span className={activeOverdueCount ? "attention" : "healthy"}>{activeOverdueCount ? "Needs attention" : "On track"}</span></div>
                <small>{latestMedicalRecord ? `Last veterinary record ${formatCareDate(latestMedicalRecord.visit_date || latestMedicalRecord.created_at?.slice(0, 10) || todayIso())}` : "No veterinary record added yet"}</small>
                <div className="home-pet-actions">
                  <button className="home-sage-button" type="button" onClick={() => openPage("Care Planner")}>Open care planner</button>
                  <button className="home-text-button" type="button" onClick={() => openPetDetail(activePet.id)}>View profile <ChevronRight aria-hidden="true" /></button>
                </div>
              </div>
            </div>

            <section className="home-care-timeline">
              <div className="home-card-heading"><div><span className="eyebrow">Health & care timeline</span><h3>Next 14 days</h3></div><Clock3 aria-hidden="true" /></div>
              <div className="home-timeline-list">
                {timelineItems.map((item) => (
                  <article className={`home-timeline-item ${item.timelineStatus}`} key={`${item.completed ? "completed" : "active"}-${item.id}`}>
                    <span className="home-timeline-dot">{item.completed && <CheckCircle2 aria-hidden="true" />}</span>
                    <div>
                      <small>{item.completed ? `Completed ${formatCareDate(item.due)}` : `${relativeDueLabel(item.due)} · ${formatCareDate(item.due)}`}</small>
                      <h4>{item.type}</h4>
                      <p>{repeatSummary(item)}{item.note ? ` · ${item.note}` : ""}</p>
                    </div>
                    {!item.completed && <button type="button" onClick={() => completeReminder(item.id)}>Mark done</button>}
                  </article>
                ))}
                {timelineItems.length === 0 && <p className="home-inline-empty">No care is due for {activePet.name} in the next 14 days.</p>}
              </div>
            </section>

            {recentLogs.length > 0 && (
              <section className="home-recent-completed" aria-labelledby="recent-completed-heading">
                <div className="home-recent-completed-heading">
                  <div><span className="eyebrow">Completed care</span><h3 id="recent-completed-heading">Finished in the last 3 days</h3></div>
                  <CheckCircle2 aria-hidden="true" />
                </div>
                <div className="home-recent-completed-grid">
                  {recentLogs.map((item) => (
                    <button key={item.id} type="button" onClick={() => openPage("Care Planner")}>
                      <span className="home-recent-completed-icon"><CheckCircle2 aria-hidden="true" /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <time dateTime={item.completedAt}>{new Date(item.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </article>
          )}
        </main>

      </section>
    </div>
  );
}

function MyPetsView({
  pets,
  healthRecords,
  memoryCounts,
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
                    <button type="button" onClick={() => openPage("Memories")}>
                      <strong>{memoryCounts[pet.id] ?? 0}</strong>
                      <span>Memories</span>
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
            <p>Create a home base for care records, reminders, and memories.</p>
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
                <input max={todayIso()} type="date" value={petDraft.adoption} onChange={(event) => setPetDraft((current) => ({ ...current, adoption: event.target.value }))} />
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
              <h2>{formMode === "edit" ? `Edit ${healthDraft.type} reminder` : "Add care reminder"}</h2>
              <p>Plan the next care task for your pet.</p>
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
              <input min={todayIso()} type="date" value={healthDraft.due} onChange={(event) => setHealthDraft((current) => ({ ...current, due: event.target.value }))} />
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
              <button className="secondary-button" type="button" onClick={formMode === "edit" ? cancelHealthForm : startAddHealth}>Cancel</button>
              <button className="primary-button save-reminder-button" type="submit">Save reminder</button>
            </div>
          </form>
        </section>

        <section className="care-reminders-panel">
          <div className="care-list-heading">
            <div className="care-records-heading">
              <span className="eyebrow">Organized care records</span>
              <h2>{careView === "active" ? "Active reminders" : "Completed care archive"}</h2>
              <p>{careView === "active" ? "Upcoming work is separated by pet." : "Finished care is filed by pet and completion month."}</p>
              <div className="care-view-tabs" role="tablist" aria-label="Care record view">
                <button aria-selected={careView === "active"} className={careView === "active" ? "active" : ""} role="tab" type="button" onClick={() => setCareView("active")}>Active <strong>{records.length}</strong></button>
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
              {activePetGroups.map(({ pet, records: petRecords, overdue, comingUp, later }) => (
                <section className="care-active-pet" key={`active-pet-${pet.id}`}>
                  <header className="care-active-pet-header">
                    <img alt={`${pet.name} profile`} src={pet.image} style={petPhotoStyle(pet.image)} />
                    <div><span>Active care plan</span><h3 title={pet.name}>{pet.name}</h3><p>{[pet.breed, pet.species].filter((value, index, values) => value && values.indexOf(value) === index).join(" · ")}</p></div>
                    <div className="care-active-pet-stats" aria-label={`${petRecords.length} active reminders`}>
                      {overdue.length > 0 && <span className="attention">{overdue.length} overdue</span>}
                      {comingUp.length > 0 && <span className="soon">{comingUp.length} within 2 weeks</span>}
                      {later.length > 0 && <span>{later.length} later</span>}
                    </div>
                  </header>

                  <div className="care-active-pet-body">
                    {overdue.length > 0 && (
                      <section className="care-urgency-group overdue" aria-labelledby={`overdue-${pet.id}`}>
                        <div className="care-urgency-heading"><span><Bell aria-hidden="true" /></span><div><h4 id={`overdue-${pet.id}`}>Needs attention</h4><p>Past-due care to handle first.</p></div><strong>{overdue.length}</strong></div>
                        <div className="care-reminder-card-grid" role="list">
                          {overdue.map((record) => <ActiveReminderCard completing={completingReminderId === record.id} key={record.id} onComplete={handleCompleteReminder} onDelete={deleteHealthRecord} onEdit={handleEditReminder} pet={pet} record={record} urgency="overdue" />)}
                        </div>
                      </section>
                    )}

                    {comingUp.length > 0 && (
                      <section className="care-urgency-group coming-up" aria-labelledby={`coming-up-${pet.id}`}>
                        <div className="care-urgency-heading"><span><Clock3 aria-hidden="true" /></span><div><h4 id={`coming-up-${pet.id}`}>Coming up</h4><p>Due today or within the next 14 days.</p></div><strong>{comingUp.length}</strong></div>
                        <div className="care-reminder-card-grid" role="list">
                          {comingUp.map((record) => <ActiveReminderCard completing={completingReminderId === record.id} key={record.id} onComplete={handleCompleteReminder} onDelete={deleteHealthRecord} onEdit={handleEditReminder} pet={pet} record={record} urgency="coming-up" />)}
                        </div>
                      </section>
                    )}

                    {later.length > 0 && (
                      <details className="care-urgency-group later" open={later.length <= 2}>
                        <summary className="care-urgency-heading"><span><CalendarDays aria-hidden="true" /></span><div><h4>Scheduled later</h4><p>After the next 14 days · next {formatCareDate(later[sortOrder === "Soonest" ? 0 : later.length - 1].due)}</p></div><strong>{later.length}</strong><ChevronRight aria-hidden="true" /></summary>
                        <div className="care-reminder-card-grid" role="list">
                          {later.map((record) => <ActiveReminderCard completing={completingReminderId === record.id} key={record.id} onComplete={handleCompleteReminder} onDelete={deleteHealthRecord} onEdit={handleEditReminder} pet={pet} record={record} urgency="later" />)}
                        </div>
                      </details>
                    )}
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

function MemoryTimelineView({
  pets,
  memories,
  memoryDraft,
  formOpen,
  startAddMemory,
  startEditMemory,
  cancelMemoryForm,
  deleteMemory,
  editingMemoryId,
  saveMemory,
  setMemoryDraft,
  setToast,
}) {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [previewMemory, setPreviewMemory] = useState(null);

  useEffect(() => {
    if (!formOpen || memoryDraft.petId || pets.length === 0) return;
    setMemoryDraft((current) => (
      current.petId ? current : { ...current, petId: pets[0].id }
    ));
  }, [formOpen, memoryDraft.petId, pets, setMemoryDraft]);

  useEffect(() => {
    if (!previewMemory) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPreviewMemory(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewMemory]);

  async function uploadMemoryPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    try {
      const uploaded = await api.uploadImage(file);
      setMemoryDraft((current) => ({ ...current, image: uploaded.url, photoName: file.name }));
      setToast(`${file.name} uploaded. Save the memory to keep this photo.`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  const sortedMemories = memories
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const downloadFilename = previewMemory
    ? `${petName(pets, previewMemory.petId)}-${previewMemory.date}-${previewMemory.title}`
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || "pawrise-memory"
    : "pawrise-memory";
  const downloadExtension = previewMemory?.image
    ?.match(/\.(png|jpe?g|gif|webp)(?:[?#]|$)/i)?.[1]
    ?.toLowerCase()
    ?.replace("jpeg", "jpg") || "jpg";

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">Memory timeline</span>
          <h1>Memories</h1>
          <p>Save a date and photo, then add a title or let PawRise choose one for you.</p>
        </div>
        <div className="actions">
          <button className="primary-button" type="button" onClick={startAddMemory}>
            Add memory
          </button>
        </div>
      </header>

      <section className="memory-layout">
        {formOpen && (
          <section className="memory-form-panel" aria-label={editingMemoryId ? "Edit memory form" : "Add memory form"}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">{editingMemoryId ? "Edit memory" : "New memory"}</span>
                <h2>{editingMemoryId ? "Update this moment" : "Add a moment"}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={cancelMemoryForm}>
                Cancel
              </button>
            </div>

            <form className="memory-form" onSubmit={saveMemory}>
              <label>
                Pet
                <select
                  required
                  value={memoryDraft.petId}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, petId: event.target.value }))}
                >
                  <option disabled value="">Select a pet</option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  max={todayIso()}
                  type="date"
                  value={memoryDraft.date}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label>
                Title
                <input
                  value={memoryDraft.title}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Leave blank for a surprise title"
                />
              </label>
              <label className="wide-field">
                Photo from this device
                <input
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={photoUploading}
                  required={!memoryDraft.image}
                  type="file"
                  onChange={uploadMemoryPhoto}
                />
                <small>
                  {photoUploading
                    ? "Uploading photo..."
                    : memoryDraft.photoName
                      || (editingMemoryId ? "The current photo will be kept unless you choose another." : "Required. JPG, PNG, GIF, or WebP; maximum 5 MB.")}
                </small>
              </label>
              <button className="primary-button wide-field" disabled={photoUploading} type="submit">
                {photoUploading ? "Uploading..." : editingMemoryId ? "Update memory" : "Save memory"}
              </button>
            </form>
          </section>
        )}

        <div className="memory-timeline">
          {sortedMemories.map((memory) => (
            <article className="memory-card" key={memory.id}>
              <div className="memory-date">
                <span>{formatCareDate(memory.date).split(" ")[0]}</span>
                <strong>{formatCareDate(memory.date).split(" ")[1]?.replace(",", "")}</strong>
              </div>
              <div className="memory-copy">
                <span className="eyebrow">{petName(pets, memory.petId)}</span>
                <h2>{memory.title}</h2>
                <p className="memory-scene">{memory.scene}</p>
                <p>{memory.description}</p>
                <div className="memory-card-actions">
                  <button className="icon-text-button" type="button" onClick={() => startEditMemory(memory)}>
                    <Pencil aria-hidden="true" /> Edit
                  </button>
                  <button className="icon-text-button danger" type="button" onClick={() => deleteMemory(memory.id)}>
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
              <button
                aria-label={`Open ${memory.title} photo`}
                className="memory-image-button"
                type="button"
                onClick={() => setPreviewMemory(memory)}
              >
                <img alt={`${memory.title} memory`} src={memory.image} />
                <span className="memory-image-hint">View photo</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {previewMemory && (
        <div
          aria-label={`${previewMemory.title} photo preview`}
          aria-modal="true"
          className="memory-lightbox"
          role="dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewMemory(null);
          }}
        >
          <section className="memory-lightbox-panel">
            <div className="memory-lightbox-actions">
              <a
                className="memory-lightbox-download"
                download={`${downloadFilename}.${downloadExtension}`}
                href={previewMemory.image}
                onClick={() => setToast("Memory photo download started.")}
              >
                <Download aria-hidden="true" />
                <span>Download photo</span>
              </a>
              <button
                autoFocus
                aria-label="Close photo preview"
                className="memory-lightbox-close"
                type="button"
                onClick={() => setPreviewMemory(null)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <img alt={`${previewMemory.title} full size`} src={previewMemory.image} />
            <div className="memory-lightbox-caption">
              <span>{petName(pets, previewMemory.petId)} · {formatCareDate(previewMemory.date)}</span>
              <strong>{previewMemory.title}</strong>
            </div>
          </section>
        </div>
      )}
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
      setToast("Extraction draft ready. Review every item before creating reminders.");
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
          <span className="eyebrow">Veterinary documents</span>
          <h1>Medical Records</h1>
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
              <input type="date" max={todayIso()} value={draft.visitDate} onChange={(event) => setDraft((current) => ({ ...current, visitDate: event.target.value }))} />
            </label>
            <label className="medical-file-field">
              Veterinary document
              <input key={fileInputKey} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
              <small>PDF and TXT can be read locally. For a scanned image, paste its instructions below.</small>
            </label>
            <label className="medical-source-field">
              Veterinary instructions
              <textarea value={draft.sourceText} onChange={(event) => setDraft((current) => ({ ...current, sourceText: event.target.value }))} placeholder="Give Carprofen 25 mg once daily with food for 3 days. Follow-up appointment on August 19, 2026." />
              <small>Optional for readable PDF/TXT files; useful for a reliable classroom demo.</small>
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
                      <label>Start date<input min={todayIso()} type="date" value={item.start_date} onChange={(event) => updateMedication(index, "start_date", event.target.value)} /></label>
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
                      <label>Date<input min={todayIso()} type="date" value={reviewData.follow_up.date} onChange={(event) => setReviewData((current) => ({ ...current, follow_up: { ...current.follow_up, date: event.target.value } }))} /></label>
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
              <span><strong>Email reminders</strong><small>Coming soon — email reminders are planned for a future update.</small></span>
              <input aria-label="Email reminders coming soon" checked={emailReminders} disabled type="checkbox" />
            </label>
            <label className="settings-control-row">
              <span><strong>Remind me</strong><small>Set the default notice before a care task is due.</small></span>
              <select value={reminderTiming} onChange={(event) => setReminderTiming(Number(event.target.value))}>
                <option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>1 week before</option><option value={14}>2 weeks before</option>
              </select>
            </label>
            <label className="settings-toggle-row">
              <span><strong>Overdue alerts</strong><small>Coming soon — alert preferences will be available in a future update.</small></span>
              <input aria-label="Overdue alerts coming soon" checked={overdueAlerts} disabled type="checkbox" />
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
            <span><strong>Export PawRise data</strong><small>Download pet profiles, care reminders, and memories.</small></span>
            <button className="secondary-button settings-button-with-icon" disabled type="button"><Download aria-hidden="true" />Coming soon</button>
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
  const [user, setUser] = useState({ name: "", email: "", avatarUrl: "" });
  const [activePage, setActivePage] = useState("Home");
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("all");
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [careHistory, setCareHistory] = useState([]);
  const [memories, setMemories] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [formMode, setFormMode] = useState(null);
  const [petDraft, setPetDraft] = useState(emptyPetDraft);
  const [editingPetId, setEditingPetId] = useState(null);
  const [healthFormMode, setHealthFormMode] = useState("add");
  const [healthDraft, setHealthDraft] = useState(emptyHealthDraft);
  const [editingHealthId, setEditingHealthId] = useState(null);
  const [healthFilterType, setHealthFilterType] = useState("All");
  const [healthSortOrder, setHealthSortOrder] = useState("Soonest");
  const [memoryFormOpen, setMemoryFormOpen] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [memoryDraft, setMemoryDraft] = useState(emptyMemoryDraft);
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
    const [petData, reminderData, historyData, memoryData, medicalRecordData] = await Promise.all([
      api.pets.list(),
      api.reminders.list(),
      api.reminders.history(),
      api.memories.list(),
      api.medicalRecords.list(),
    ]);
    const nextPets = petData.map(normalizePet);
    const defaultPetId = nextPets[0]?.id ?? "";
    setPets(nextPets);
    setReminders(reminderData.map(normalizeReminder));
    setCareHistory(historyData.map(normalizeReminder));
    setMemories(memoryData.map(normalizeMemory));
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

  const visibleReminders = useMemo(
    () =>
      selectedPet === "all"
        ? reminders
        : reminders.filter((reminder) => reminder.petId === selectedPet),
    [reminders, selectedPet],
  );
  const overdueCount = visibleReminders.filter((item) => reminderStatus(item.due) === "overdue").length;
  const memoryCounts = useMemo(
    () =>
      memories.reduce((counts, memory) => {
        counts[memory.petId] = (counts[memory.petId] ?? 0) + 1;
        return counts;
      }, {}),
    [memories],
  );

  function openPage(page) {
    setActivePage(page);
    setToast(["My Pets", "Care Planner", "Medical Records", "Memories", "Settings"].includes(page) ? `${page} opened.` : `${page} module is ready to build next.`);
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
    setUser({ name: "", email: "", avatarUrl: "" });
    setPets([]);
    setReminders([]);
    setCareHistory([]);
    setMemories([]);
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

  function startAddMemory() {
    const defaultPetId = pets.some((pet) => pet.id === selectedPet)
      ? selectedPet
      : pets[0]?.id ?? "";
    setMemoryFormOpen(true);
    setEditingMemoryId(null);
    setMemoryDraft({
      ...emptyMemoryDraft,
      petId: defaultPetId,
      image: "",
    });
    setToast("Add memory form opened.");
  }

  function startEditMemory(memory) {
    setEditingMemoryId(memory.id);
    setMemoryFormOpen(true);
    setMemoryDraft({
      ...emptyMemoryDraft,
      petId: memory.petId,
      title: memory.title,
      date: memory.date,
      image: memory.image,
    });
    setToast(`Editing “${memory.title}”.`);
    window.setTimeout(() => {
      document.querySelector(".memory-form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function cancelMemoryForm() {
    setMemoryFormOpen(false);
    setEditingMemoryId(null);
    setMemoryDraft(emptyMemoryDraft);
    setToast(`Memory ${editingMemoryId ? "edit" : "draft"} cancelled.`);
  }

  async function saveMemory(event) {
    event.preventDefault();
    if (!memoryDraft.petId || !memoryDraft.date.trim() || !memoryDraft.image) {
      setToast("Pet, date, and photo are required.");
      return;
    }

    try {
      const title = memoryDraft.title.trim() || randomMemoryTitle();
      const payload = {
        pet_id: Number(memoryDraft.petId),
        title,
        memory_date: memoryDraft.date,
        category: "daily_moment",
        scene: null,
        description: null,
        image_url: memoryDraft.image?.startsWith("http") ? memoryDraft.image : null,
      };
      if (editingMemoryId) {
        await api.memories.update(editingMemoryId, payload);
      } else {
        await api.memories.create(payload);
      }
      await loadAllData();
      setMemoryFormOpen(false);
      setEditingMemoryId(null);
      setMemoryDraft(emptyMemoryDraft);
      setToast(`Memory ${editingMemoryId ? "updated" : "saved"} as “${title}”.`);
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    }
  }

  async function deleteMemory(id) {
    const target = memories.find((memory) => memory.id === id);
    if (!window.confirm(`Delete “${target?.title ?? "this memory"}”? This cannot be undone.`)) {
      return;
    }

    try {
      await api.memories.remove(id);
      await loadAllData();
      if (editingMemoryId === id) {
        setMemoryFormOpen(false);
        setEditingMemoryId(null);
        setMemoryDraft(emptyMemoryDraft);
      }
      setToast("Memory deleted from the database.");
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
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><PawPrint /></div>
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

        <div className={`sidebar-note ${overdueCount > 0 ? "has-alert" : ""}`}>
          <span className="sidebar-date-icon" aria-hidden="true"><CalendarDays /></span>
          <div>
            <span>Today</span>
            <time dateTime={todayIso()}>{new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</time>
          </div>
          {overdueCount > 0 && <strong aria-label={`${overdueCount} overdue care items`}>{overdueCount}</strong>}
        </div>
      </aside>

      <section className="workspace">
        {activePage === "Home" && (
          <HomeView
            careHistory={careHistory}
            completeReminder={completeReminder}
            medicalRecords={medicalRecords}
            openPage={openPage}
            openPetDetail={openPetDetail}
            pets={pets}
            reminders={reminders}
            selectedPet={selectedPet}
            startAddPet={startAddPet}
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
            memoryCounts={memoryCounts}
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
        {activePage === "Memories" && (
          <MemoryTimelineView
            cancelMemoryForm={cancelMemoryForm}
            deleteMemory={deleteMemory}
            editingMemoryId={editingMemoryId}
            formOpen={memoryFormOpen}
            memories={memories}
            memoryDraft={memoryDraft}
            pets={pets}
            saveMemory={saveMemory}
            setMemoryDraft={setMemoryDraft}
            setToast={setToast}
            startAddMemory={startAddMemory}
            startEditMemory={startEditMemory}
          />
        )}
        {activePage === "Settings" && <SettingsView onLogout={logout} onUserUpdate={setUser} setToast={setToast} user={user} />}
        {!["Home", "My Pets", "Care Planner", "Medical Records", "Memories", "Settings"].includes(activePage) && <PlaceholderPage openPage={openPage} page={activePage} />}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}
