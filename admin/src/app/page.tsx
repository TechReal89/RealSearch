"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { adminApi, DashboardStats } from "@/lib/api";
import { Users, Briefcase, Coins, TrendingUp, Monitor } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    adminApi.dashboard().then(setStats).catch(console.error);
    const interval = setInterval(() => {
      adminApi.dashboard().then(setStats).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const cards = stats
    ? [
        { title: "Tổng Users", value: stats.total_users, sub: `${stats.active_users} hoạt động`, icon: Users, color: "text-blue-400", iconBg: "bg-blue-500/10" },
        { title: "Jobs", value: stats.total_jobs, sub: `${stats.active_jobs} đang chạy`, icon: Briefcase, color: "text-emerald-400", iconBg: "bg-emerald-500/10" },
        { title: "Credits Lưu Thông", value: stats.total_credits_circulating.toLocaleString(), sub: "Tổng credit", icon: Coins, color: "text-[#d4a84b]", iconBg: "bg-[rgba(212,168,75,0.1)]" },
        { title: "Doanh Thu", value: `${(stats.total_revenue / 1000).toFixed(0)}K`, sub: "VND", icon: TrendingUp, color: "text-purple-400", iconBg: "bg-purple-500/10" },
        { title: "Clients Online", value: stats.online_clients, sub: "Kết nối", icon: Monitor, color: "text-cyan-400", iconBg: "bg-cyan-500/10" },
      ]
    : Array(5).fill(null);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#f5f0e8]">Dashboard</h2>
          <p className="text-sm text-[#8a8999] mt-1">Tổng quan hệ thống RealSearch</p>
        </div>

        <div className="ornament-line" />

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((c, i) => (
            <div key={i} className="luxury-card rounded-xl p-4">
              {c ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">{c.title}</span>
                    <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center`}>
                      <c.icon className={`w-4 h-4 ${c.color}`} />
                    </div>
                  </div>
                  <div className={`text-3xl font-bold stat-value ${c.color}`}>{c.value}</div>
                  <p className="text-[10px] text-[#8a8999] mt-1 uppercase tracking-wider">{c.sub}</p>
                </>
              ) : (
                <>
                  <div className="h-4 w-20 bg-[rgba(255,255,255,0.04)] rounded mb-4 animate-pulse" />
                  <div className="h-8 w-16 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
