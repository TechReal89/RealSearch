"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { userApi, jobApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Coins, TrendingUp, TrendingDown, Crown, Briefcase, Target, Zap, ArrowRight,
  Gem, Shield, Award, Sparkles, Star,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    userApi.stats().then(setStats).catch(() => {});
    jobApi.list("page_size=5").then((d) => setJobs(d.jobs || [])).catch(() => {});
  }, []);

  const tierConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Crown; desc: string }> = {
    bronze: { label: "Bronze", color: "text-amber-600", bg: "from-amber-900/20 to-amber-800/5", icon: Shield, desc: "Miễn phí" },
    silver: { label: "Silver", color: "text-gray-300", bg: "from-gray-600/20 to-gray-700/5", icon: Award, desc: "99K/tháng" },
    gold: { label: "Gold", color: "text-[#d4a84b]", bg: "from-[rgba(212,168,75,0.15)] to-[rgba(212,168,75,0.03)]", icon: Crown, desc: "249K/tháng" },
    diamond: { label: "Diamond", color: "text-cyan-300", bg: "from-cyan-700/20 to-cyan-800/5", icon: Gem, desc: "499K/tháng" },
  };

  const tier = tierConfig[user?.tier || "bronze"] || tierConfig.bronze;
  const TierIcon = tier.icon;

  const statCards = [
    {
      label: "Số dư Credit",
      value: user?.credit_balance.toLocaleString() || "0",
      icon: Coins,
      color: "text-[#d4a84b]",
      gradient: "from-[rgba(212,168,75,0.12)] to-transparent",
      iconBg: "gold-gradient",
      iconColor: "text-[#09090d]",
    },
    {
      label: "Tổng đã kiếm",
      value: `+${user?.total_earned.toLocaleString() || "0"}`,
      icon: TrendingUp,
      color: "text-emerald-400",
      gradient: "from-emerald-900/15 to-transparent",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      label: "Tổng đã chi",
      value: `-${user?.total_spent.toLocaleString() || "0"}`,
      icon: TrendingDown,
      color: "text-rose-400",
      gradient: "from-rose-900/15 to-transparent",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
    },
    {
      label: "Cấp bậc VIP",
      value: tier.label,
      icon: TierIcon,
      color: tier.color,
      gradient: tier.bg,
      iconBg: user?.tier === "gold" ? "gold-gradient" : "bg-[rgba(255,255,255,0.05)]",
      iconColor: user?.tier === "gold" ? "text-[#09090d]" : tier.color,
      extra: tier.desc,
    },
  ];

  const statusConfig: Record<string, { label: string; dot: string }> = {
    draft: { label: "Nháp", dot: "bg-gray-400" },
    active: { label: "Đang chạy", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" },
    paused: { label: "Tạm dừng", dot: "bg-yellow-400" },
    completed: { label: "Hoàn thành", dot: "bg-blue-400" },
    cancelled: { label: "Đã huỷ", dot: "bg-red-400" },
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">
              Xin chào, <span className="gold-text">{user?.full_name || user?.username}</span>
            </h2>
            <p className="text-[#8a8999] text-sm mt-1 flex items-center gap-1.5">
              <Star className="w-3 h-3 text-[#d4a84b]" />
              Chào mừng trở lại với RealSearch
            </p>
          </div>
          <Link
            href="/jobs"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl gold-gradient text-[#09090d] text-sm font-bold hover:opacity-90 transition-all btn-gold-hover gold-glow-subtle"
          >
            <Zap className="w-4 h-4" />
            Tạo công việc
          </Link>
        </div>

        {/* Ornament line */}
        <div className="ornament-line" />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="luxury-card rounded-xl p-4 bg-gradient-to-br animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
                <div className={`text-2xl lg:text-3xl font-bold ${card.color} stat-value`}>
                  {card.value}
                </div>
                {card.extra && (
                  <p className="text-[10px] text-[#8a8999] mt-1 uppercase tracking-wider">{card.extra}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/payments", label: "Nạp Credit", icon: Coins, desc: "Mua thêm credit", accent: "group-hover:text-[#d4a84b]" },
            { href: "/jobs", label: "Tạo Job", icon: Briefcase, desc: "Tăng traffic", accent: "group-hover:text-emerald-400" },
            { href: "/packages", label: "Gói VIP", icon: Crown, desc: "Nâng cấp tier", accent: "group-hover:text-[#f0d78c]" },
            { href: "/download", label: "Kiếm Credit", icon: Target, desc: "Tải app client", accent: "group-hover:text-blue-400" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="luxury-card rounded-xl p-4 group"
              >
                <div className="w-9 h-9 rounded-lg bg-[rgba(212,168,75,0.06)] border border-[rgba(212,168,75,0.1)] flex items-center justify-center mb-3 group-hover:border-[rgba(212,168,75,0.25)] transition-all">
                  <Icon className={`w-4.5 h-4.5 text-[#8a8999] transition-colors ${action.accent}`} />
                </div>
                <p className="text-sm font-semibold text-[#f5f0e8]">{action.label}</p>
                <p className="text-xs text-[#666] mt-0.5">{action.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Jobs */}
        <div className="luxury-card rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(212,168,75,0.08)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[rgba(212,168,75,0.08)] flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-[#d4a84b]" />
              </div>
              <h3 className="font-semibold text-[#f5f0e8] text-sm">Công việc gần đây</h3>
            </div>
            <Link href="/jobs" className="text-xs text-[#d4a84b] hover:text-[#f0d78c] flex items-center gap-1 font-medium transition-colors">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 px-5">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.08)] flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-6 h-6 text-[#333]" />
              </div>
              <p className="text-[#8a8999] text-sm font-medium">Chưa có công việc nào</p>
              <Link href="/jobs" className="inline-flex items-center gap-1.5 mt-3 text-[#d4a84b] text-sm font-semibold hover:text-[#f0d78c] transition-colors">
                Tạo công việc đầu tiên <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.03)]">
              {jobs.map((j) => {
                const pct = Math.min(((j.completed_count as number) / Math.max(j.target_count as number, 1)) * 100, 100);
                const st = statusConfig[(j.status as string)] || statusConfig.draft;
                return (
                  <div key={j.id as number} className="flex items-center justify-between px-5 py-3.5 hover:bg-[rgba(212,168,75,0.02)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full ${st.dot} shrink-0`} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#f5f0e8] truncate">{j.title as string}</p>
                        <p className="text-xs text-[#666]">{j.job_type as string} &middot; {st.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 bg-[#16161f] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full progress-gold transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[#8a8999] font-mono w-16 text-right stat-value">
                        {j.completed_count as number}/{j.target_count as number}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
