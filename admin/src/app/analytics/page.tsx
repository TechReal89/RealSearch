"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api";

interface TaskTotals {
  total: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_time_seconds: number;
}

interface DailyTask {
  date: string;
  completed: number;
  failed: number;
}

interface JobTypeStat {
  job_type: string;
  total: number;
  completed: number;
  success_rate: number;
  avg_time_seconds: number;
}

interface DailyCredit {
  date: string;
  earned: number;
  spent: number;
}

interface TopEarner {
  user_id: number;
  username: string;
  tier: string;
  total_earned: number;
}

interface CreditByType {
  type: string;
  total: number;
  count: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
  count: number;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState("30");
  const [taskData, setTaskData] = useState<{ totals: TaskTotals; daily: DailyTask[]; by_job_type: JobTypeStat[] } | null>(null);
  const [creditData, setCreditData] = useState<{ daily: DailyCredit[]; top_earners: TopEarner[]; by_type: CreditByType[] } | null>(null);
  const [revenueData, setRevenueData] = useState<{ total_revenue: number; total_transactions: number; daily: DailyRevenue[]; by_channel: ChannelRevenue[] } | null>(null);

  const load = async () => {
    const d = parseInt(days);
    try {
      const [t, c, r] = await Promise.all([
        adminApi.analyticsTask(d),
        adminApi.analyticsCredits(d),
        adminApi.analyticsRevenue(d),
      ]);
      setTaskData(t as any);
      setCreditData(c as any);
      setRevenueData(r as any);
    } catch (e) {
      console.error("Analytics load error:", e);
    }
  };

  useEffect(() => { load(); }, [days]);

  const tierColor: Record<string, string> = {
    bronze: "text-orange-600",
    silver: "text-gray-400",
    gold: "text-yellow-500",
    diamond: "text-cyan-400",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Thống kê & Phân tích</h2>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="14">14 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="60">60 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng Tasks</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{taskData?.totals?.total?.toLocaleString() || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Thành công</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{taskData?.totals?.success_rate || 0}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Thời gian TB</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{taskData?.totals?.avg_time_seconds?.toFixed(0) || 0}s</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Doanh thu</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-500">{(revenueData?.total_revenue || 0).toLocaleString()}đ</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Giao dịch</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{revenueData?.total_transactions || 0}</div></CardContent>
          </Card>
        </div>

        {/* Tasks by Job Type */}
        <Card>
          <CardHeader><CardTitle>Hiệu suất theo loại Job</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại Job</TableHead>
                  <TableHead>Tổng Tasks</TableHead>
                  <TableHead>Hoàn thành</TableHead>
                  <TableHead>Tỷ lệ thành công</TableHead>
                  <TableHead>Thời gian TB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(taskData?.by_job_type || []).map((jt) => (
                  <TableRow key={jt.job_type}>
                    <TableCell><Badge variant="outline">{jt.job_type}</Badge></TableCell>
                    <TableCell>{jt.total.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">{jt.completed.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={jt.success_rate >= 90 ? "text-green-600" : jt.success_rate >= 70 ? "text-yellow-600" : "text-red-600"}>
                        {jt.success_rate}%
                      </span>
                    </TableCell>
                    <TableCell>{jt.avg_time_seconds.toFixed(0)}s</TableCell>
                  </TableRow>
                ))}
                {(taskData?.by_job_type || []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Chưa có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Earners */}
          <Card>
            <CardHeader><CardTitle>Top Người kiếm Credit</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Cấp bậc</TableHead>
                    <TableHead>Credit kiếm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(creditData?.top_earners || []).map((u, i) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-bold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell><span className={tierColor[u.tier] || ""}>{u.tier}</span></TableCell>
                      <TableCell className="text-green-600 font-semibold">{u.total_earned.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(creditData?.top_earners || []).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Chưa có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Revenue by Channel */}
          <Card>
            <CardHeader><CardTitle>Doanh thu theo kênh</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kênh thanh toán</TableHead>
                    <TableHead>Doanh thu</TableHead>
                    <TableHead>Giao dịch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(revenueData?.by_channel || []).map((ch) => (
                    <TableRow key={ch.channel}>
                      <TableCell className="font-medium">{ch.channel}</TableCell>
                      <TableCell className="text-yellow-500 font-semibold">{ch.revenue.toLocaleString()}đ</TableCell>
                      <TableCell>{ch.count}</TableCell>
                    </TableRow>
                  ))}
                  {(revenueData?.by_channel || []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Chưa có dữ liệu</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Credit Flow by Type */}
        <Card>
          <CardHeader><CardTitle>Credit theo loại giao dịch</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tổng Credit</TableHead>
                  <TableHead>Số giao dịch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(creditData?.by_type || []).map((ct) => (
                  <TableRow key={ct.type}>
                    <TableCell><Badge variant="outline">{ct.type}</Badge></TableCell>
                    <TableCell className={ct.total >= 0 ? "text-green-600" : "text-red-600"}>{ct.total.toLocaleString()}</TableCell>
                    <TableCell>{ct.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {(creditData?.by_type || []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Chưa có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Tasks Table */}
        <Card>
          <CardHeader><CardTitle>Tasks theo ngày (gần nhất)</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Hoàn thành</TableHead>
                  <TableHead>Thất bại</TableHead>
                  <TableHead>Tỷ lệ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(taskData?.daily || []).slice().reverse().map((d) => {
                  const total = d.completed + d.failed;
                  const rate = total > 0 ? ((d.completed / total) * 100).toFixed(1) : "-";
                  return (
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell className="text-green-600">{d.completed}</TableCell>
                      <TableCell className="text-red-600">{d.failed}</TableCell>
                      <TableCell>{rate}%</TableCell>
                    </TableRow>
                  );
                })}
                {(taskData?.daily || []).length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Chưa có dữ liệu</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
