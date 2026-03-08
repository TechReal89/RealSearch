"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, User } from "@/lib/api";
import { toast } from "sonner";

const tierColors: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800",
  silver: "bg-gray-100 text-gray-800",
  gold: "bg-yellow-100 text-yellow-800",
  diamond: "bg-cyan-100 text-cyan-800",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [creditDialog, setCreditDialog] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");

  const load = (p = page, s = search) => {
    const params = new URLSearchParams({ page: String(p), page_size: "20" });
    if (s) params.set("search", s);
    adminApi.listUsers(params.toString()).then((d) => { setUsers(d.users); setTotal(d.total); });
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => { setPage(1); load(1, search); };
  const handlePageChange = (p: number) => { setPage(p); load(p); };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    try {
      await adminApi.updateUser(editUser.id, {
        role: editUser.role,
        tier: editUser.tier,
        is_active: editUser.is_active,
      });
      toast.success("Cập nhật thành công");
      setEditUser(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleAdjustCredit = async () => {
    if (!creditDialog || !creditAmount) return;
    try {
      await adminApi.adjustCredit(creditDialog.id, parseInt(creditAmount), creditDesc || "Admin adjust");
      toast.success("Điều chỉnh credit thành công");
      setCreditDialog(null);
      setCreditAmount("");
      setCreditDesc("");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quản lý người dùng ({total})</h2>
        </div>

        <div className="flex gap-2">
          <Input placeholder="Tìm username hoặc email..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="max-w-sm" />
          <Button onClick={handleSearch}>Tìm</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                    <TableCell><Badge className={tierColors[u.tier]}>{u.tier}</Badge></TableCell>
                    <TableCell>{u.credit_balance.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={u.is_active ? "default" : "destructive"}>{u.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString("vi")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditUser({ ...u })}>Sửa</Button>
                        <Button size="sm" variant="outline" onClick={() => setCreditDialog(u)}>Credit</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>Trước</Button>
          <span className="py-2 px-4 text-sm">Trang {page} / {Math.ceil(total / 20) || 1}</span>
          <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => handlePageChange(page + 1)}>Tiếp</Button>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sửa User: {editUser?.username}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={editUser.role} onValueChange={(v) => setEditUser({ ...editUser, role: v as "user" | "admin" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={editUser.tier} onValueChange={(v) => setEditUser({ ...editUser, tier: v as User["tier"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <input type="checkbox" checked={editUser.is_active} onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })} />
              </div>
              <Button onClick={handleUpdateUser} className="w-full">Lưu thay đổi</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Adjust Dialog */}
      <Dialog open={!!creditDialog} onOpenChange={() => setCreditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Điều chỉnh Credit: {creditDialog?.username}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Số dư hiện tại: {creditDialog?.credit_balance.toLocaleString()}</p>
          <div className="space-y-4">
            <div>
              <Label>Số lượng (+ cộng, - trừ)</Label>
              <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="VD: 100 hoặc -50" />
            </div>
            <div>
              <Label>Lý do</Label>
              <Input value={creditDesc} onChange={(e) => setCreditDesc(e.target.value)} placeholder="Admin bonus" />
            </div>
            <Button onClick={handleAdjustCredit} className="w-full">Xác nhận</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
