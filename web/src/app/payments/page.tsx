"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paymentApi, creditApi } from "@/lib/api";
import { toast } from "sonner";

export default function PaymentsPage() {
  const [packages, setPackages] = useState<Array<Record<string, unknown>>>([]);
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    creditApi.packages().then(setPackages).catch(() => {});
    paymentApi.channels().then((d) => setChannels(d.channels || d || [])).catch(() => {});
    paymentApi.history("page_size=20").then((d) => setHistory(d.payments || [])).catch(() => {});
  }, []);

  const handleBuy = async (pkg: Record<string, unknown>) => {
    try {
      const data = await paymentApi.create({
        package_id: pkg.id,
        channel: "bank_transfer",
        purpose: "buy_credit",
      });
      toast.success(`Đã tạo đơn nạp #${data.id}. Vui lòng chuyển khoản theo hướng dẫn.`);
      paymentApi.history("page_size=20").then((d) => setHistory(d.payments || []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ xử lý",
    completed: "Hoàn thành",
    failed: "Thất bại",
    refunded: "Đã hoàn",
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Nạp tiền mua Credit</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id as number} className="relative">
              {pkg.badge ? (
                <Badge className="absolute -top-2 right-3 bg-red-500">
                  {pkg.badge === "popular" ? "Phổ biến" : pkg.badge === "best_value" ? "Tiết kiệm nhất" : pkg.badge === "hot" ? "Hot" : String(pkg.badge)}
                </Badge>
              ) : null}
              <CardHeader className="pb-2">
                <CardTitle>{pkg.name as string}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{(pkg.credit_amount as number).toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">credits</p>
                  {(pkg.bonus_credit as number) > 0 && (
                    <p className="text-sm text-green-600">+ {(pkg.bonus_credit as number).toLocaleString()} bonus</p>
                  )}
                  <p className="text-lg font-semibold">{(pkg.price as number).toLocaleString()} VND</p>
                  <Button className="w-full" onClick={() => handleBuy(pkg)}>Mua ngay</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Lịch sử nạp tiền</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã GD</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chưa có giao dịch nạp tiền</TableCell></TableRow>
                )}
                {history.map((p) => (
                  <TableRow key={p.id as number}>
                    <TableCell className="font-mono text-xs">{p.transaction_id as string}</TableCell>
                    <TableCell>{(p.amount as number).toLocaleString()} VND</TableCell>
                    <TableCell>{((p.credit_amount as number) || 0).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{statusLabels[p.status as string] || p.status as string}</Badge></TableCell>
                    <TableCell>{new Date(p.created_at as string).toLocaleString("vi")}</TableCell>
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
