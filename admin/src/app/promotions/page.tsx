"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminApi, Promotion } from "@/lib/api";
import { toast } from "sonner";

const PROMO_TYPES: Record<string, string> = {
  credit_bonus_percent: "Bonus % credit",
  credit_bonus_flat: "Bonus credit cố định",
  tier_discount_percent: "Giảm giá % tier",
  tier_discount_flat: "Giảm giá tier cố định",
  free_credits: "Tặng credit miễn phí",
  double_earn: "Nhân hệ số credit",
};

interface FormData {
  name: string;
  code: string;
  type: string;
  value: string;
  min_purchase: string;
  min_tier: string;
  max_uses: string;
  max_uses_per_user: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const defaultForm: FormData = {
  name: "",
  code: "",
  type: "credit_bonus_percent",
  value: "",
  min_purchase: "",
  min_tier: "",
  max_uses: "",
  max_uses_per_user: "1",
  start_date: "",
  end_date: "",
  is_active: true,
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);

  const load = () => {
    adminApi.listPromotions(`page=${page}&page_size=20`).then((d) => {
      setPromotions(d.promotions || []);
      setTotal(d.total || 0);
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      code: p.code || "",
      type: p.type,
      value: String(p.value),
      min_purchase: p.min_purchase ? String(p.min_purchase) : "",
      min_tier: p.min_tier || "",
      max_uses: p.max_uses ? String(p.max_uses) : "",
      max_uses_per_user: String(p.max_uses_per_user),
      start_date: p.start_date.slice(0, 16),
      end_date: p.end_date.slice(0, 16),
      is_active: p.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.value || !form.start_date || !form.end_date) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name,
      code: form.code || null,
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : null,
      min_tier: form.min_tier || null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await adminApi.updatePromotion(editingId, payload as Partial<Promotion>);
        toast.success("Cập nhật thành công");
      } else {
        await adminApi.createPromotion(payload as Partial<Promotion>);
        toast.success("Tạo khuyến mãi thành công");
      }
      setShowDialog(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Vô hiệu hóa khuyến mãi này?")) return;
    try {
      await adminApi.deletePromotion(id);
      toast.success("Đã vô hiệu hóa");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const isExpired = (p: Promotion) => new Date(p.end_date) < new Date();
  const isUpcoming = (p: Promotion) => new Date(p.start_date) > new Date();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quản lý Khuyến mãi</h2>
          <Button onClick={openCreate}>+ Tạo khuyến mãi</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng khuyến mãi</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Đang hoạt động</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{promotions.filter(p => p.is_active && !isExpired(p)).length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng lượt dùng</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">{promotions.reduce((s, p) => s + p.current_uses, 0)}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Sử dụng</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chưa có khuyến mãi</TableCell></TableRow>
                )}
                {promotions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><code className="text-sm bg-muted px-1 rounded">{p.code || "-"}</code></TableCell>
                    <TableCell className="text-sm">{PROMO_TYPES[p.type] || p.type}</TableCell>
                    <TableCell className="font-mono">
                      {p.type.includes("percent") ? `${p.value}%` : p.value.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {p.current_uses}{p.max_uses ? `/${p.max_uses}` : ""}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.start_date).toLocaleDateString("vi")} - {new Date(p.end_date).toLocaleDateString("vi")}
                    </TableCell>
                    <TableCell>
                      {!p.is_active ? (
                        <Badge variant="secondary">Tắt</Badge>
                      ) : isExpired(p) ? (
                        <Badge variant="destructive">Hết hạn</Badge>
                      ) : isUpcoming(p) ? (
                        <Badge variant="outline">Sắp tới</Badge>
                      ) : (
                        <Badge variant="default">Hoạt động</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Sửa</Button>
                        {p.is_active && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Tắt</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {total > 20 && (
          <div className="flex gap-2 justify-center">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
            <span className="py-2 px-3 text-sm">Trang {page} / {Math.ceil(total / 20)}</span>
            <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Sau</Button>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Sửa khuyến mãi" : "Tạo khuyến mãi mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tên khuyến mãi *</label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Mã khuyến mãi (để trống = tự động áp dụng)</label>
                <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VD: WELCOME50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Loại *</label>
                  <Select value={form.type} onValueChange={(v) => v && setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROMO_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Giá trị *</label>
                  <Input type="number" value={form.value} onChange={(e) => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder={form.type.includes("percent") ? "VD: 30 (%)" : "VD: 100"} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Bắt đầu *</label>
                  <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Kết thúc *</label>
                  <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Mua tối thiểu (VND)</label>
                  <Input type="number" value={form.min_purchase} onChange={(e) => setForm(f => ({ ...f, min_purchase: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Tier tối thiểu</label>
                  <Select value={form.min_tier || "none"} onValueChange={(v) => v && setForm(f => ({ ...f, min_tier: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không yêu cầu</SelectItem>
                      <SelectItem value="silver">Bạc</SelectItem>
                      <SelectItem value="gold">Vàng</SelectItem>
                      <SelectItem value="diamond">Kim Cương</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tổng lượt dùng tối đa</label>
                  <Input type="number" value={form.max_uses} onChange={(e) => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Không giới hạn" />
                </div>
                <div>
                  <label className="text-sm font-medium">Lượt/user</label>
                  <Input type="number" value={form.max_uses_per_user} onChange={(e) => setForm(f => ({ ...f, max_uses_per_user: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Hủy</Button>
              <Button onClick={handleSave}>{editingId ? "Cập nhật" : "Tạo mới"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
