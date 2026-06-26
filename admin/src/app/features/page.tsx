"use client";

import { useState } from "react";
import {
  Globe, Search, Link2, Youtube, MousePointerClick, Shield, Cpu,
  Zap, Eye, Clock, Fingerprint, MapPin, Monitor, Shuffle, Users,
  CreditCard, BarChart3, ChevronDown, ChevronUp, Bot, Layers,
  Network, Sparkles, ArrowRight,
} from "lucide-react";

/* ──────────────── Types ──────────────── */

type Feature = {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  status: "active" | "beta" | "planned";
  tier: string;
  credit_cost: string;
  credit_earn: string;
  description: string;
  howItWorks: string[];
  techDetails: string[];
};

type SystemFeature = {
  name: string;
  icon: React.ElementType;
  color: string;
  description: string;
  details: string[];
};

/* ──────────────── Data ──────────────── */

const jobFeatures: Feature[] = [
  {
    id: "viewlink",
    name: "ViewLink",
    icon: Globe,
    color: "#3b82f6",
    status: "active",
    tier: "Tất cả (Đồng+)",
    credit_cost: "1 credit/lượt (tối thiểu)",
    credit_earn: "1 credit/lượt × hệ số tier",
    description:
      "Tăng lượt truy cập website. Client mở trang web, duyệt tự nhiên (cuộn, click nội bộ, di chuột), ở lại đủ thời gian để tạo traffic chất lượng.",
    howItWorks: [
      "Server gửi task chứa URL đến client",
      "Client mở browser context mới với fingerprint ngẫu nhiên",
      "Mô phỏng referer tự nhiên (35% Google, 20% Direct, 45% Social/News)",
      "Truy cập trang → cuộn, đọc, di chuột tự nhiên",
      "Click link nội bộ (nếu bật) → duyệt thêm 1-3 trang phụ",
      "Ở lại trang đủ min_time → max_time (30-120s mặc định)",
      "Báo kết quả: pages_visited, scroll_depth, time_spent",
    ],
    techDetails: [
      "Mỗi task = 1 browser context độc lập (cookie, fingerprint riêng)",
      "Hành vi duyệt: cuộn (35%), đọc (30%), di chuột Bezier (15%), nghỉ (20%)",
      "Cuộn tự nhiên: 100-400px/lần, 10% cuộn ngược, dừng ở 80% trang",
      "Click nội bộ: tìm link cùng domain, di chuột Bezier đến link rồi click",
    ],
  },
  {
    id: "keyword_seo",
    name: "Keyword SEO",
    icon: Search,
    color: "#10b981",
    status: "active",
    tier: "Bạc+ (Silver)",
    credit_cost: "20 credit/lượt (tối thiểu)",
    credit_earn: "3 credit/lượt tìm thấy, 1 credit/lượt không tìm thấy",
    description:
      "Tăng thứ hạng từ khóa trên Google. Client search keyword trên Google → tìm website target → click vào → duyệt tự nhiên. Mô phỏng hành vi người dùng thật tìm kiếm.",
    howItWorks: [
      "Client mở Google (google.com hoặc google.com.vn)",
      "Gõ từ khóa tự nhiên: từng ký tự, delay 80-250ms, 3% gõ sai rồi sửa",
      "Nhấn Enter → đợi kết quả",
      "Cuộn qua kết quả trang 1 → tìm link chứa target_domain",
      "Nếu tìm thấy: cuộn đến → click → duyệt trang target 30-90s",
      "Nếu không tìm thấy: lật sang trang tiếp (tối đa 5 trang)",
      "Click link nội bộ trên trang target (nếu bật)",
    ],
    techDetails: [
      "Anti-CAPTCHA: tối đa 4 keyword task/giờ/client",
      "Interleave: sau mỗi keyword task, bắt buộc chạy 2 viewlink trước keyword tiếp",
      "CAPTCHA detected → cooldown 10-20 phút (random) cho client đó",
      "Gõ phím tự nhiên: tốc độ tăng dần, dừng giữa các từ 100-400ms",
    ],
  },
  {
    id: "backlink",
    name: "Backlink",
    icon: Link2,
    color: "#f59e0b",
    status: "active",
    tier: "Vàng+ (Gold)",
    credit_cost: "2 credit/lượt (tối thiểu)",
    credit_earn: "2 credit/lượt × hệ số tier",
    description:
      "Tạo traffic từ backlink. Client mở bài viết/trang chứa backlink → đọc tự nhiên → tìm anchor text → click vào link trỏ về website target → duyệt trang đích.",
    howItWorks: [
      "Server gửi danh sách article_urls (trang chứa backlink)",
      "Client mở từng bài viết, cuộn đọc tự nhiên",
      "Tìm anchor text hoặc link chứa target domain",
      "Click vào backlink → chuyển sang trang đích",
      "Duyệt trang đích tự nhiên (cuộn, đọc, click nội bộ)",
      "Báo kết quả: backlink_clicked, click_method, time_on_site",
    ],
    techDetails: [
      "Tìm link 2 bước: (1) match anchor text, (2) match href domain",
      "Đọc bài viết 15-45s trước khi click backlink (tự nhiên)",
      "Scroll depth riêng cho article page và target page",
      "Hỗ trợ backlink trên directory, forum, blog comment",
    ],
  },
  {
    id: "social_media",
    name: "Social Media",
    icon: Youtube,
    color: "#ef4444",
    status: "active",
    tier: "Vàng+ (Gold)",
    credit_cost: "2 credit/lượt (tối thiểu)",
    credit_earn: "2 credit/lượt × hệ số tier",
    description:
      "Tăng view video YouTube, Facebook, TikTok. Client xem video thực tế với playback monitoring, skip quảng cáo tự động, tương tác tự nhiên. Hỗ trợ click comment backlink.",
    howItWorks: [
      "Client mở video URL trên nền tảng tương ứng",
      "YouTube: đợi video player load → skip quảng cáo → xem video thực tế",
      "Monitor playback: theo dõi currentTime thực tế (không fake)",
      "YouTube Shorts: 30% swipe sang Short tiếp theo",
      "Facebook: cuộn + đọc bài viết tự nhiên",
      "TikTok: xem video đủ thời gian yêu cầu",
      "Comment Backlink (YouTube): sau khi xem, cuộn xuống comment → tìm link → click → duyệt trang đích",
    ],
    techDetails: [
      "YouTube: skip pre-roll ad tự động (nút Skip, countdown)",
      "Playback verification: đọc video.currentTime mỗi 3-5s",
      "Stall detection: nếu currentTime không tăng 3 lần → dừng",
      "Cookie consent: tự động click Accept/Agree/Đồng ý",
      "Comment backlink: cuộn 6 lần (600px/lần) → expand comments → tìm link match domain → click → duyệt trang đích 60-180s (tùy chỉnh, Vàng+)",
    ],
  },
];

const systemFeatures: SystemFeature[] = [
  {
    name: "Chống phát hiện (Anti-Detection)",
    icon: Shield,
    color: "#8b5cf6",
    description: "Hệ thống stealth toàn diện khiến website không thể phân biệt client với người dùng thật.",
    details: [
      "Fingerprint ngẫu nhiên: User-Agent (Chrome 130-135), viewport (8 kích thước), WebGL GPU, phần cứng",
      "Stealth scripts: ẩn navigator.webdriver, giả lập plugins, fix chrome runtime object",
      "Chuột tự nhiên: di chuyển Bezier curve, micro jitter, 15% overshoot",
      "Vị trí giả lập: 20 thành phố VN + jitter ±500m, mỗi context vị trí khác",
      "Referer đa dạng: 35% Google, 20% Direct, 45% Social/News",
      "Ẩn WebDriver: vô hiệu hóa tất cả dấu hiệu tự động hóa",
    ],
  },
  {
    name: "Đa nhiệm vụ (Multi-Task)",
    icon: Layers,
    color: "#06b6d4",
    description: "Client chạy nhiều task song song trong các browser context độc lập. Số lượng theo tier.",
    details: [
      "Đồng (Bronze): 1 task đồng thời (~300MB RAM)",
      "Bạc (Silver): 2 task đồng thời (~600MB RAM)",
      "Vàng (Gold): 3 task đồng thời (~900MB RAM)",
      "Kim Cương (Diamond): 5 task đồng thời (~1.5GB RAM)",
      "Server quyết định max_concurrent theo tier, push xuống client khi auth",
      "Mỗi context có fingerprint, cookie, proxy riêng biệt",
    ],
  },
  {
    name: "Hệ thống ưu tiên (Priority)",
    icon: BarChart3,
    color: "#f59e0b",
    description: "Job được xếp hạng bằng công thức điểm ưu tiên. Tier cao + credit cao = được chạy trước.",
    details: [
      "score = priority × 10 + tier_level × 5 + admin_boost × 8 + credit_per_view × 2",
      "+ (1 - tỷ_lệ_hoàn_thành) × 30 + min(giờ_chờ × 2, 20)",
      "Ví dụ: Diamond priority=8 → score ≈ 180 (rất cao)",
      "Ví dụ: Bronze priority=5 → score ≈ 87 (thấp hơn)",
      "Job lâu không xử lý được boost tự động (staleness bonus)",
      "Admin có thể boost thêm 0-10 điểm cho bất kỳ job nào",
    ],
  },
  {
    name: "Hệ thống Credit",
    icon: CreditCard,
    color: "#10b981",
    description: "Kinh tế tuần hoàn: chạy task kiếm credit → dùng credit tạo job → credit trả cho người chạy.",
    details: [
      "Kiếm: ViewLink 1cr, Keyword SEO 3cr (tìm thấy) / 1cr (miss), Backlink 2cr, Social 2cr",
      "Hệ số tier: Bronze ×1.0, Silver ×1.2, Gold ×1.5, Diamond ×2.0",
      "Chi: trừ khi task completed (không trừ khi fail)",
      "Referral: +50 credit khi người giới thiệu hoàn thành 10 task",
      "Auto-pause job khi chủ hết credit",
      "Mua credit: 4 gói từ 50K-1M VND (SePay + MoMo)",
    ],
  },
  {
    name: "Anti-CAPTCHA",
    icon: Bot,
    color: "#ec4899",
    description: "Bảo vệ đa lớp chống Google CAPTCHA khi chạy Keyword SEO.",
    details: [
      "Rate limiting: tối đa 4 keyword task/giờ/client",
      "Interleaving: sau mỗi keyword, bắt buộc 2 viewlink trước keyword tiếp",
      "CAPTCHA cooldown: phát hiện CAPTCHA → dừng keyword 10-20 phút",
      "Job failure backoff: 3 fail liên tiếp → backoff 5 phút (max 30 phút)",
      "ViewLink vẫn chạy bình thường trong thời gian cooldown",
    ],
  },
  {
    name: "WebSocket Real-time",
    icon: Zap,
    color: "#3b82f6",
    description: "Giao tiếp server-client qua WebSocket, không phải HTTP polling. Phản hồi tức thì.",
    details: [
      "Kết nối persistent: wss://api → auth → heartbeat 30s",
      "Task assign/complete/fail qua WebSocket (< 100ms latency)",
      "Credit update real-time khi task hoàn thành",
      "Broadcast: admin gửi thông báo tới tất cả client",
      "Force update: buộc client cập nhật phiên bản mới",
      "Heartbeat: CPU/RAM usage + active_tasks count",
    ],
  },
  {
    name: "Proxy Pool",
    icon: Network,
    color: "#f97316",
    description: "Quản lý pool proxy tập trung. Mỗi browser context có thể dùng proxy riêng.",
    details: [
      "Hỗ trợ HTTP và SOCKS5 proxy",
      "Proxy được pass vào browser.new_context(proxy=...)",
      "Admin quản lý: thêm/xóa/kiểm tra proxy",
      "Health check: success_rate, avg_response_ms",
      "Yêu cầu tier Vàng+ để sử dụng proxy",
    ],
  },
  {
    name: "Auto-Update Client",
    icon: Sparkles,
    color: "#a855f7",
    description: "Client tự động cập nhật phiên bản mới. Kiểm tra trước khi đăng nhập.",
    details: [
      "Kiểm tra version trên GitHub Releases khi khởi động",
      "Tải .exe mới với splash screen + progress bar",
      "Hoạt động từ v0.3.1+ (tất cả client hiện tại)",
      "Server có thể force_update bắt buộc cập nhật",
      "File cài đặt: %APPDATA%\\RealSearch\\",
    ],
  },
];

/* ──────────────── Components ──────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "Hoạt động" },
    beta: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24", label: "Beta" },
    planned: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "Sắp ra mắt" },
  };
  const s = map[status] || map.planned;
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function FeatureCard({ f }: { f: Feature }) {
  const [open, setOpen] = useState(false);
  const Icon = f.icon;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${f.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: f.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[#f5f0e8] font-semibold">{f.name}</h3>
            <StatusBadge status={f.status} />
          </div>
          <p className="text-xs text-[#8a8999] mt-0.5 line-clamp-1">{f.description}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs text-[#8a8999]">
          <div className="text-right hidden md:block">
            <p className="text-[#c0c0cc]">{f.tier}</p>
            <p>Chi: {f.credit_cost}</p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-[#666]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#666]" />
          )}
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[rgba(255,255,255,0.04)]">
          {/* Info grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
            <InfoBox label="Yêu cầu Tier" value={f.tier} color={f.color} />
            <InfoBox label="Chi phí tạo job" value={f.credit_cost} color="#ef4444" />
            <InfoBox label="Credit kiếm được" value={f.credit_earn} color="#22c55e" />
          </div>

          {/* Description */}
          <p className="text-sm text-[#b0b0bb] leading-relaxed">{f.description}</p>

          {/* How it works */}
          <div>
            <h4 className="text-xs font-semibold text-[#d4a84b] uppercase tracking-wider mb-2">
              Cách hoạt động
            </h4>
            <ol className="space-y-1.5">
              {f.howItWorks.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#9a9aaa]">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ background: `${f.color}20`, color: f.color }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Tech details */}
          <div>
            <h4 className="text-xs font-semibold text-[#8a8999] uppercase tracking-wider mb-2">
              Chi tiết kỹ thuật
            </h4>
            <ul className="space-y-1">
              {f.techDetails.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#777]">
                  <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: f.color }} />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: `${color}08`,
        borderColor: `${color}15`,
      }}
    >
      <p className="text-[10px] uppercase tracking-wider text-[#8a8999] mb-0.5">{label}</p>
      <p className="text-xs font-medium text-[#c0c0cc]">{value}</p>
    </div>
  );
}

function SystemCard({ f }: { f: SystemFeature }) {
  const [open, setOpen] = useState(false);
  const Icon = f.icon;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.015)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${f.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: f.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-[#f5f0e8] font-semibold">{f.name}</h3>
          <p className="text-xs text-[#8a8999] mt-0.5 line-clamp-1">{f.description}</p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#666] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#666] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.04)]">
          <ul className="space-y-1.5 pt-3">
            {f.details.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#9a9aaa]">
                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" style={{ color: f.color }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Comparison Table ──────────────── */

function TierComparisonTable() {
  const tiers = [
    { name: "Đồng", color: "#CD7F32", emoji: "🥉" },
    { name: "Bạc", color: "#C0C0C0", emoji: "🥈" },
    { name: "Vàng", color: "#FFD700", emoji: "🥇" },
    { name: "Kim Cương", color: "#B9F2FF", emoji: "💎" },
  ];

  const rows = [
    { label: "Giá/tháng", values: ["Miễn phí", "99,000đ", "249,000đ", "499,000đ"] },
    { label: "Task song song", values: ["1", "2", "3", "5"] },
    { label: "Hệ số credit", values: ["×1.0", "×1.2", "×1.5", "×2.0"] },
    { label: "Ưu tiên", values: ["1", "3", "6", "10"] },
    { label: "Jobs đồng thời", values: ["3", "10", "30", "100"] },
    { label: "Max clients", values: ["1", "2", "3", "5"] },
    { label: "ViewLink", values: ["✅", "✅", "✅", "✅"] },
    { label: "Keyword SEO", values: ["❌", "✅", "✅", "✅"] },
    { label: "Backlink", values: ["❌", "❌", "✅", "✅"] },
    { label: "Social Media", values: ["❌", "❌", "✅", "✅"] },
    { label: "Proxy", values: ["❌", "❌", "✅", "✅"] },
    { label: "Boost ưu tiên", values: ["❌", "❌", "❌", "✅"] },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.06)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            <th className="text-left p-3 text-[#8a8999] font-medium text-xs">Tính năng</th>
            {tiers.map((t) => (
              <th
                key={t.name}
                className="text-center p-3 font-semibold text-xs"
                style={{ color: t.color }}
              >
                {t.emoji} {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={
                i % 2 === 0
                  ? "bg-[rgba(255,255,255,0.01)]"
                  : "bg-transparent"
              }
            >
              <td className="p-3 text-[#b0b0bb] text-xs font-medium">{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} className="p-3 text-center text-xs text-[#d0d0dd]">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────── Page ──────────────── */

export default function FeaturesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gold-shimmer">Tổng quan tính năng</h1>
        <p className="text-sm text-[#8a8999] mt-1">
          Bảng thống kê đầy đủ các tính năng của RealSearch, cách hoạt động và chi tiết kỹ thuật.
        </p>
      </div>

      {/* Job Types */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-[#d4a84b]" />
          </div>
          <h2 className="text-lg font-semibold text-[#f5f0e8]">Loại công việc (Job Types)</h2>
        </div>
        <div className="space-y-3">
          {jobFeatures.map((f) => (
            <FeatureCard key={f.id} f={f} />
          ))}
        </div>
      </section>

      {/* Tier Comparison */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#d4a84b]" />
          </div>
          <h2 className="text-lg font-semibold text-[#f5f0e8]">So sánh cấp thành viên</h2>
        </div>
        <TierComparisonTable />
      </section>

      {/* System Features */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-[#d4a84b]" />
          </div>
          <h2 className="text-lg font-semibold text-[#f5f0e8]">Tính năng hệ thống</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemFeatures.map((f) => (
            <SystemCard key={f.name} f={f} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Briefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
