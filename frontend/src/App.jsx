import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CalendarDays, Download, Eye, EyeOff, LogOut, PawPrint, Repeat2, ShieldCheck, Syringe, UserRound } from "lucide-react";
import authBrandPanel from "./assets/auth-brand-panel.png";
import damiMemory from "./assets/dami-memory.png";
import damiProfile from "./assets/dami-profile.png";
import roroMemory from "./assets/roro-memory.png";
import roroProfile from "./assets/roro-profile.png";
import { api, clearAccessToken, hasAccessToken, setAccessToken } from "./api.js";

const isoDate = (date) => date.toISOString().slice(0, 10);
const todayIso = () => isoDate(new Date());
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return isoDate(date);
};

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
  breed: "",
  age: "",
  birthday: "",
  adoption: "",
  weight: "",
  note: "",
};

const emptyHealthDraft = {
  petId: "",
  type: "Vaccine",
  due: tomorrowIso(),
  repeat: "Every year",
  note: "",
};

const emptyMemoryDraft = {
  petId: "",
  title: "",
  date: todayIso(),
  scene: "",
  description: "",
  image: damiMemory,
  photoName: "",
};

function petName(pets, id) {
  return pets.find((pet) => pet.id === id)?.name ?? "All pets";
}

const TODAY = new Date(`${todayIso()}T12:00:00`);

function dateValue(value) {
  return new Date(`${value}T12:00:00`);
}

function formatCareDate(value) {
  return dateValue(value).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function reminderStatus(due) {
  const days = Math.ceil((dateValue(due) - TODAY) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 7) return "due-soon";
  return "upcoming";
}

function addRepeatDate(due, repeat) {
  const next = dateValue(due);
  const monthMap = { "Every month": 1, "Every 2 months": 2, "Every 3 months": 3, "Every 6 months": 6, "Every year": 12 };
  const months = monthMap[repeat];
  if (!months) return null;
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

const repeatToApi = {
  "Does not repeat": "none",
  "Every month": "monthly",
  "Every 2 months": "every_2_months",
  "Every 3 months": "every_3_months",
  "Every 6 months": "every_6_months",
  "Every year": "yearly",
};

const repeatFromApi = Object.fromEntries(Object.entries(repeatToApi).map(([label, value]) => [value, label]));

function normalizePet(pet) {
  return {
    id: String(pet.id),
    name: pet.name,
    species: pet.species,
    breed: pet.breed || pet.species,
    age: pet.age_years == null ? "Age not set" : `${pet.age_years} years`,
    birthday: pet.birthday || "",
    adoption: pet.adoption_date || "",
    weight: pet.weight_lb ?? "",
    image: pet.image_url || (pet.id % 2 === 0 ? roroProfile : damiProfile),
    note: pet.notes || "No notes yet.",
  };
}

function normalizeReminder(reminder) {
  return {
    id: String(reminder.id),
    petId: String(reminder.pet_id),
    type: reminder.care_type.charAt(0).toUpperCase() + reminder.care_type.slice(1),
    due: reminder.due_date,
    repeat: repeatFromApi[reminder.repeat_rule] || "Does not repeat",
    note: reminder.notes || "",
    status: reminder.status,
    completedId: String(reminder.id),
    completedOn: reminder.completed_at ? new Date(reminder.completed_at).toLocaleDateString("en-US") : "",
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
  return {
    name: draft.name.trim(),
    species: draft.species.trim(),
    breed: draft.breed.trim() || null,
    birthday: draft.birthday || null,
    adoption_date: draft.adoption || null,
    weight_lb: draft.weight === "" ? null : Number(draft.weight),
    image_url: draft.image?.startsWith("http") ? draft.image : null,
    notes: draft.note?.trim() || null,
  };
}

function reminderPayload(draft) {
  return {
    pet_id: Number(draft.petId),
    care_type: draft.type.toLowerCase(),
    due_date: draft.due,
    repeat_rule: repeatToApi[draft.repeat] || "none",
    notes: draft.note?.trim() || null,
  };
}

function timeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "evening";
  }
  return "night";
}

function StatusPill({ status }) {
  return <span className={`status-pill ${status}`}>{status === "due-soon" ? "due soon" : status}</span>;
}

function AuthView({ onAuthenticate }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

function HomeView({
  pets,
  reminders,
  selectedPet,
  draft,
  setDraft,
  switchPet,
  completeReminder,
  addReminder,
  setToast,
  openPetDetail,
  openPage,
  userName,
}) {
  const visibleReminders = useMemo(
    () =>
      (selectedPet === "all" ? reminders : reminders.filter((reminder) => reminder.petId === selectedPet))
        .slice()
        .sort((a, b) => dateValue(a.due) - dateValue(b.due)),
    [reminders, selectedPet],
  );

  const overdueCount = visibleReminders.filter((item) => reminderStatus(item.due) === "overdue").length;
  const upcomingCount = visibleReminders.filter((item) => reminderStatus(item.due) !== "overdue").length;
  const greeting = timeGreeting();

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">PawRise home</span>
          <h1>Good {greeting}, {userName.split(" ")[0]}</h1>
          <p>See what needs care today, then jump into the right space when you need more detail.</p>
        </div>
        <div className="actions">
          <button className="secondary-button" type="button" onClick={() => openPage("Memories")}>
            Go to memories
          </button>
          <button className="primary-button" type="button" onClick={() => openPage("Health & Care")}>
            Add care reminder
          </button>
        </div>
      </header>

      <section className="pet-switcher" aria-label="Pet filter">
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
            <img alt={`${pet.name} profile`} src={pet.image} />
            <span>{pet.name}</span>
          </button>
        ))}
      </section>

      <section className="home-grid">
        <section className="panel main-panel care-focus-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Care focus</span>
              <h2>Today's care focus</h2>
            </div>
            <div className="mini-stats" aria-label="Care summary">
              <span>{overdueCount} overdue</span>
              <span>{upcomingCount} upcoming</span>
              <span>{visibleReminders.length} active</span>
            </div>
          </div>

          <div className="care-columns">
            <div>
              <h3 className="column-title upcoming-title">Upcoming</h3>
              <div className="reminder-list">
                {visibleReminders
                  .filter((item) => reminderStatus(item.due) !== "overdue")
                  .slice(0, 3)
                  .map((item) => (
                    <article className={`reminder-row ${reminderStatus(item.due)}`} key={item.id}>
                      <div className="date-chip">
                        <span>{formatCareDate(item.due).split(" ")[0]}</span>
                        <strong>{formatCareDate(item.due).split(" ")[1]?.replace(",", "")}</strong>
                      </div>
                      <div className="reminder-copy">
                        <div>
                          <h3>{petName(pets, item.petId)} - {item.type}</h3>
                          <p>{formatCareDate(item.due)} · {item.note}</p>
                        </div>
                        <StatusPill status={reminderStatus(item.due)} />
                      </div>
                      <button
                        className="row-action"
                        onClick={() => completeReminder(item.id)}
                        type="button"
                      >
                        Mark done
                      </button>
                    </article>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="column-title overdue-title">Overdue</h3>
              <div className="reminder-list">
                {visibleReminders
                  .filter((item) => reminderStatus(item.due) === "overdue")
                  .map((item) => (
                    <article className="reminder-row overdue" key={item.id}>
                      <div className="date-chip">
                        <span>{formatCareDate(item.due).split(" ")[0]}</span>
                        <strong>{formatCareDate(item.due).split(" ")[1]?.replace(",", "")}</strong>
                      </div>
                      <div className="reminder-copy">
                        <div>
                          <h3>{petName(pets, item.petId)} - {item.type}</h3>
                          <p>{formatCareDate(item.due)} · {item.note}</p>
                        </div>
                        <StatusPill status="overdue" />
                      </div>
                      <button className="row-action" onClick={() => completeReminder(item.id)} type="button">
                        Mark done
                      </button>
                    </article>
                  ))}
              </div>
            </div>
          </div>

          <form className="quick-capture" onSubmit={addReminder}>
            <label>
              Pet
              <select
                value={draft.petId}
                onChange={(event) => setDraft((current) => ({ ...current, petId: event.target.value }))}
              >
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Care item
              <input
                placeholder="Add a vaccine, grooming, or medicine note"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Due date
              <input
                min={tomorrowIso()}
                type="date"
                value={draft.due}
                onChange={(event) => setDraft((current) => ({ ...current, due: event.target.value }))}
              />
            </label>
            <button className="primary-button" type="submit">
              Save
            </button>
          </form>
        </section>

        <section className="home-overview">
          <div className="section-intro">
            <div>
              <span className="eyebrow">Pet overview</span>
              <h2>Quick household glance</h2>
            </div>
            <p>Short cards only. Full profiles, health history, memories, and all reminders live in their own modules.</p>
          </div>

          <section className="pet-showcase" aria-label="Pet overview cards">
            {pets.map((pet) => {
              const latest = reminders
                .filter((record) => record.petId === pet.id)
                .slice()
                .sort((a, b) => dateValue(a.due) - dateValue(b.due))[0];
              return (
                <article className="large-pet-card" key={pet.id}>
                  <button className="pet-hero" onClick={() => openPetDetail(pet.id)} type="button">
                    <img alt={`${pet.name} the ${pet.breed}`} src={pet.image} />
                  </button>
                  <div className="large-pet-body">
                    <h3>{pet.name}</h3>
                    <p>{pet.breed} · {pet.age}</p>
                    <dl>
                      <div>
                        <dt>Health status</dt>
                        <dd>Good</dd>
                      </div>
                      <div>
                        <dt>Last care</dt>
                        <dd>{latest ? formatCareDate(latest.due) : "None"}</dd>
                      </div>
                      <div>
                        <dt>Next due</dt>
                        <dd>{latest?.repeat ?? "None"}</dd>
                      </div>
                      <div>
                        <dt>Weight</dt>
                        <dd>{pet.weight === "" ? "Not set" : `${pet.weight} lb`}</dd>
                      </div>
                    </dl>
                    <button className="secondary-button" onClick={() => openPetDetail(pet.id)} type="button">
                      View details
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </section>
      </section>
    </>
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
                    <img alt={`${pet.name} detail`} src={pet.image} />
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
                      <dt>Birthday</dt>
                      <dd>{pet.birthday ? formatCareDate(pet.birthday) : "Not set"}</dd>
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
                    <button type="button" onClick={() => openPage("Health & Care")}>
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

            <form className="pet-form" onSubmit={savePet}>
              <label>
                Name
                <input
                  value={petDraft.name}
                  onChange={(event) => setPetDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Pet name"
                />
              </label>
              <label>
                Breed
                <input
                  value={petDraft.breed}
                  onChange={(event) => setPetDraft((current) => ({ ...current, breed: event.target.value }))}
                  placeholder="Breed"
                />
              </label>
              <label>
                Species
                <input
                  value={petDraft.species}
                  onChange={(event) => setPetDraft((current) => ({ ...current, species: event.target.value }))}
                  placeholder="Cat, dog, rabbit..."
                />
              </label>
              <label>
                Birthday
                <input
                  type="date"
                  value={petDraft.birthday}
                  onChange={(event) => setPetDraft((current) => ({ ...current, birthday: event.target.value }))}
                />
              </label>
              <label>
                Adoption day
                <input
                  type="date"
                  value={petDraft.adoption}
                  onChange={(event) => setPetDraft((current) => ({ ...current, adoption: event.target.value }))}
                />
              </label>
              <label>
                Weight
                <input
                  value={petDraft.weight}
                  onChange={(event) => setPetDraft((current) => ({ ...current, weight: event.target.value }))}
                  placeholder="8.4 lb"
                />
              </label>
              <label className="wide-field">
                Notes
                <textarea
                  value={petDraft.note}
                  onChange={(event) => setPetDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Personality, care notes, or routines"
                />
              </label>
              <label className="wide-field">
                Photo from this device (optional)
                <input
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={photoUploading}
                  type="file"
                  onChange={uploadPetPhoto}
                />
                <small>{photoUploading ? "Uploading photo..." : petDraft.photoName || (petDraft.image?.startsWith("http") ? "A saved photo is attached." : "JPG, PNG, GIF, or WebP; maximum 5 MB.")}</small>
              </label>
              <button className="primary-button wide-field" disabled={photoUploading} type="submit">
                {photoUploading ? "Uploading..." : "Save profile"}
              </button>
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
  const [petFilter, setPetFilter] = useState("All");
  const [historyOpen, setHistoryOpen] = useState(false);
  const recordTypes = ["All", "Vaccine", "Deworming", "Checkup", "Medication", "Weight", "Other"];
  const filteredRecords = records
    .filter((record) => (filterType === "All" || record.type === filterType) && (petFilter === "All" || record.petId === petFilter))
    .slice()
    .sort((a, b) => {
      const first = dateValue(a.due);
      const second = dateValue(b.due);
      return sortOrder === "Soonest" ? first - second : second - first;
    });

  return (
    <>
      <header className="topbar health-topbar">
        <div>
          <span className="eyebrow">Health tracker</span>
          <h1>Health & Care</h1>
          <p>Plan vaccines, checkups, medication, and everyday care before they are due.</p>
        </div>
      </header>

      <section className="care-reminder-workspace">
        <section className="care-composer" aria-label={formMode === "edit" ? "Edit care reminder" : "Add care reminder"}>
          <div className="composer-heading">
            <div>
              <h2>{formMode === "edit" ? `Edit ${healthDraft.type} reminder` : "Add care reminder"}</h2>
              <p>Plan the next care task for your pet.</p>
            </div>
            {formMode === "edit" && <span className="editing-badge">Editing reminder</span>}
          </div>

          <form className="care-reminder-form" onSubmit={saveHealthRecord}>
            <label className="care-field feature-field">
              <span className="care-field-icon" aria-hidden="true"><PawPrint /></span>
              <span>Pet</span>
              <select value={healthDraft.petId} onChange={(event) => setHealthDraft((current) => ({ ...current, petId: event.target.value }))}>
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
            </label>
            <label className="care-field feature-field">
              <span className="care-field-icon" aria-hidden="true"><Syringe /></span>
              <span>Care type</span>
              <select value={healthDraft.type} onChange={(event) => setHealthDraft((current) => ({ ...current, type: event.target.value }))}>
                {recordTypes.filter((type) => type !== "All").map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="care-field feature-field">
              <span className="care-field-icon" aria-hidden="true"><CalendarDays /></span>
              <span>Due date</span>
              <input min={tomorrowIso()} type="date" value={healthDraft.due} onChange={(event) => setHealthDraft((current) => ({ ...current, due: event.target.value }))} />
            </label>
            <label className="care-field feature-field">
              <span className="care-field-icon" aria-hidden="true"><Repeat2 /></span>
              <span>Repeat</span>
              <select value={healthDraft.repeat} onChange={(event) => setHealthDraft((current) => ({ ...current, repeat: event.target.value }))}>
                <option>Does not repeat</option>
                <option>Every month</option>
                <option>Every 2 months</option>
                <option>Every 3 months</option>
                <option>Every 6 months</option>
                <option>Every year</option>
                <option>Custom</option>
              </select>
            </label>
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
            <div className="care-title-row">
              <h2>Care reminders</h2>
              <button className="history-link" type="button" onClick={() => setHistoryOpen((current) => !current)}>View care history</button>
            </div>
            <div className="care-filters">
              <select aria-label="Filter by pet" value={petFilter} onChange={(event) => setPetFilter(event.target.value)}>
                <option>All</option>
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
              </select>
              <select aria-label="Filter by care type" value={filterType} onChange={(event) => setFilterType(event.target.value)}>
                {recordTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
              <select aria-label="Sort by due date" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option>Soonest</option>
                <option>Latest</option>
              </select>
            </div>
          </div>

          {historyOpen ? (
            <div className="care-history-list">
              {careHistory.length ? careHistory.map((record) => (
                <article key={`history-${record.completedId}`}>
                  <strong>{petName(pets, record.petId)} · {record.type}</strong>
                  <span>Completed {record.completedOn}</span>
                  <p>{record.note}</p>
                </article>
              )) : <p className="empty-care-copy">Completed reminders will appear here.</p>}
            </div>
          ) : (
            <div className="care-table" role="table" aria-label="Active care reminders">
              <div className="care-table-header" role="row">
                <span>Pet</span><span>Care type</span><span>Due date</span><span>Repeat</span><span>Notes</span><span>Status</span><span>Actions</span>
              </div>
              {filteredRecords.map((record) => (
                <article className="care-table-row" role="row" key={record.id}>
                  <div className="care-pet-cell"><img src={pets.find((pet) => pet.id === record.petId)?.image} alt="" /><strong>{petName(pets, record.petId)}</strong></div>
                  <span className="care-type-cell">{record.type}</span>
                  <span><strong>{formatCareDate(record.due)}</strong><small>{Math.max(0, Math.ceil((dateValue(record.due) - TODAY) / 86400000))} days</small></span>
                  <span>{record.repeat}</span>
                  <span className="care-row-note">{record.note || "No notes"}</span>
                  <StatusPill status={reminderStatus(record.due)} />
                  <div className="care-row-actions">
                    <button className="mark-done-button" type="button" onClick={() => completeReminder(record.id)}>✓ Mark done</button>
                    <button className="icon-text-button" type="button" onClick={() => startEditHealth(record)}>Edit</button>
                    <button className="icon-text-button danger" type="button" onClick={() => deleteHealthRecord(record.id)}>Delete</button>
                  </div>
                </article>
              ))}
              {!filteredRecords.length && <p className="empty-care-copy">No reminders match these filters.</p>}
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
  cancelMemoryForm,
  saveMemory,
  setMemoryDraft,
  setToast,
}) {
  const [photoUploading, setPhotoUploading] = useState(false);

  async function uploadMemoryPhoto(event) {
    const file = event.target.files?.[0];
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

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">Memory timeline</span>
          <h1>Memories</h1>
          <p>Keep the story simple: when it happened, what the scene felt like, and the photo that brings it back.</p>
        </div>
        <div className="actions">
          <button className="primary-button" type="button" onClick={startAddMemory}>
            Add memory
          </button>
        </div>
      </header>

      <section className="memory-layout">
        {formOpen && (
          <section className="memory-form-panel" aria-label="Add memory form">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">New memory</span>
                <h2>Add a moment</h2>
              </div>
              <button className="secondary-button" type="button" onClick={cancelMemoryForm}>
                Cancel
              </button>
            </div>

            <form className="memory-form" onSubmit={saveMemory}>
              <label>
                Pet
                <select
                  value={memoryDraft.petId}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, petId: event.target.value }))}
                >
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
                  placeholder="A small happy moment"
                />
              </label>
              <label className="wide-field">
                Scene
                <input
                  value={memoryDraft.scene}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, scene: event.target.value }))}
                  placeholder="Sunny kitchen, evening walk, birthday morning"
                />
              </label>
              <label className="wide-field">
                Description
                <textarea
                  value={memoryDraft.description}
                  onChange={(event) => setMemoryDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What happened in this memory?"
                />
              </label>
              <label className="wide-field">
                Photo from this device (optional)
                <input
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={photoUploading}
                  type="file"
                  onChange={uploadMemoryPhoto}
                />
                <small>{photoUploading ? "Uploading photo..." : memoryDraft.photoName || "JPG, PNG, GIF, or WebP; maximum 5 MB."}</small>
              </label>
              <button className="primary-button wide-field" disabled={photoUploading} type="submit">
                {photoUploading ? "Uploading..." : "Save memory"}
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
              </div>
              <img alt={`${memory.title} memory`} src={memory.image} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function SettingsView({ onLogout, setToast, user }) {
  const [emailReminders, setEmailReminders] = useState(true);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [reminderTiming, setReminderTiming] = useState(7);
  const [saving, setSaving] = useState(false);

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
          <div className="account-row">
            <div className="account-avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
            <div className="account-copy"><strong>{user.name}</strong><span>{user.email}</span></div>
            <button className="secondary-button" type="button" onClick={() => setToast("Profile editing is ready for account integration.")}>Edit profile</button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-icon"><Bell aria-hidden="true" /></span>
            <div><h2>Care notifications</h2><p>Choose how PawRise helps you stay ahead of care dates.</p></div>
          </div>
          <div className="settings-list">
            <label className="settings-toggle-row">
              <span><strong>Email reminders</strong><small>Receive upcoming care reminders by email.</small></span>
              <input checked={emailReminders} onChange={(event) => setEmailReminders(event.target.checked)} type="checkbox" />
            </label>
            <label className="settings-control-row">
              <span><strong>Remind me</strong><small>Set the default notice before a care task is due.</small></span>
              <select value={reminderTiming} onChange={(event) => setReminderTiming(Number(event.target.value))}>
                <option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>1 week before</option><option value={14}>2 weeks before</option>
              </select>
            </label>
            <label className="settings-toggle-row">
              <span><strong>Overdue alerts</strong><small>Keep overdue care visible until it is completed.</small></span>
              <input checked={overdueAlerts} onChange={(event) => setOverdueAlerts(event.target.checked)} type="checkbox" />
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
            <button className="secondary-button settings-button-with-icon" type="button" onClick={() => setToast("Your PawRise export is being prepared.")}><Download aria-hidden="true" />Export data</button>
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
  const [user, setUser] = useState({ name: "", email: "" });
  const [activePage, setActivePage] = useState("Home");
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("all");
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [careHistory, setCareHistory] = useState([]);
  const [memories, setMemories] = useState([]);
  const [draft, setDraft] = useState({ petId: "", title: "", due: tomorrowIso() });
  const [formMode, setFormMode] = useState(null);
  const [petDraft, setPetDraft] = useState(emptyPetDraft);
  const [editingPetId, setEditingPetId] = useState(null);
  const [healthFormMode, setHealthFormMode] = useState("add");
  const [healthDraft, setHealthDraft] = useState(emptyHealthDraft);
  const [editingHealthId, setEditingHealthId] = useState(null);
  const [healthFilterType, setHealthFilterType] = useState("All");
  const [healthSortOrder, setHealthSortOrder] = useState("Soonest");
  const [memoryFormOpen, setMemoryFormOpen] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState(emptyMemoryDraft);
  const [toast, setToast] = useState("");

  async function loadAllData() {
    const [petData, reminderData, historyData, memoryData] = await Promise.all([
      api.pets.list(),
      api.reminders.list(),
      api.reminders.history(),
      api.memories.list(),
    ]);
    const nextPets = petData.map(normalizePet);
    const defaultPetId = nextPets[0]?.id ?? "";
    setPets(nextPets);
    setReminders(reminderData.map(normalizeReminder));
    setCareHistory(historyData.map(normalizeReminder));
    setMemories(memoryData.map(normalizeMemory));
    setSelectedPetId((current) => nextPets.some((pet) => pet.id === current) ? current : defaultPetId || null);
    setSelectedPet((current) => current === "all" || nextPets.some((pet) => pet.id === current) ? current : "all");
    setDraft((current) => ({ ...current, petId: nextPets.some((pet) => pet.id === current.petId) ? current.petId : defaultPetId }));
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
        setUser({ name: currentUser.full_name, email: currentUser.email });
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
    setToast(["My Pets", "Health & Care", "Memories", "Settings"].includes(page) ? `${page} opened.` : `${page} module is ready to build next.`);
  }

  async function authenticate(credentials) {
    const result = credentials.mode === "signup"
      ? await api.register({ full_name: credentials.fullName, email: credentials.email, password: credentials.password })
      : await api.login({ email: credentials.email, password: credentials.password });
    setAccessToken(result.access_token);
    setUser({ name: result.user.full_name, email: result.user.email });
    await loadAllData();
    setIsAuthenticated(true);
    setActivePage("Home");
    setToast("Welcome to PawRise.");
  }

  function logout() {
    clearAccessToken();
    setIsAuthenticated(false);
    setUser({ name: "", email: "" });
    setPets([]);
    setReminders([]);
    setCareHistory([]);
    setMemories([]);
    setActivePage("Home");
    setToast("");
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

  async function addReminder(event) {
    event.preventDefault();
    if (!draft.petId || !draft.title.trim() || !draft.due) {
      setToast("Add a care title before saving.");
      return;
    }
    const knownType = ["vaccine", "deworming", "checkup", "medication", "weight"].includes(draft.title.trim().toLowerCase())
      ? draft.title.trim().toLowerCase()
      : "other";
    try {
      await api.reminders.create({
        pet_id: Number(draft.petId),
        care_type: knownType,
        due_date: draft.due,
        repeat_rule: "none",
        notes: knownType === "other" ? draft.title.trim() : "Added from quick capture.",
      });
      await loadAllData();
      setDraft((current) => ({ petId: current.petId, title: "", due: tomorrowIso() }));
      setToast("New reminder saved to the database.");
    } catch (error) {
      setToast(error.message);
    }
  }

  function switchPet(id) {
    setSelectedPet(id);
    if (id !== "all") {
      setDraft((current) => ({ ...current, petId: id }));
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
    setHealthDraft({ ...record });
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
    if (dateValue(healthDraft.due) <= TODAY) {
      setToast("Choose a future due date.");
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
    setMemoryFormOpen(true);
    setMemoryDraft({
      ...emptyMemoryDraft,
      petId: selectedPet === "all" ? pets[0]?.id ?? "" : selectedPet,
      image: "",
    });
    setToast("Add memory form opened.");
  }

  function cancelMemoryForm() {
    setMemoryFormOpen(false);
    setMemoryDraft(emptyMemoryDraft);
    setToast("Memory draft cancelled.");
  }

  async function saveMemory(event) {
    event.preventDefault();
    if (!memoryDraft.petId || !memoryDraft.title.trim() || !memoryDraft.date.trim()) {
      setToast("Pet, title, and date are required.");
      return;
    }

    try {
      await api.memories.create({
        pet_id: Number(memoryDraft.petId),
        title: memoryDraft.title.trim(),
        memory_date: memoryDraft.date,
        category: "daily_moment",
        scene: memoryDraft.scene.trim() || null,
        description: memoryDraft.description.trim() || null,
        image_url: memoryDraft.image?.startsWith("http") ? memoryDraft.image : null,
      });
      await loadAllData();
      setMemoryFormOpen(false);
      setMemoryDraft(emptyMemoryDraft);
      setToast("Memory saved to the database.");
    } catch (error) {
      const detail = error.details ? Object.values(error.details)[0] : null;
      setToast(detail || error.message);
    }
  }

  if (isRestoring) {
    return <main className="auth-page"><section className="auth-form-panel"><div className="auth-form-shell"><h1>Loading PawRise...</h1><p>Restoring your secure session.</p></div></section></main>;
  }

  if (!isAuthenticated) {
    return <AuthView onAuthenticate={authenticate} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">PR</div>
          <div>
            <p>PawRise</p>
            <span>Life care journal</span>
          </div>
        </div>

        <nav className="nav-list">
          {["Home", "My Pets", "Health & Care", "Memories", "Settings"].map((item) => (
            <button
              className={item === activePage ? "active" : ""}
              key={item}
              onClick={() => openPage(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>Today</span>
          <strong>{new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}</strong>
          <p>{overdueCount > 0 ? `${overdueCount} overdue care item needs attention.` : "All care is on track."}</p>
        </div>
      </aside>

      <section className="workspace">
        {activePage === "Home" && (
          <HomeView
            addReminder={addReminder}
            completeReminder={completeReminder}
            draft={draft}
            openPage={openPage}
            openPetDetail={openPetDetail}
            pets={pets}
            reminders={reminders}
            selectedPet={selectedPet}
            setDraft={setDraft}
            setToast={setToast}
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
        {activePage === "Health & Care" && (
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
        {activePage === "Memories" && (
          <MemoryTimelineView
            cancelMemoryForm={cancelMemoryForm}
            formOpen={memoryFormOpen}
            memories={memories}
            memoryDraft={memoryDraft}
            pets={pets}
            saveMemory={saveMemory}
            setMemoryDraft={setMemoryDraft}
            setToast={setToast}
            startAddMemory={startAddMemory}
          />
        )}
        {activePage === "Settings" && <SettingsView onLogout={logout} setToast={setToast} user={user} />}
        {!["Home", "My Pets", "Health & Care", "Memories", "Settings"].includes(activePage) && <PlaceholderPage openPage={openPage} page={activePage} />}

        {toast && (
          <div className="toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}
