"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminApi, DashboardStats } from "@/lib/api";

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
        { title: "Tổng Users", value: stats.total_users, sub: `${stats.active_users} hoạt động` },
        { title: "Jobs", value: stats.total_jobs, sub: `${stats.active_jobs} đang chạy` },
        { title: "Credits Lưu Thông", value: stats.total_credits_circulating.toLocaleString(), sub: "Tổng credit" },
        { title: "Doanh Thu", value: `${(stats.total_revenue / 1000).toFixed(0)}K`, sub: "VND" },
        { title: "Clients Online", value: stats.online_clients, sub: "Kết nối" },
      ]
    : Array(5).fill({ title: "...", value: "--", sub: "" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((c, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
