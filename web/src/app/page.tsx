"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Crown, Eye, EyeOff, User, Mail, Lock, Gift, ArrowRight, Sparkles, Shield, Star,
  Search, MousePointerClick, Globe, TrendingUp, Zap, Target, BarChart3, Link2,
  Download, ChevronDown, CheckCircle, Brain, Fingerprint, Timer, Users, Award,
  ArrowDown, Play, Monitor, Cpu, Bot, Rocket, Heart,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regName, setRegName] = useState("");
  const [refCode, setRefCode] = useState("");

  const authRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const scrollToAuth = () => {
    authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(loginUser, loginPass);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      toast.success("Đăng nhập thành công!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.register({
        username: regUser,
        email: regEmail,
        password: regPass,
        full_name: regName || undefined,
        referral_code: refCode || undefined,
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("show_welcome_bonus", "true");
      toast.success("Đăng ký thành công!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "pl-10 bg-[#0a0a10] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] focus:shadow-[0_0_12px_rgba(212,168,75,0.1)] text-[#f5f0e8] placeholder:text-[#444] transition-all duration-300";

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-[#06060a]" />
      <div className="fixed inset-0" style={{
        backgroundImage: `
          radial-gradient(ellipse at 50% 0%, rgba(212,168,75,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 50%, rgba(212,168,75,0.03) 0%, transparent 40%),
          radial-gradient(ellipse at 20% 80%, rgba(212,168,75,0.02) 0%, transparent 40%)`,
      }} />
      <div className="fixed inset-0 opacity-[0.015]" style={{
        backgroundImage: `linear-gradient(rgba(212,168,75,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,168,75,0.5) 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }} />

      {/* Floating particles */}
      <div className="fixed top-20 left-[10%] w-1 h-1 rounded-full bg-[#d4a84b] animate-sparkle opacity-30" />
      <div className="fixed top-[30%] right-[8%] w-1.5 h-1.5 rounded-full bg-[#f0d78c] animate-sparkle opacity-20" style={{ animationDelay: '1s' }} />
      <div className="fixed top-[60%] left-[5%] w-1 h-1 rounded-full bg-[#d4a84b] animate-sparkle opacity-25" style={{ animationDelay: '2s' }} />
      <div className="fixed bottom-[20%] right-[12%] w-1 h-1 rounded-full bg-[#f0d78c] animate-sparkle opacity-30" style={{ animationDelay: '0.5s' }} />

      {/* Content */}
      <div className="relative z-10">

        {/* ===== STICKY HEADER ===== */}
        <header className="sticky top-0 z-50 glass-dark border-b border-[rgba(212,168,75,0.08)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-lg font-bold gold-text tracking-tight">RealSearch</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={scrollToAuth}
                className="text-xs text-[#8a8999] hover:text-[#d4a84b] transition-colors px-3 py-1.5 rounded-lg hover:bg-[rgba(212,168,75,0.05)]"
              >
                Đăng nhập
              </button>
              <button
                onClick={scrollToAuth}
                className="text-xs font-semibold text-[#09090d] gold-gradient px-4 py-1.5 rounded-lg hover:opacity-90 transition-all"
              >
                Đăng ký miễn phí
              </button>
            </div>
          </div>
        </header>

        {/* ===== HERO SECTION ===== */}
        <section className="pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-gold mb-8 animate-fade-up">
              <Bot className="w-4 h-4 text-[#d4a84b]" />
              <span className="text-xs font-semibold text-[#d4a84b] uppercase tracking-wider">AI-Powered SEO Automation</span>
              <Sparkles className="w-3.5 h-3.5 text-[#f0d78c]" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#f5f0e8] leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              Tăng traffic website{" "}
              <span className="gold-shimmer">gấp 10 lần</span>
              <br className="hidden sm:block" />
              {" "}bằng công nghệ AI
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[#8a8999] max-w-2xl mx-auto mb-4 animate-fade-up leading-relaxed" style={{ animationDelay: '0.15s' }}>
              Hệ thống mô phỏng hành vi người dùng thật <span className="text-[#f5f0e8] font-medium">99% chính xác</span> &mdash;
              tự động view link, search keyword trên Google, click kết quả, tương tác mạng xã hội.
              <span className="text-[#d4a84b] font-semibold"> Hoàn toàn miễn phí.</span>
            </p>

            <p className="text-sm text-[#555] max-w-xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              Đã có <span className="text-[#d4a84b]">1,000+</span> người dùng tin tưởng &middot; Xử lý <span className="text-[#d4a84b]">50,000+</span> lượt view mỗi ngày
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: '0.25s' }}>
              <button
                onClick={scrollToAuth}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl gold-gradient text-[#09090d] font-bold text-base hover:opacity-90 transition-all gold-glow btn-gold-hover"
              >
                <Rocket className="w-5 h-5" />
                Đăng ký miễn phí ngay
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#how-it-works"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[rgba(212,168,75,0.15)] text-[#8a8999] hover:text-[#d4a84b] hover:border-[rgba(212,168,75,0.3)] transition-all text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Tìm hiểu cách hoạt động
              </a>
            </div>

            {/* Scroll indicator */}
            <div className="mt-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <ChevronDown className="w-5 h-5 text-[#333] mx-auto animate-bounce" />
            </div>
          </div>
        </section>

        {/* ===== PAIN POINTS ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3">Vấn đề thực tế</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Website của bạn đang <span className="text-rose-400">&ldquo;chết&rdquo;</span> vì thiếu traffic?
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: TrendingUp,
                  title: "Traffic thấp, Google bỏ rơi",
                  desc: "Nội dung chất lượng nhưng không ai đọc. Google đánh giá thấp vì ít lượt truy cập, bounce rate cao, session ngắn.",
                  color: "text-rose-400", bg: "bg-rose-500/5", border: "border-rose-500/10",
                },
                {
                  icon: Search,
                  title: "Keyword mãi không lên top",
                  desc: "Viết bài SEO chuẩn nhưng keyword vẫn nằm trang 3-4. Thiếu tín hiệu CTR từ trang tìm kiếm khiến Google không nâng hạng.",
                  color: "text-orange-400", bg: "bg-orange-500/5", border: "border-orange-500/10",
                },
                {
                  icon: Target,
                  title: "Quảng cáo đốt tiền, traffic ảo",
                  desc: "Chi hàng triệu cho Google Ads, Facebook Ads nhưng traffic không bền. Ngừng chạy là mất hết, ROI thấp.",
                  color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10",
                },
                {
                  icon: Globe,
                  title: "Cần traffic tự nhiên, đa dạng",
                  desc: "Google ngày càng thông minh, phát hiện traffic giả dễ dàng. Bạn cần nguồn traffic giống người thật 100% từ nhiều IP khác nhau.",
                  color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10",
                },
              ].map((item, i) => (
                <div key={i} className={`luxury-card rounded-xl p-5 ${item.border} border`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#f5f0e8] mb-1.5">{item.title}</h3>
                      <p className="text-sm text-[#8a8999] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SOLUTION BANNER ===== */}
        <section className="py-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="luxury-card-premium rounded-2xl p-8 sm:p-10 text-center gold-glow border border-[rgba(212,168,75,0.15)]">
              <div className="w-16 h-16 rounded-2xl gold-gradient gold-glow-strong flex items-center justify-center mx-auto mb-6 animate-float">
                <Brain className="w-8 h-8 text-[#09090d]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#f5f0e8] mb-4">
                RealSearch giải quyết <span className="gold-shimmer">tất cả</span>
              </h2>
              <p className="text-[#8a8999] max-w-2xl mx-auto leading-relaxed">
                Công nghệ <span className="text-[#d4a84b] font-semibold">AI hành vi</span> mô phỏng chính xác cách người thật lướt web:
                di chuột theo đường cong Bezier, cuộn trang tự nhiên, gõ phím với tốc độ khác nhau, click ngẫu nhiên,
                đọc nội dung, tương tác link nội bộ. <span className="text-[#f5f0e8] font-medium">Không bot, không script đơn giản &mdash; đây là AI thật sự.</span>
              </p>
            </div>
          </div>
        </section>

        {/* ===== AI TECHNOLOGY ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3 flex items-center justify-center gap-2">
                <Brain className="w-4 h-4" /> Công nghệ AI
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Hành vi <span className="gold-text">99% như người thật</span>
              </h2>
              <p className="text-[#8a8999] mt-3 max-w-xl mx-auto">Mọi thao tác đều được AI mô phỏng từ dữ liệu hành vi thực tế của hàng triệu người dùng</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Fingerprint,
                  title: "Browser Fingerprint",
                  desc: "Mỗi phiên truy cập có fingerprint riêng: User-Agent, viewport, timezone, WebGL, GPU &mdash; giống hệt trình duyệt thật",
                  color: "text-[#d4a84b]", bg: "gold-gradient", iconColor: "text-[#09090d]",
                },
                {
                  icon: MousePointerClick,
                  title: "Chuột Bezier Curve",
                  desc: "Di chuột theo đường cong tự nhiên, tốc độ thay đổi, overshoot ngẫu nhiên &mdash; không có bot nào làm được",
                  color: "text-emerald-400", bg: "bg-emerald-500/10", iconColor: "text-emerald-400",
                },
                {
                  icon: Cpu,
                  title: "Gõ phím như người",
                  desc: "80-250ms giữa mỗi phím, dừng lâu hơn sau dấu cách, 3% tỉ lệ gõ sai rồi sửa lại &mdash; y hệt người thật",
                  color: "text-blue-400", bg: "bg-blue-500/10", iconColor: "text-blue-400",
                },
                {
                  icon: Timer,
                  title: "Thời gian ngẫu nhiên",
                  desc: "Thời gian trên trang phân bố Gaussian, delay giữa hành động không cố định &mdash; không session nào giống nhau",
                  color: "text-purple-400", bg: "bg-purple-500/10", iconColor: "text-purple-400",
                },
                {
                  icon: Eye,
                  title: "Cuộn & Đọc tự nhiên",
                  desc: "35% cuộn trang, 30% dừng đọc, 15% di chuột, 20% nghỉ. Scroll depth 60-85%, không cuộn thẳng xuống cuối",
                  color: "text-cyan-400", bg: "bg-cyan-500/10", iconColor: "text-cyan-400",
                },
                {
                  icon: Shield,
                  title: "Anti-Detection",
                  desc: "Vượt qua mọi hệ thống phát hiện bot: Cloudflare, DataDome, PerimeterX. Stealth scripts che giấu hoàn toàn",
                  color: "text-orange-400", bg: "bg-orange-500/10", iconColor: "text-orange-400",
                },
              ].map((item, i) => (
                <div key={i} className="luxury-card rounded-xl p-5 group">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-[#f5f0e8] mb-2">{item.title}</h3>
                  <p className="text-xs text-[#8a8999] leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES - WHAT IT DOES ===== */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3">Tính năng</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Tự động <span className="gold-text">mọi thứ</span>, bạn chỉ cần ngồi chờ
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: Eye,
                  title: "Auto View Link",
                  desc: "Tự động truy cập website, cuộn trang, đọc nội dung, click link nội bộ. Tăng pageview, giảm bounce rate, tăng session duration cho Google Analytics.",
                  tags: ["Tăng Pageview", "Giảm Bounce Rate", "Session Duration"],
                  color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.06)]", border: "border-[rgba(212,168,75,0.12)]",
                },
                {
                  icon: Search,
                  title: "Auto Search & Click (SEO)",
                  desc: "Tìm kiếm keyword trên Google, cuộn qua kết quả, tìm và click vào website của bạn. Tăng CTR tự nhiên, Google nâng hạng keyword lên top.",
                  tags: ["Keyword Ranking", "CTR Boost", "Google Top"],
                  color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10",
                },
                {
                  icon: Globe,
                  title: "Social Media Views",
                  desc: "Tự động xem video YouTube, TikTok, tương tác Facebook. Tăng lượt xem, watch time, engagement cho content của bạn trên mạng xã hội.",
                  tags: ["YouTube Views", "TikTok Views", "Engagement"],
                  color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10",
                },
                {
                  icon: Link2,
                  title: "Auto Backlink",
                  desc: "Tự động đăng ký directory, forum, comment với anchor text tùy chỉnh. Xây dựng hồ sơ backlink tự nhiên, tăng Domain Authority.",
                  tags: ["Directory Submit", "Forum Post", "DA Boost"],
                  color: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/10",
                },
              ].map((feat, i) => (
                <div key={i} className={`luxury-card rounded-xl p-6 border ${feat.border}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center`}>
                      <feat.icon className={`w-5 h-5 ${feat.color}`} />
                    </div>
                    <h3 className="font-bold text-[#f5f0e8] text-lg">{feat.title}</h3>
                  </div>
                  <p className="text-sm text-[#8a8999] leading-relaxed mb-4">{feat.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {feat.tags.map((tag, j) => (
                      <span key={j} className={`text-[10px] px-2.5 py-1 rounded-full ${feat.bg} border ${feat.border} ${feat.color} font-semibold uppercase tracking-wider`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3">Cách hoạt động</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Bắt đầu trong <span className="gold-text">30 giây</span>
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Đăng ký tài khoản miễn phí",
                  desc: "Chỉ cần username, email, mật khẩu. Không cần thẻ tín dụng, không ẩn phí. Tài khoản miễn phí đã bao gồm quyền sử dụng đầy đủ.",
                  icon: User,
                },
                {
                  step: "02",
                  title: "Tải & cài đặt RealSearch Client",
                  desc: "Tải file .exe (~50MB), chạy là dùng. App tự cài vào máy, tạo shortcut Desktop. Đăng nhập bằng tài khoản vừa tạo.",
                  icon: Download,
                },
                {
                  step: "03",
                  title: "Bấm \"Bắt đầu\" \u2014 Xong!",
                  desc: "App chạy nền, tự động kết nối server, nhận và thực hiện task. Bạn kiếm credit mỗi khi hoàn thành task. Hoàn toàn không ảnh hưởng công việc.",
                  icon: Play,
                },
                {
                  step: "04",
                  title: "Dùng credit để tăng traffic website",
                  desc: "Tạo job trên web: thêm link, keyword, chọn thời gian. Hệ thống tự phân phối cho hàng trăm client khác thực hiện cho bạn. Traffic tự nhiên, đa dạng IP.",
                  icon: Rocket,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 rounded-2xl gold-gradient gold-glow-subtle flex items-center justify-center group-hover:gold-glow transition-all">
                      <item.icon className="w-6 h-6 text-[#09090d]" />
                    </div>
                    {i < 3 && <div className="w-px h-6 bg-[rgba(212,168,75,0.15)] mt-2" />}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] font-bold text-[#d4a84b] uppercase tracking-wider bg-[rgba(212,168,75,0.08)] px-2 py-0.5 rounded">{item.step}</span>
                      <h3 className="font-bold text-[#f5f0e8] text-lg">{item.title}</h3>
                    </div>
                    <p className="text-sm text-[#8a8999] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== EXCHANGE MODEL ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3">Mô hình Exchange</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Nhận traffic <span className="gold-text">không mất tiền</span>
              </h2>
              <p className="text-[#8a8999] mt-3 max-w-xl mx-auto">
                Bạn chạy app giúp người khác view &rarr; Kiếm credit &rarr; Dùng credit để người khác view cho bạn. Vòng lặp hoàn hảo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Zap,
                  title: "Kiếm Credit",
                  desc: "Bật app, nhận task tự động. Mỗi lần view link kiếm 1 credit, search keyword kiếm 3 credit. VIP kiếm gấp 2x.",
                  highlight: "+1 ~ +6 credit/task",
                  color: "text-emerald-400", bg: "bg-emerald-500/10",
                },
                {
                  icon: BarChart3,
                  title: "Tạo Job",
                  desc: "Thêm link website, keyword SEO, video YouTube. Cấu hình thời gian, hành vi, số lượt. Credit tự động trừ khi có người thực hiện.",
                  highlight: "Tùy chỉnh mọi thứ",
                  color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.1)]",
                },
                {
                  icon: TrendingUp,
                  title: "Nhận Traffic",
                  desc: "Hàng trăm máy tính từ nhiều IP, vùng miền khác nhau truy cập website của bạn. Traffic tự nhiên, Google đánh giá cao.",
                  highlight: "Traffic thật, đa dạng IP",
                  color: "text-blue-400", bg: "bg-blue-500/10",
                },
              ].map((item, i) => (
                <div key={i} className="luxury-card rounded-xl p-6 text-center group">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-[#f5f0e8] text-lg mb-2">{item.title}</h3>
                  <p className="text-xs text-[#8a8999] leading-relaxed mb-3">{item.desc}</p>
                  <span className={`inline-flex text-[10px] font-bold ${item.color} uppercase tracking-wider ${item.bg} px-3 py-1 rounded-full`}>
                    {item.highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TIERS ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-[0.2em] mb-3">Cấp bậc VIP</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8]">
                Bắt đầu <span className="gold-text">miễn phí</span>, nâng cấp khi cần
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  tier: "Bronze", price: "Miễn phí", color: "text-amber-600", border: "border-amber-900/20",
                  icon: Shield, features: ["50 credit/ngày", "3 jobs", "1 client", "View Link"],
                },
                {
                  tier: "Silver", price: "99K/tháng", color: "text-gray-300", border: "border-gray-600/20",
                  icon: Award, features: ["200 credit/ngày", "10 jobs", "2 clients", "+ Keyword SEO"],
                },
                {
                  tier: "Gold", price: "249K/tháng", color: "text-[#d4a84b]", border: "border-[rgba(212,168,75,0.2)]",
                  icon: Crown, popular: true, features: ["500 credit/ngày", "30 jobs", "3 clients", "+ Backlink & Social", "Credit x1.5"],
                },
                {
                  tier: "Diamond", price: "499K/tháng", color: "text-cyan-300", border: "border-cyan-700/20",
                  icon: Star, features: ["Không giới hạn", "100 jobs", "5 clients", "Tất cả tính năng", "Credit x2.0"],
                },
              ].map((item, i) => (
                <div key={i} className={`luxury-card rounded-xl p-5 border ${item.border} relative ${item.popular ? 'gold-glow' : ''}`}>
                  {item.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full gold-gradient text-[10px] font-bold text-[#09090d] uppercase tracking-wider">
                      Phổ biến nhất
                    </div>
                  )}
                  <div className="text-center mb-4 pt-2">
                    <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-2`} />
                    <h3 className={`font-bold text-lg ${item.color}`}>{item.tier}</h3>
                    <p className="text-xl font-extrabold text-[#f5f0e8] mt-1">{item.price}</p>
                  </div>
                  <div className="space-y-2">
                    {item.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs text-[#8a8999]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== AUTH SECTION (GIỮA TRANG) ===== */}
        <section className="py-20 px-4 sm:px-6" ref={authRef}>
          <div className="max-w-[440px] mx-auto">
            {/* Heading */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="gold-glow-strong rounded-2xl mb-5 mx-auto flex items-center justify-center" style={{ width: 72, height: 72 }}>
                  <Logo size={64} />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#f5f0e8]">
                Sẵn sàng nhận <span className="gold-shimmer">traffic khủng</span>?
              </h2>
              <p className="text-[#8a8999] mt-2">Đăng ký miễn phí, bắt đầu kiếm credit ngay hôm nay</p>
              <div className="ornament-line mt-4 max-w-xs mx-auto" />
            </div>

            {/* Auth Card */}
            <div className="luxury-card-premium rounded-2xl gold-glow overflow-hidden">
              <div className="h-0.5 gold-gradient" />

              <Tabs defaultValue="register">
                <div className="px-6 pt-6 pb-2">
                  <TabsList className="grid w-full grid-cols-2 bg-[#0a0a10] border border-[rgba(212,168,75,0.08)] p-1 rounded-xl">
                    <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-[rgba(212,168,75,0.12)] data-[state=active]:text-[#d4a84b] data-[state=active]:shadow-none text-[#8a8999] text-sm font-semibold transition-all">
                      Đăng ký
                    </TabsTrigger>
                    <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-[rgba(212,168,75,0.12)] data-[state=active]:text-[#d4a84b] data-[state=active]:shadow-none text-[#8a8999] text-sm font-semibold transition-all">
                      Đăng nhập
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="px-6 pb-6">
                  <TabsContent value="login" className="mt-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Username hoặc Email</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="username" className={inputClass} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mật khẩu</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input type={showPass ? "text" : "password"} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" className={`${inputClass} pr-10`} required />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#d4a84b] transition-colors">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all h-11 btn-gold-hover text-sm tracking-wide" disabled={loading}>
                        {loading ? <div className="w-5 h-5 border-2 border-[#09090d] border-t-transparent rounded-full animate-spin" /> : <>Đăng nhập <ArrowRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="mt-4">
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Username</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input value={regUser} onChange={(e) => setRegUser(e.target.value)} placeholder="username" className={inputClass} required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="email@example.com" className={inputClass} required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Họ tên</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Nguyễn Văn A" className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mật khẩu</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input type={showRegPass ? "text" : "password"} value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;" className={`${inputClass} pr-10`} required />
                          <button type="button" onClick={() => setShowRegPass(!showRegPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#d4a84b] transition-colors">
                            {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8a8999] text-xs uppercase tracking-widest font-semibold">Mã giới thiệu <span className="text-[#333]">(không bắt buộc)</span></Label>
                        <div className="relative group">
                          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-[#d4a84b] transition-colors" />
                          <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="ABC12345" className={inputClass} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all h-11 btn-gold-hover text-sm tracking-wide" disabled={loading}>
                        {loading ? <div className="w-5 h-5 border-2 border-[#09090d] border-t-transparent rounded-full animate-spin" /> : <>Tạo tài khoản miễn phí <ArrowRight className="w-4 h-4 ml-2" /></>}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Shield className="w-3 h-3 text-[#d4a84b]" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Bảo mật</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Miễn phí</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Heart className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">1,000+ Users</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#f5f0e8] mb-4">
              Đừng để website chìm trong bóng tối
            </h2>
            <p className="text-[#8a8999] mb-8 max-w-xl mx-auto">
              Mỗi ngày không có traffic là một ngày Google quên mất website của bạn tồn tại.
              Bắt đầu ngay &mdash; hoàn toàn miễn phí.
            </p>
            <button
              onClick={scrollToAuth}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl gold-gradient text-[#09090d] font-bold text-base hover:opacity-90 transition-all gold-glow btn-gold-hover"
            >
              <Rocket className="w-5 h-5" />
              Bắt đầu miễn phí ngay
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="py-8 px-4 sm:px-6 border-t border-[rgba(212,168,75,0.06)]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size={20} />
              <span className="text-sm font-bold gold-text">RealSearch</span>
            </div>
            <p className="text-[10px] text-[#333] uppercase tracking-widest">
              &copy; 2024 RealSearch &middot; AI-Powered SEO & Traffic Exchange Platform
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
