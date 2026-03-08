"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { adminApi, DashboardStats } from "@/lib/api";

export default function CreditsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<Array<{ username: string; credit_balance: number; total_earned: number; total_spent: number; tier: string }>>([]);

  useEffect(() => {
    adminApi.dashboard().then(setStats);
    adminApi.listUsers("page_size=100").then((d) => {
      const sorted = [...d.users].sort((a, b) => b.credit_balance - a.credit_balance);
      setUsers(sorted);
    });
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Quản lý Credits</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng Credit Lưu Thông</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.total_credits_circulating.toLocaleString() ?? "--"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng Users</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.total_users ?? "--"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Doanh Thu</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats ? `${(stats.total_revenue / 1000).toFixed(0)}K VND` : "--"}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Xếp hạng Credit</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Số dư</TableHead>
                  <TableHead>Đã kiếm</TableHead>
                  <TableHead>Đã chi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => (
                  <TableRow key={u.username}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell><Badge variant="outline">{u.tier}</Badge></TableCell>
                    <TableCell className="font-bold">{u.credit_balance.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+{u.total_earned.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">-{u.total_spent.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
