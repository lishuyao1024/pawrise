const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "pawrise_access_token";

export function setAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function hasAccessToken() {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
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
    if (response.status === 401) {
      clearAccessToken();
    }
    const error = new Error(payload?.error?.message ?? `Request failed (${response.status}).`);
    error.status = response.status;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload?.data;
}

async function uploadImage(file) {
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
    throw new Error(payload?.error?.message ?? "The image could not be uploaded.");
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
    const error = new Error(payload?.error?.message ?? "The medical record could not be uploaded.");
    error.status = response.status;
    error.details = payload?.error?.details;
    throw error;
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
    throw new Error(payload?.error?.message ?? "The original document could not be opened.");
  }
  return response.blob();
}

export const api = {
  uploadImage,
  register: (body) => apiRequest("/auth/register", { method: "POST", body }),
  login: (body) => apiRequest("/auth/login", { method: "POST", body }),
  me: () => apiRequest("/auth/me"),
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
