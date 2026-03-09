"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paymentApi, creditApi } from "@/lib/api";
import { toast } from "sonner";

interface TransferInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
  amount: number;
  content: string;
  note: string;
}

export default function PaymentsPage() {
  const [packages, setPackages] = useState<Array<Record<string, unknown>>>([]);
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    creditApi.packages().then(setPackages).catch(() => {});
    paymentApi.channels().then((d) => setChannels(d.channels || d || [])).catch(() => {});
    paymentApi.history("page_size=20").then((d) => setHistory(d.payments || [])).catch(() => {});
  }, []);

  const handleBuy = async (pkg: Record<string, unknown>) => {
    setLoading(true);
    try {
      // Tìm kênh thanh toán active (ưu tiên sepay, rồi bank_transfer)
      const channel = channels.find((c) => c.name === "sepay" && c.is_active) ||
        channels.find((c) => c.name === "bank_transfer" && c.is_active) ||
        channels[0];

      if (!channel) {
        toast.error("Chưa có kênh thanh toán nào được kích hoạt");
        return;
      }

      const data = await paymentApi.create({
        channel_id: channel.id,
        amount: pkg.price,
        purpose: "buy_credit",
        credit_amount: (pkg.credit_amount as number) + (pkg.bonus_credit as number || 0),
      });

      if (data.transfer_info) {
        setTransferInfo(data.transfer_info);
        toast.success("Đã tạo đơn nạp. Vui lòng chuyển khoản theo hướng dẫn bên dưới.");
      } else {
        toast.success(`Đã tạo đơn nạp #${data.id}. Vui lòng chờ xác nhận.`);
      }

      paymentApi.history("page_size=20").then((d) => setHistory(d.payments || []));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "Chờ xử lý",
    completed: "Hoàn thành",
    failed: "Thất bại",
    refunded: "Đã hoàn",
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Nap tien mua Credit</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id as number} className="relative">
              {pkg.badge ? (
                <Badge className="absolute -top-2 right-3 bg-red-500">
                  {pkg.badge === "popular" ? "Pho bien" : pkg.badge === "best_value" ? "Tiet kiem nhat" : pkg.badge === "hot" ? "Hot" : String(pkg.badge)}
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
                  <Button className="w-full" onClick={() => handleBuy(pkg)} disabled={loading}>
                    {loading ? "Dang xu ly..." : "Mua ngay"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {transferInfo && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Thong tin chuyen khoan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium">Ngan hang:</span>
                  <span className="font-bold">{transferInfo.bank_name}</span>
                  <span className="font-medium">So tai khoan:</span>
                  <span className="font-bold font-mono">{transferInfo.account_number}</span>
                  <span className="font-medium">Chu tai khoan:</span>
                  <span className="font-bold">{transferInfo.account_name}</span>
                  <span className="font-medium">So tien:</span>
                  <span className="font-bold text-red-600">{transferInfo.amount.toLocaleString()} VND</span>
                  <span className="font-medium">Noi dung CK:</span>
                  <span className="font-bold font-mono text-red-600">{transferInfo.content}</span>
                </div>
                <p className="text-sm text-blue-700 bg-blue-100 p-3 rounded">
                  Luu y: Chuyen khoan dung so tien va noi dung de he thong tu dong xac nhan.
                  Credit se duoc cong trong vong 1-5 phut sau khi nhan duoc tien.
                </p>
                <Button variant="outline" size="sm" onClick={() => setTransferInfo(null)}>
                  Dong
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Lich su nap tien</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ma GD</TableHead>
                  <TableHead>So tien</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead>Ngay tao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chua co giao dich nap tien</TableCell></TableRow>
                )}
                {history.map((p) => (
                  <TableRow key={p.id as number}>
                    <TableCell className="font-mono text-xs">{p.transaction_id as string}</TableCell>
                    <TableCell>{(p.amount as number).toLocaleString()} VND</TableCell>
                    <TableCell>{((p.credit_amount as number) || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[p.status as string] || ""} variant="outline">
                        {statusLabels[p.status as string] || p.status as string}
                      </Badge>
                    </TableCell>
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
