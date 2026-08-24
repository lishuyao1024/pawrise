const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "pawrise_access_token";
export const AUTH_SESSION_EXPIRED_EVENT = "pawrise:session-expired";

const AUTH_FAILURE_CODES = new Set(["AUTHORIZATION_REQUIRED", "INVALID_TOKEN", "TOKEN_EXPIRED"]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function setAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

function responseError(response, payload, fallbackMessage) {
  const code = payload?.error?.code;
  const sessionExpired = response.status === 401 && AUTH_FAILURE_CODES.has(code);

  if (sessionExpired) {
    clearAccessToken();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
        detail: { message: "Your session has expired. Please log in again." },
      }));
    }
  }

  const error = new Error(
    sessionExpired
      ? "Your session has expired. Please log in again."
      : payload?.error?.message ?? fallbackMessage,
  );
  error.status = response.status;
  error.code = code;
  error.details = payload?.error?.details;
  return error;
}

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error("Cannot reach the PawRise API. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw responseError(response, payload, `Request failed (${response.status}).`);
  }

  return payload?.data;
}

async function uploadImage(file) {
  if (!file || !SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, GIF, or WebP image. HEIC photos need to be converted first.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Please choose an image smaller than 5 MB.");
  }

  const formData = new FormData();
  formData.append("image", file);
  const token = sessionStorage.getItem(TOKEN_KEY);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  } catch {
    throw new Error("Cannot reach the PawRise API. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const fallbackMessage = response.status === 413
      ? "This image is too large. Choose an image smaller than 5 MB."
      : "The image could not be uploaded.";
    throw responseError(response, payload, fallbackMessage);
  }
  return payload.data;
}

async function createMedicalRecord(formData) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/medical-records`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  } catch {
    throw new Error("Cannot reach the PawRise API. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw responseError(response, payload, "The medical record could not be uploaded.");
  }
  return payload.data;
}

async function getMedicalRecordDocument(id) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/medical-records/${id}/document`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error("Cannot reach the PawRise API. Please try again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw responseError(response, payload, "The original document could not be opened.");
  }
  return response.blob();
}

export const api = {
  uploadImage,
  register: (body) => apiRequest("/auth/register", { method: "POST", body }),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  me: () => apiRequest("/auth/me"),
  updateMe: (body) => apiRequest("/auth/me", { method: "PATCH", body }),
  pets: {
    list: () => apiRequest("/pets"),
    create: (body) => apiRequest("/pets", { method: "POST", body }),
    update: (id, body) => apiRequest(`/pets/${id}`, { method: "PUT", body }),
    remove: (id) => apiRequest(`/pets/${id}`, { method: "DELETE" }),
  },
  reminders: {
    list: () => apiRequest("/reminders"),
    history: () => apiRequest("/reminders/history"),
    create: (body) => apiRequest("/reminders", { method: "POST", body }),
    update: (id, body) => apiRequest(`/reminders/${id}`, { method: "PUT", body }),
    remove: (id) => apiRequest(`/reminders/${id}`, { method: "DELETE" }),
    complete: (id) => apiRequest(`/reminders/${id}/complete`, { method: "POST", body: {} }),
  },
  memories: {
    list: () => apiRequest("/memories"),
    create: (body) => apiRequest("/memories", { method: "POST", body }),
    update: (id, body) => apiRequest(`/memories/${id}`, { method: "PUT", body }),
    remove: (id) => apiRequest(`/memories/${id}`, { method: "DELETE" }),
  },
  community: {
    list: () => apiRequest("/community/posts"),
    create: (body) => apiRequest("/community/posts", { method: "POST", body }),
    remove: (id) => apiRequest(`/community/posts/${id}`, { method: "DELETE" }),
    moderate: (id, status) => apiRequest(`/community/posts/${id}/moderation`, { method: "PATCH", body: { status } }),
    like: (id) => apiRequest(`/community/posts/${id}/likes`, { method: "POST", body: {} }),
    unlike: (id) => apiRequest(`/community/posts/${id}/likes`, { method: "DELETE" }),
    report: (id, reason) => apiRequest(`/community/posts/${id}/reports`, { method: "POST", body: { reason } }),
    block: (userId) => apiRequest(`/community/blocks/${userId}`, { method: "POST", body: {} }),
    unblock: (userId) => apiRequest(`/community/blocks/${userId}`, { method: "DELETE" }),
  },
  admin: {
    me: () => apiRequest("/admin/me"),
    posts: () => apiRequest("/admin/posts"),
    users: () => apiRequest("/admin/users"),
    user: (id) => apiRequest(`/admin/users/${id}`),
    updateReport: (id, status) => apiRequest(`/admin/reports/${id}`, { method: "PATCH", body: { status } }),
  },
  medicalRecords: {
    list: () => apiRequest("/medical-records"),
    get: (id) => apiRequest(`/medical-records/${id}`),
    document: getMedicalRecordDocument,
    create: createMedicalRecord,
    confirm: (id, extractedData) => apiRequest(`/medical-records/${id}/confirm`, {
      method: "POST",
      body: { extracted_data: extractedData },
    }),
    remove: (id, deleteIncompleteReminders = false) => apiRequest(
      `/medical-records/${id}?delete_incomplete_reminders=${deleteIncompleteReminders}`,
      { method: "DELETE" },
    ),
  },
  settings: {
    get: () => apiRequest("/settings"),
    update: (body) => apiRequest("/settings", { method: "PUT", body }),
  },
};
