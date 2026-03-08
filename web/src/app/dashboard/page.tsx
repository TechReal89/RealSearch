"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userApi, jobApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    userApi.stats().then(setStats).catch(() => {});
    jobApi.list("page_size=5").then((d) => setJobs(d.jobs || [])).catch(() => {});
  }, []);

  const tierLabels: Record<string, string> = {
    bronze: "Cấp Đồng",
    silver: "Cấp Bạc",
    gold: "Cấp Vàng",
    diamond: "Cấp Kim Cương",
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Xin chào, {user?.full_name || user?.username}!</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Số dư Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {user?.credit_balance.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Đã kiếm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {user?.total_earned.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Đã chi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {user?.total_spent.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Cấp bậc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tierLabels[user?.tier || "bronze"] || user?.tier}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Công việc gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Chưa có công việc nào. Tạo công việc đầu tiên để bắt đầu!
              </p>
            ) : (
              <div className="space-y-3">
                {jobs.map((j: Record<string, unknown>) => (
                  <div key={j.id as number} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{j.title as string}</p>
                      <p className="text-sm text-muted-foreground">{j.job_type as string}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{j.completed_count as number}/{j.target_count as number}</p>
                      <p className="text-xs text-muted-foreground">{j.status as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
