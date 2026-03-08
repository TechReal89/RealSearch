"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, Payment } from "@/lib/api";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total_revenue: number; total_payments: number; pending_payments: number } | null>(null);

  const load = () => {
    adminApi.listPayments("page_size=50").then((d) => { setPayments(d.payments); setTotal(d.total); });
    adminApi.paymentStats().then(setStats);
  };

  useEffect(() => { load(); }, []);

  const handleConfirm = async (id: number) => {
    try { await adminApi.confirmPayment(id); toast.success("Đã xác nhận thanh toán"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleRefund = async (id: number) => {
    try { await adminApi.refundPayment(id); toast.success("Đã hoàn tiền"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Quản lý Thanh toán</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng Doanh Thu</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats ? `${stats.total_revenue.toLocaleString()} VND` : "--"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng Giao Dịch</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.total_payments ?? "--"}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chờ Xử Lý</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-yellow-600">{stats?.pending_payments ?? "--"}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Mã GD</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chưa có giao dịch nào</TableCell></TableRow>
                )}
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-mono text-xs">{p.transaction_id}</TableCell>
                    <TableCell>{p.user_id}</TableCell>
                    <TableCell>{p.amount.toLocaleString()} VND</TableCell>
                    <TableCell>{p.credit_amount?.toLocaleString() ?? "-"}</TableCell>
                    <TableCell><Badge className={statusColors[p.status]}>{p.status}</Badge></TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleString("vi")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.status === "pending" && <Button size="sm" onClick={() => handleConfirm(p.id)}>Xác nhận</Button>}
                        {p.status === "completed" && <Button size="sm" variant="outline" onClick={() => handleRefund(p.id)}>Hoàn</Button>}
                      </div>
                    </TableCell>
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
