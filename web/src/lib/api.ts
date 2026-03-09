const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.realsearch.techreal.vn/api/v1";

async function fetchApi(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("access_token")}`;
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers });
      if (!retry.ok) throw new Error((await retry.json()).detail || "Lỗi");
      return retry.json();
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/";
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Lỗi ${res.status}`);
  }
  return res.json();
}

async function refreshToken(): Promise<boolean> {
  const rt = localStorage.getItem("refresh_token");
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return true;
    }
  } catch {}
  return false;
}

export const authApi = {
  login: (username: string, password: string) =>
    fetchApi("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (data: { username: string; email: string; password: string; full_name?: string; referral_code?: string }) =>
    fetchApi("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => fetchApi("/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    fetchApi("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
};

export const userApi = {
  profile: () => fetchApi("/users/profile"),
  updateProfile: (data: Record<string, unknown>) => {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    return fetchApi(`/users/profile?${params.toString()}`, { method: "PUT" });
  },
  stats: () => fetchApi("/users/stats"),
  referral: () => fetchApi("/users/referral"),
  tiers: () => fetchApi("/users/tiers"),
};

export const jobApi = {
  list: (params = "") => fetchApi(`/jobs?${params}`),
  create: (data: Record<string, unknown>) =>
    fetchApi("/jobs", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => fetchApi(`/jobs/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    fetchApi(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi(`/jobs/${id}`, { method: "DELETE" }),
  start: (id: number) => fetchApi(`/jobs/${id}/start`, { method: "POST" }),
  pause: (id: number) => fetchApi(`/jobs/${id}/pause`, { method: "POST" }),
  resume: (id: number) => fetchApi(`/jobs/${id}/resume`, { method: "POST" }),
  tasks: (id: number) => fetchApi(`/jobs/${id}/tasks`),
};

export const creditApi = {
  balance: () => fetchApi("/credits/balance"),
  history: (params = "") => fetchApi(`/credits/history?${params}`),
  packages: () => fetchApi("/credits/packages"),
};

export const paymentApi = {
  channels: () => fetchApi("/payments/channels"),
  create: (data: Record<string, unknown>) =>
    fetchApi("/payments/create", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => fetchApi(`/payments/${id}`),
  history: (params = "") => fetchApi(`/payments/history?${params}`),
};
