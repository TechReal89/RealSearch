const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://36.50.232.108:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...rest,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// Helper to get token for admin API calls
function t() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("realsearch_access_token") || "";
}

// --- Types ---
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: "user" | "admin";
  tier: "bronze" | "silver" | "gold" | "diamond";
  credit_balance: number;
  total_earned: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: number;
  user_id: number;
  job_type: string;
  status: string;
  title: string;
  target_url: string;
  target_count: number;
  completed_count: number;
  daily_limit: number | null;
  today_count: number;
  credit_per_view: number;
  total_credit_budget: number | null;
  credit_spent: number;
  config: Record<string, unknown>;
  priority: number;
  admin_priority: number;
  is_exchange: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_jobs: number;
  active_jobs: number;
  total_credits_circulating: number;
  total_revenue: number;
  online_clients: number;
}

export interface TierConfig {
  id: number;
  name: string;
  display_name: string;
  color: string | null;
  price_monthly: number;
  price_yearly: number;
  priority_level: number;
  daily_credit_limit: number;
  max_jobs: number;
  max_urls_per_job: number;
  max_clients: number;
  credit_earn_multiplier: number;
  allow_keyword_seo: boolean;
  allow_backlink: boolean;
  allow_social_media: boolean;
  allow_internal_click: boolean;
  allow_proxy: boolean;
  allow_scheduling: boolean;
  allow_priority_boost: boolean;
  allow_detailed_report: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface CreditPackage {
  id: number;
  name: string;
  credit_amount: number;
  bonus_credit: number;
  price: number;
  description: string | null;
  badge: string | null;
  min_tier: string | null;
  is_active: boolean;
}

export interface Payment {
  id: number;
  user_id: number;
  channel_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  purpose: string;
  credit_amount: number | null;
  status: string;
  transaction_id: string | null;
  bonus_credit: number;
  created_at: string;
  completed_at: string | null;
}

export interface ClientInfo {
  session_id: string;
  user_id: number;
  machine_id: string | null;
  os_info: string | null;
  browser_mode: string;
  enabled_job_types: string[];
  active_task_count: number;
  is_available: boolean;
  tasks_completed: number;
  tasks_failed: number;
  credits_earned: number;
  connected_at: string;
  last_heartbeat: string;
  client_version: string | null;
}

// --- API calls ---
export const authApi = {
  login: (username: string, password: string) =>
    api<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: (token: string) => api<{ user: User }>("/api/v1/auth/me", { token }),
  refresh: (refresh_token: string) =>
    api<TokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),
};

export const adminApi = {
  // Dashboard
  dashboard: () => api<DashboardStats>("/api/v1/admin/dashboard", { token: t() }),
  realtime: () => api<Record<string, unknown>>("/api/v1/admin/dashboard/realtime", { token: t() }),

  // Users
  listUsers: (params = "") => api<{ users: User[]; total: number }>(`/api/v1/admin/users?${params}`, { token: t() }),
  getUser: (id: number) => api<User>(`/api/v1/admin/users/${id}`, { token: t() }),
  updateUser: (id: number, data: Partial<User>) =>
    api<User>(`/api/v1/admin/users/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  adjustCredit: (id: number, amount: number, description: string) =>
    api(`/api/v1/admin/users/${id}/credit`, { token: t(), method: "POST", body: JSON.stringify({ amount, description }) }),
  deactivateUser: (id: number) =>
    api(`/api/v1/admin/users/${id}`, { token: t(), method: "DELETE" }),

  // Jobs
  listJobs: (params = "") => api<{ jobs: Job[]; total: number }>(`/api/v1/admin/jobs?${params}`, { token: t() }),
  getJob: (id: number) => api<Job>(`/api/v1/admin/jobs/${id}`, { token: t() }),
  createJob: (data: Record<string, unknown>) =>
    api<Job>("/api/v1/admin/jobs", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updateJob: (id: number, data: Record<string, unknown>) =>
    api<Job>(`/api/v1/admin/jobs/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  setJobPriority: (id: number, priority: number) =>
    api<Job>(`/api/v1/admin/jobs/${id}/priority`, { token: t(), method: "PUT", body: JSON.stringify({ admin_priority: priority }) }),
  startJob: (id: number) =>
    api<Job>(`/api/v1/admin/jobs/${id}/resume`, { token: t(), method: "POST" }),
  pauseJob: (id: number) => api<Job>(`/api/v1/admin/jobs/${id}/pause`, { token: t(), method: "POST" }),
  resumeJob: (id: number) => api<Job>(`/api/v1/admin/jobs/${id}/resume`, { token: t(), method: "POST" }),
  deleteJob: (id: number) => api(`/api/v1/admin/jobs/${id}`, { token: t(), method: "DELETE" }),

  // Settings
  getSettings: () => api<Record<string, Array<{ key: string; value: string; display_name: string; description: string; value_type: string }>>>("/api/v1/admin/settings", { token: t() }),
  updateSettings: (settings: Record<string, string>) =>
    api("/api/v1/admin/settings", { token: t(), method: "PUT", body: JSON.stringify({ settings }) }),

  // Tiers
  listTiers: () => api<TierConfig[]>("/api/v1/admin/tiers", { token: t() }),
  updateTier: (id: number, data: Partial<TierConfig>) =>
    api(`/api/v1/admin/tiers/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),

  // Credit Packages
  listPackages: () => api<CreditPackage[]>("/api/v1/admin/credit-packages", { token: t() }),
  createPackage: (data: Partial<CreditPackage>) =>
    api<CreditPackage>("/api/v1/admin/credit-packages", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updatePackage: (id: number, data: Partial<CreditPackage>) =>
    api<CreditPackage>(`/api/v1/admin/credit-packages/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deletePackage: (id: number) =>
    api(`/api/v1/admin/credit-packages/${id}`, { token: t(), method: "DELETE" }),

  // Payments
  listPayments: (params = "") => api<{ payments: Payment[]; total: number }>(`/api/v1/admin/payments?${params}`, { token: t() }),
  paymentStats: () => api<{ total_revenue: number; total_payments: number; pending_payments: number }>("/api/v1/admin/payments/stats", { token: t() }),
  confirmPayment: (id: number) => api(`/api/v1/admin/payments/${id}/confirm`, { token: t(), method: "POST" }),
  refundPayment: (id: number) => api(`/api/v1/admin/payments/${id}/refund`, { token: t(), method: "POST" }),

  // Monitoring
  getClients: () => api<{ stats: Record<string, number>; clients: ClientInfo[] }>("/api/v1/admin/clients", { token: t() }),
  broadcast: (message: string, level = "info") =>
    api("/api/v1/admin/broadcast", { token: t(), method: "POST", body: JSON.stringify({ message, level }) }),
};
