"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { creditApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const typeLabels: Record<string, string> = {
  earn_task: "Kiếm từ task",
  spend_job: "Chi cho job",
  purchase: "Mua credit",
  bonus: "Thưởng",
  referral: "Giới thiệu",
  refund: "Hoàn trả",
  admin_adjust: "Admin điều chỉnh",
  promotion: "Khuyến mãi",
};

export default function CreditsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    creditApi.history("page_size=50").then((d) => setHistory(d.transactions || [])).catch(() => {});
  }, []);

  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Credits của tôi</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Số dư hiện tại</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{user?.credit_balance.toLocaleString() || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng đã kiếm</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">+{user?.total_earned.toLocaleString() || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng đã chi</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-600">-{user?.total_spent.toLocaleString() || 0}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Lịch sử giao dịch</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Số dư sau</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có giao dịch nào</TableCell></TableRow>
                )}
                {history.map((t) => (
                  <TableRow key={t.id as number}>
                    <TableCell className="text-sm">{new Date(t.created_at as string).toLocaleString("vi")}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[t.type as string] || t.type as string}</Badge></TableCell>
                    <TableCell className={`font-bold ${(t.amount as number) > 0 ? "text-green-600" : "text-red-600"}`}>
                      {(t.amount as number) > 0 ? "+" : ""}{(t.amount as number).toLocaleString()}
                    </TableCell>
                    <TableCell>{(t.balance_after as number).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.description as string}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
