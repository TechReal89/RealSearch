"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { useAuth } from "@/hooks/useAuth";
import { userApi, paymentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Crown, Shield, Award, Gem, CheckCircle, X, Copy, Star,
  Sparkles, ArrowRight, Zap, Users, Briefcase, Monitor,
  Search, Link2, Share2, Clock, Target, Loader2, Timer,
} from "lucide-react";

interface TierData {
  id: number;
  name: string;
  display_name: string;
  color: string;
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
}

interface TransferInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
  amount: number;
  content: string;
  note: string;
  qr_url?: string;
}

const tierOrder = ["bronze", "silver", "gold", "diamond"];

const tierIcons: Record<string, typeof Crown> = {
  bronze: Shield,
  silver: Award,
  gold: Crown,
  diamond: Gem,
};

const tierColors: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  bronze: {
    text: "text-amber-600",
    border: "border-amber-700/30",
    bg: "from-amber-950/40 to-amber-900/10",
    glow: "",
  },
  silver: {
    text: "text-gray-300",
    border: "border-gray-500/30",
    bg: "from-gray-800/40 to-gray-700/10",
    glow: "",
  },
  gold: {
    text: "text-[#d4a84b]",
    border: "border-[rgba(212,168,75,0.3)]",
    bg: "from-[rgba(212,168,75,0.15)] to-[rgba(212,168,75,0.03)]",
    glow: "gold-glow",
  },
  diamond: {
    text: "text-cyan-300",
    border: "border-cyan-400/30",
    bg: "from-cyan-900/30 to-cyan-800/10",
    glow: "shadow-[0_0_12px_rgba(103,232,249,0.15)]",
  },
};

const COUNTDOWN_SECONDS = 5 * 60;
const POLL_INTERVAL = 5000;

export default function UpgradePage() {
  const { user, refreshUser } = useAuth();
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [copiedField, setCopiedField] = useState("");
  const [pendingPaymentId, setPendingPaymentId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((paymentId: number) => {
    stopPolling();
    setCountdown(COUNTDOWN_SECONDS);
    setPaymentConfirmed(false);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopPolling();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const payment = await paymentApi.get(paymentId);
        if (payment.status === "completed") {
          stopPolling();
          setPaymentConfirmed(true);
          setPendingPaymentId(null);
          toast.success("Thanh toán thành công! Gói VIP đã được kích hoạt.", {
            duration: 6000,
          });
          if (refreshUser) refreshUser();
          setTimeout(() => {
            setTransferInfo(null);
            setPaymentConfirmed(false);
          }, 5000);
        } else if (payment.status === "failed") {
          stopPolling();
          setPendingPaymentId(null);
          toast.error("Thanh toán thất bại. Vui lòng thử lại.");
        }
      } catch {
        // Ignore polling errors
      }
    }, POLL_INTERVAL);
  }, [stopPolling, refreshUser]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    userApi.tiers().then(setTiers).catch(() => {});
    paymentApi.channels().then((d) => setChannels(d.channels || d || [])).catch(() => {});
  }, []);

  const currentTierIndex = tierOrder.indexOf(user?.tier || "bronze");

  const handleUpgrade = async (tier: TierData) => {
    setLoading(tier.id);
    try {
      const channel = channels.find((c) => c.name === "sepay" && c.is_active) ||
        channels.find((c) => c.name === "bank_transfer" && c.is_active) ||
        channels[0];

      if (!channel) {
        toast.error("Chưa có kênh thanh toán nào được kích hoạt");
        return;
      }

      const amount = isYearly ? tier.price_yearly : tier.price_monthly;
      const duration = isYearly ? 12 : 1;

      const data = await paymentApi.create({
        channel_id: channel.id,
        amount,
        purpose: "buy_tier",
        tier_id: tier.id,
        tier_duration: duration,
      });

      if (data.transfer_info) {
        setTransferInfo(data.transfer_info);
        setPendingPaymentId(data.id);
        startPolling(data.id);
        toast.success("Đã tạo đơn nâng cấp. Vui lòng chuyển khoản theo hướng dẫn.");
      } else {
        toast.success(`Đã tạo đơn nâng cấp #${data.id}. Vui lòng chờ xác nhận.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi tạo đơn nâng cấp");
    } finally {
      setLoading(null);
    }
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
    toast.success("Đã sao chép");
  };

  const getFeatures = (tier: TierData) => {
    const features = [
      { label: `${tier.max_jobs} jobs đồng thời`, icon: Briefcase, enabled: true },
      { label: `${tier.max_clients} clients đồng thời`, icon: Monitor, enabled: true },
      { label: `${tier.daily_credit_limit} credit/ngày`, icon: Target, enabled: true },
      { label: `x${tier.credit_earn_multiplier} hệ số kiếm credit`, icon: Zap, enabled: true },
      { label: "Keyword SEO", icon: Search, enabled: tier.allow_keyword_seo },
      { label: "Backlink", icon: Link2, enabled: tier.allow_backlink },
      { label: "Social Media", icon: Share2, enabled: tier.allow_social_media },
      { label: "Proxy riêng", icon: Shield, enabled: tier.allow_proxy },
      { label: "Ưu tiên task", icon: Star, enabled: tier.allow_priority_boost },
      { label: "Báo cáo chi tiết", icon: Target, enabled: tier.allow_detailed_report },
    ];
    return features;
  };

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <Crown className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Nâng cấp VIP</h2>
            <p className="text-sm text-[#8a8999]">Chọn gói phù hợp để mở khóa tính năng cao cấp</p>
          </div>
        </div>

        <div className="ornament-line" />

        {/* Duration Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-[#d4a84b]" : "text-[#8a8999]"}`}>
            Hàng tháng
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? "gold-gradient" : "bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full transition-all ${
                isYearly
                  ? "right-1 bg-[#09090d]"
                  : "left-1 bg-[#8a8999]"
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isYearly ? "text-[#d4a84b]" : "text-[#8a8999]"}`}>
            Hàng năm
          </span>
          {isYearly && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              Tiết kiệm ~17%
            </span>
          )}
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier, i) => {
            const tierIdx = tierOrder.indexOf(tier.name);
            const isCurrent = user?.tier === tier.name;
            const isUpgradable = tierIdx > currentTierIndex;
            const Icon = tierIcons[tier.name] || Shield;
            const colors = tierColors[tier.name] || tierColors.bronze;
            const price = isYearly ? tier.price_yearly : tier.price_monthly;
            const isHighlighted = tier.name === "gold" || tier.name === "diamond";
            const features = getFeatures(tier);

            return (
              <div
                key={tier.id}
                className={`relative overflow-hidden transition-all duration-500 animate-fade-up rounded-xl ${
                  isCurrent
                    ? `luxury-card-premium ${colors.glow} border-2 ${colors.border}`
                    : isHighlighted
                    ? `luxury-card-premium ${colors.glow}`
                    : "luxury-card"
                }`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="badge-vip text-[10px] px-2.5 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3" />
                      Hiện tại
                    </div>
                  </div>
                )}

                {/* Top gradient bar */}
                <div className={`h-1 bg-gradient-to-r ${colors.bg}`} />

                <div className="p-5">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isHighlighted ? "gold-gradient" : "bg-white/5"
                    }`}>
                      <Icon className={`w-5 h-5 ${isHighlighted ? "text-[#09090d]" : colors.text}`} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${colors.text}`}>
                        {tier.display_name || tier.name}
                      </h3>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider">
                        Ưu tiên cấp {tier.priority_level}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {price > 0 ? (
                      <>
                        <span className={`text-2xl font-bold stat-value ${isHighlighted ? "gold-text" : "text-[#f5f0e8]"}`}>
                          {price.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#8a8999] ml-1">
                          VND / {isYearly ? "năm" : "tháng"}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-emerald-400">Miễn phí</span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-5 border-t border-[rgba(255,255,255,0.04)] pt-4">
                    {features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs">
                        {f.enabled ? (
                          <CheckCircle className="w-3.5 h-3.5 text-[#d4a84b] flex-shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[#333] flex-shrink-0" />
                        )}
                        <span className={f.enabled ? "text-[#ccc]" : "text-[#444] line-through"}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  {isCurrent ? (
                    <Button disabled className="w-full h-10 bg-white/5 text-[#8a8999] cursor-not-allowed">
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Gói hiện tại
                    </Button>
                  ) : isUpgradable ? (
                    <Button
                      onClick={() => handleUpgrade(tier)}
                      disabled={loading === tier.id}
                      className={`w-full font-bold h-10 btn-gold-hover ${
                        isHighlighted
                          ? "gold-gradient text-[#09090d] hover:opacity-90"
                          : "bg-[rgba(212,168,75,0.08)] text-[#d4a84b] hover:bg-[rgba(212,168,75,0.15)] border border-[rgba(212,168,75,0.12)]"
                      }`}
                    >
                      {loading === tier.id ? "Đang xử lý..." : "Nâng cấp"}
                      {loading !== tier.id && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  ) : (
                    <Button disabled className="w-full h-10 bg-white/5 text-[#555] cursor-not-allowed">
                      Gói thấp hơn
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Transfer Info */}
        {transferInfo && (
          <div className={`luxury-card-premium rounded-xl overflow-hidden border ${
            paymentConfirmed
              ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "border-[rgba(212,168,75,0.2)] gold-glow"
          } transition-all duration-500`}>
            <div className={`${paymentConfirmed ? "bg-emerald-500" : "gold-gradient"} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {paymentConfirmed ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Shield className="w-5 h-5 text-[#09090d]" />
                )}
                <h3 className={`font-bold ${paymentConfirmed ? "text-white" : "text-[#09090d]"}`}>
                  {paymentConfirmed ? "Thanh toán thành công!" : "Thông tin chuyển khoản"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {!paymentConfirmed && countdown > 0 && (
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.15)] px-2.5 py-1 rounded-lg">
                    <Timer className="w-3.5 h-3.5 text-[#09090d]" />
                    <span className="text-sm font-mono font-bold text-[#09090d]">
                      {formatCountdown(countdown)}
                    </span>
                  </div>
                )}
                {!paymentConfirmed && pendingPaymentId && countdown > 0 && (
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.15)] px-2.5 py-1 rounded-lg">
                    <Loader2 className="w-3.5 h-3.5 text-[#09090d] animate-spin" />
                    <span className="text-[11px] font-medium text-[#09090d]">Đang chờ...</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setTransferInfo(null);
                    setPendingPaymentId(null);
                    setPaymentConfirmed(false);
                    stopPolling();
                  }}
                  className={`${paymentConfirmed ? "text-white" : "text-[#09090d]"} hover:opacity-70 transition-opacity`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {paymentConfirmed ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Crown className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400 mb-2">Gói VIP đã được kích hoạt!</h3>
                  <p className="text-sm text-[#8a8999]">Tài khoản của bạn đã được nâng cấp thành công.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* QR Code */}
                  {transferInfo.qr_url && (
                    <div className="flex flex-col items-center gap-3 flex-shrink-0">
                      <div className="bg-white rounded-xl p-2">
                        <img
                          src={transferInfo.qr_url}
                          alt="QR Code chuyển khoản"
                          className="w-[200px] h-auto rounded-lg"
                        />
                      </div>
                      <p className="text-[10px] text-[#8a8999] uppercase tracking-wider">Quét mã QR để chuyển khoản</p>
                    </div>
                  )}

                  {/* Transfer details */}
                  <div className="flex-1">
                    <div className="space-y-0">
                      {[
                        { label: "Ngân hàng", value: transferInfo.bank_name, key: "bank" },
                        { label: "Số tài khoản", value: transferInfo.account_number, key: "acc", mono: true },
                        { label: "Chủ tài khoản", value: transferInfo.account_name, key: "name" },
                        { label: "Số tiền", value: `${transferInfo.amount.toLocaleString()} VND`, key: "amount", highlight: true },
                        { label: "Nội dung CK", value: transferInfo.content, key: "content", mono: true, highlight: true },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.03)]">
                          <span className="text-sm text-[#8a8999]">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${item.mono ? "font-mono stat-value" : ""} ${item.highlight ? "text-[#d4a84b]" : "text-[#f5f0e8]"}`}>
                              {item.value}
                            </span>
                            <button
                              onClick={() => copyText(String(item.value).replace(/[,. ]/g, "").replace("VND", ""), item.key)}
                              className="text-[#555] hover:text-[#d4a84b] transition-colors"
                            >
                              {copiedField === item.key ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3.5 rounded-xl glass-gold">
                      {countdown > 0 ? (
                        <div className="flex items-start gap-2">
                          <Loader2 className="w-4 h-4 text-[#d4a84b] animate-spin flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-[#d4a84b] leading-relaxed">
                            Hệ thống đang chờ xác nhận thanh toán. Gói VIP sẽ được kích hoạt tự động ngay khi nhận được chuyển khoản.
                            Thời gian còn lại: <span className="font-bold font-mono">{formatCountdown(countdown)}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#d4a84b] leading-relaxed">
                          Hết thời gian chờ tự động. Nếu bạn đã chuyển khoản, gói VIP sẽ được kích hoạt khi hệ thống xác nhận.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="luxury-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Tại sao nên nâng cấp?</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Ưu tiên task cao hơn",
                desc: "Job của bạn được phân phối nhanh hơn và ưu tiên hơn các gói thấp",
              },
              {
                icon: Star,
                title: "Kiếm credit nhiều hơn",
                desc: "Hệ số nhân credit cao hơn, kiếm được nhiều credit hơn mỗi task",
              },
              {
                icon: Crown,
                title: "Tính năng nâng cao",
                desc: "Mở khóa Keyword SEO, Backlink, Social Media và nhiều tính năng khác",
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-5 h-5 text-[#09090d]" />
                </div>
                <h4 className="text-sm font-semibold text-[#f5f0e8] mb-1">{item.title}</h4>
                <p className="text-xs text-[#8a8999] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
