const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.realsearch.techreal.vn";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const doFetch = (tkn?: string) =>
    fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(tkn ? { Authorization: `Bearer ${tkn}` } : {}),
        ...headers,
      },
      ...rest,
    });

  let res = await doFetch(token);

  // Auto-refresh token on 401
  if (res.status === 401 && token && typeof window !== "undefined") {
    const rt = localStorage.getItem("realsearch_refresh_token");
    if (rt) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem("realsearch_access_token", data.access_token);
          localStorage.setItem("realsearch_refresh_token", data.refresh_token);
          res = await doFetch(data.access_token);
        } else {
          // Refresh failed - redirect to login
          localStorage.removeItem("realsearch_access_token");
          localStorage.removeItem("realsearch_refresh_token");
          window.location.href = "/login";
          throw new Error("Phiên đăng nhập hết hạn");
        }
      } catch (e) {
        if (e instanceof Error && e.message === "Phiên đăng nhập hết hạn") throw e;
        // Network error on refresh - redirect to login
        localStorage.removeItem("realsearch_access_token");
        localStorage.removeItem("realsearch_refresh_token");
        window.location.href = "/login";
        throw new Error("Phiên đăng nhập hết hạn");
      }
    }
  }

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

export interface PaymentChannelConfig {
  id: number;
  name: string;
  display_name: string;
  icon_url: string | null;
  config: Record<string, string>;
  is_active: boolean;
  fee_percent: number;
  min_amount: number;
  max_amount: number;
  sort_order: number;
  created_at: string;
}

export interface Promotion {
  id: number;
  name: string;
  code: string | null;
  type: string;
  value: number;
  min_purchase: number | null;
  min_tier: string | null;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface ServerMetrics {
  timestamp: string;
  cpu: {
    percent: number;
    count: number;
    freq_mhz: number;
    load_1m: number;
    load_5m: number;
    load_15m: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
    swap_total_gb: number;
    swap_used_gb: number;
    swap_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_recv: number;
    connections: number;
    speed?: { sent_per_sec: number; recv_per_sec: number };
  };
  system: {
    uptime_seconds: number;
    boot_time: string;
  };
  alerts?: { level: string; message: string }[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
}

export interface DockerContainer {
  name: string;
  cpu: string;
  mem_usage: string;
  mem_percent: string;
  net_io: string;
  pids: string;
}

export interface SecurityOverview {
  timestamp: string;
  ssh: {
    failed_attempts: number;
    top_attacking_ips: { ip: string; count: number; is_banned: boolean }[];
    hourly: { time: string; count: number }[];
  };
  firewall: {
    active: boolean;
    rules: string[];
    raw: string;
  };
  fail2ban: {
    active: boolean;
    jails: { name: string; currently_banned: number; total_banned: number; banned_ips: string[] }[];
    total_banned: number;
    banned_ips: { ip: string; jail: string }[];
  };
  open_ports: { port: number; address: string; state: string; process: string }[];
  connections: {
    total: number;
    by_port: Record<string, number>;
  };
  nginx: {
    error_count: number;
    status_4xx: number;
    status_5xx: number;
    recent_errors: string[];
  };
  recent_events: { time: string; ip: string; type: string; message: string }[];
  whitelist: {
    whitelist: { ip: string; note: string }[];
    successful_ips: { ip: string; user: string; last_login: string; whitelisted: boolean }[];
  };
}

// --- License Types ---
export interface LicenseProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  latest_version: string | null;
  download_url: string | null;
  features: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LicensePlan {
  id: number;
  product_id: number;
  name: string;
  duration_days: number;
  price: number;
  max_devices: number;
  features: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface License {
  id: number;
  license_key: string;
  product_id: number;
  plan_id: number | null;
  user_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  max_devices: number;
  current_devices: number;
  features: Record<string, unknown> | null;
  note: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  product_name: string | null;
  plan_name: string | null;
}

export interface LicenseDevice {
  id: number;
  license_id: number;
  machine_id: string;
  device_name: string | null;
  os_info: string | null;
  ip_address: string | null;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

export interface LicenseLog {
  id: number;
  license_id: number;
  action: string;
  machine_id: string | null;
  ip_address: string | null;
  detail: string | null;
  created_at: string;
}

export interface LicenseStats {
  total_licenses: number;
  by_status: Record<string, number>;
  active_devices: number;
  products_count: number;
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
    api<Job>(`/api/v1/admin/jobs/${id}/start`, { token: t(), method: "POST" }),
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

  // Payment Channels
  listChannels: () => api<{ channels: PaymentChannelConfig[] }>("/api/v1/admin/payments/channels", { token: t() }),
  createChannel: (data: Partial<PaymentChannelConfig>) =>
    api("/api/v1/admin/payments/channels", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updateChannel: (id: number, data: Partial<PaymentChannelConfig>) =>
    api(`/api/v1/admin/payments/channels/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deleteChannel: (id: number) =>
    api(`/api/v1/admin/payments/channels/${id}`, { token: t(), method: "DELETE" }),

  // Monitoring
  getClients: () => api<{ stats: Record<string, number>; clients: ClientInfo[] }>("/api/v1/admin/clients", { token: t() }),
  broadcast: (message: string, level = "info") =>
    api("/api/v1/admin/broadcast", { token: t(), method: "POST", body: JSON.stringify({ message, level }) }),

  // Promotions
  listPromotions: (params = "") => api<{ promotions: Promotion[]; total: number }>(`/api/v1/admin/promotions?${params}`, { token: t() }),
  createPromotion: (data: Partial<Promotion>) =>
    api("/api/v1/admin/promotions", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updatePromotion: (id: number, data: Partial<Promotion>) =>
    api(`/api/v1/admin/promotions/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deletePromotion: (id: number) =>
    api(`/api/v1/admin/promotions/${id}`, { token: t(), method: "DELETE" }),

  // Server Monitor
  serverMetrics: () => api<ServerMetrics>("/api/v1/admin/server/metrics", { token: t() }),
  serverHistory: (minutes = 5) => api<{ data: ServerMetrics[]; count: number }>(`/api/v1/admin/server/metrics/history?minutes=${minutes}`, { token: t() }),
  serverProcesses: () => api<{ processes: ProcessInfo[] }>("/api/v1/admin/server/processes", { token: t() }),
  serverDocker: () => api<{ available: boolean; containers?: DockerContainer[]; error?: string }>("/api/v1/admin/server/docker", { token: t() }),

  // License - Products
  listProducts: () => api<LicenseProduct[]>("/api/v1/admin/license/products", { token: t() }),
  createProduct: (data: Partial<LicenseProduct>) =>
    api<LicenseProduct>("/api/v1/admin/license/products", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: Partial<LicenseProduct>) =>
    api<LicenseProduct>(`/api/v1/admin/license/products/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: number) =>
    api(`/api/v1/admin/license/products/${id}`, { token: t(), method: "DELETE" }),

  // License - Plans
  listPlans: (productId?: number) =>
    api<LicensePlan[]>(`/api/v1/admin/license/plans${productId ? `?product_id=${productId}` : ""}`, { token: t() }),
  createPlan: (data: Partial<LicensePlan>) =>
    api<LicensePlan>("/api/v1/admin/license/plans", { token: t(), method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: number, data: Partial<LicensePlan>) =>
    api<LicensePlan>(`/api/v1/admin/license/plans/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: number) =>
    api(`/api/v1/admin/license/plans/${id}`, { token: t(), method: "DELETE" }),

  // License - Licenses
  listLicenses: (params = "") =>
    api<{ licenses: License[]; total: number; page: number; page_size: number }>(`/api/v1/admin/license/licenses?${params}`, { token: t() }),
  createLicense: (data: Record<string, unknown>) =>
    api<License>("/api/v1/admin/license/licenses", { token: t(), method: "POST", body: JSON.stringify(data) }),
  createLicenseBatch: (data: Record<string, unknown>) =>
    api<{ count: number; keys: string[] }>("/api/v1/admin/license/licenses/batch", { token: t(), method: "POST", body: JSON.stringify(data) }),
  getLicense: (id: number) =>
    api<License>(`/api/v1/admin/license/licenses/${id}`, { token: t() }),
  updateLicense: (id: number, data: Partial<License>) =>
    api<License>(`/api/v1/admin/license/licenses/${id}`, { token: t(), method: "PUT", body: JSON.stringify(data) }),
  deleteLicense: (id: number) =>
    api(`/api/v1/admin/license/licenses/${id}`, { token: t(), method: "DELETE" }),
  licenseDevices: (id: number) =>
    api<LicenseDevice[]>(`/api/v1/admin/license/licenses/${id}/devices`, { token: t() }),
  licenseLogs: (id: number) =>
    api<LicenseLog[]>(`/api/v1/admin/license/licenses/${id}/logs`, { token: t() }),
  removeDevice: (deviceId: number) =>
    api(`/api/v1/admin/license/devices/${deviceId}`, { token: t(), method: "DELETE" }),
  licenseStats: (productId?: number) =>
    api<LicenseStats>(`/api/v1/admin/license/stats${productId ? `?product_id=${productId}` : ""}`, { token: t() }),

  // Analytics
  analyticsTask: (days = 30) => api<Record<string, unknown>>(`/api/v1/admin/analytics/tasks?days=${days}`, { token: t() }),
  analyticsCredits: (days = 30) => api<Record<string, unknown>>(`/api/v1/admin/analytics/credits?days=${days}`, { token: t() }),
  analyticsRevenue: (days = 30) => api<Record<string, unknown>>(`/api/v1/admin/analytics/revenue?days=${days}`, { token: t() }),

  // Security
  securityOverview: () => api<SecurityOverview>("/api/v1/admin/security/overview", { token: t() }),
  banIp: (ip: string) => api<{ success: boolean; message?: string; error?: string }>("/api/v1/admin/security/ban-ip", { token: t(), method: "POST", body: JSON.stringify({ ip }) }),
  unbanIp: (ip: string, jail = "sshd") => api<{ success: boolean; message?: string; error?: string }>("/api/v1/admin/security/unban-ip", { token: t(), method: "POST", body: JSON.stringify({ ip, jail }) }),
  whitelistAdd: (ip: string, note = "") => api<{ success: boolean; message?: string; error?: string }>("/api/v1/admin/security/whitelist/add", { token: t(), method: "POST", body: JSON.stringify({ ip, note }) }),
  whitelistRemove: (ip: string) => api<{ success: boolean; message?: string; error?: string }>("/api/v1/admin/security/whitelist/remove", { token: t(), method: "POST", body: JSON.stringify({ ip }) }),
};
