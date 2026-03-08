"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminApi, CreditPackage } from "@/lib/api";
import { toast } from "sonner";

const emptyPkg = { name: "", credit_amount: 0, bonus_credit: 0, price: 0, badge: "", sort_order: 0 };

export default function PackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [dialog, setDialog] = useState<Partial<CreditPackage> | null>(null);
  const [isNew, setIsNew] = useState(false);

  const load = () => { adminApi.listPackages().then(setPackages); };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!dialog) return;
    try {
      if (isNew) {
        await adminApi.createPackage(dialog);
        toast.success("Tạo gói thành công");
      } else {
        await adminApi.updatePackage(dialog.id!, dialog);
        toast.success("Cập nhật thành công");
      }
      setDialog(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (id: number) => {
    try { await adminApi.deletePackage(id); toast.success("Đã vô hiệu hoá"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Gói Credit</h2>
          <Button onClick={() => { setDialog({ ...emptyPkg }); setIsNew(true); }}>+ Tạo gói mới</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên gói</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Giá (VND)</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.credit_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">+{p.bonus_credit.toLocaleString()}</TableCell>
                    <TableCell>{p.price.toLocaleString()}</TableCell>
                    <TableCell>{p.badge ? <Badge variant="outline">{p.badge}</Badge> : "-"}</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setDialog({ ...p }); setIsNew(false); }}>Sửa</Button>
                        {p.is_active && <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>Tắt</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Tạo gói mới" : "Sửa gói"}</DialogTitle></DialogHeader>
          {dialog && (
            <div className="space-y-3">
              <div><Label>Tên</Label><Input value={dialog.name || ""} onChange={(e) => setDialog({ ...dialog, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Credit</Label><Input type="number" value={dialog.credit_amount || 0} onChange={(e) => setDialog({ ...dialog, credit_amount: +e.target.value })} /></div>
                <div><Label>Bonus</Label><Input type="number" value={dialog.bonus_credit || 0} onChange={(e) => setDialog({ ...dialog, bonus_credit: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Giá (VND)</Label><Input type="number" value={dialog.price || 0} onChange={(e) => setDialog({ ...dialog, price: +e.target.value })} /></div>
                <div><Label>Badge</Label><Input value={dialog.badge || ""} onChange={(e) => setDialog({ ...dialog, badge: e.target.value })} placeholder="popular, hot..." /></div>
              </div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
