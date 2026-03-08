"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminApi, Job } from "@/lib/api";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

const typeLabels: Record<string, string> = {
  viewlink: "View Link",
  keyword_seo: "Keyword SEO",
  backlink: "Backlink",
  social_media: "Social Media",
};

const defaultForm = {
  user_id: 1,
  title: "",
  job_type: "viewlink",
  target_url: "",
  target_count: 100,
  credit_per_view: 1,
  priority: 5,
  admin_priority: 0,
  config: {
    min_time_on_site: 30,
    max_time_on_site: 120,
    scroll_behavior: "natural",
    click_internal_links: false,
  },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const load = (p = page, status = statusFilter) => {
    const params = new URLSearchParams({ page: String(p), page_size: "20" });
    if (status !== "all") params.set("status", status);
    adminApi.listJobs(params.toString()).then((d) => { setJobs(d.jobs); setTotal(d.total); });
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    try {
      await adminApi.createJob(form);
      toast.success("Tạo công việc thành công!");
      setShowCreate(false);
      setForm({ ...defaultForm });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi tạo công việc"); }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setForm({
      user_id: job.user_id,
      title: job.title,
      job_type: job.job_type || "viewlink",
      target_url: job.target_url,
      target_count: job.target_count,
      credit_per_view: job.credit_per_view,
      priority: job.priority,
      admin_priority: job.admin_priority,
      config: (job.config || {}) as typeof defaultForm.config,
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingJob) return;
    try {
      await adminApi.updateJob(editingJob.id, {
        title: form.title,
        target_url: form.target_url,
        target_count: form.target_count,
        credit_per_view: form.credit_per_view,
        priority: form.priority,
        admin_priority: form.admin_priority,
        config: form.config,
      });
      toast.success("Cập nhật công việc thành công!");
      setShowEdit(false);
      setEditingJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi cập nhật"); }
  };

  const handlePriority = async (id: number, priority: number) => {
    try {
      await adminApi.setJobPriority(id, priority);
      toast.success(`Đã cập nhật ưu tiên: ${priority}`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handlePause = async (id: number) => {
    try { await adminApi.pauseJob(id); toast.success("Đã tạm dừng"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleResume = async (id: number) => {
    try { await adminApi.resumeJob(id); toast.success("Đã tiếp tục"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (id: number) => {
    try { await adminApi.deleteJob(id); toast.success("Đã huỷ công việc"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const jobFormFields = (
    <div className="space-y-4">
      {showCreate && (
        <div>
          <Label>User ID</Label>
          <Input type="number" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: +e.target.value })} />
        </div>
      )}
      <div>
        <Label>Tiêu đề</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Tăng view trang chủ" />
      </div>
      {showCreate && (
        <div>
          <Label>Loại công việc</Label>
          <Select value={form.job_type} onValueChange={(v) => v && setForm({ ...form, job_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="viewlink">View Link</SelectItem>
              <SelectItem value="keyword_seo">Keyword SEO</SelectItem>
              <SelectItem value="backlink">Backlink</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>URL mục tiêu</Label>
        <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://example.com" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Số lượt cần</Label>
          <Input type="number" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: +e.target.value })} />
        </div>
        <div>
          <Label>Credit/lượt</Label>
          <Input type="number" value={form.credit_per_view} onChange={(e) => setForm({ ...form, credit_per_view: +e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ưu tiên (1-10)</Label>
          <Input type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })} />
        </div>
        <div>
          <Label>Admin ưu tiên (0-10)</Label>
          <Input type="number" min={0} max={10} value={form.admin_priority} onChange={(e) => setForm({ ...form, admin_priority: +e.target.value })} />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quản lý công việc ({total})</h2>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => { if (!v) return; setStatusFilter(v); setPage(1); load(1, v); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang chạy</SelectItem>
                <SelectItem value="paused">Tạm dừng</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã huỷ</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setForm({ ...defaultForm }); setShowCreate(true); }}>+ Tạo công việc</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Admin+</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chưa có công việc nào</TableCell>
                  </TableRow>
                )}
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.id}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[j.job_type] || j.job_type}</Badge></TableCell>
                    <TableCell className="font-medium max-w-48 truncate">{j.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((j.completed_count / j.target_count) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs">{j.completed_count}/{j.target_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>{j.priority}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handlePriority(j.id, Math.max(0, j.admin_priority - 1))}>-</Button>
                        <span className="w-4 text-center">{j.admin_priority}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handlePriority(j.id, Math.min(10, j.admin_priority + 1))}>+</Button>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={statusColors[j.status]}>{statusLabels[j.status] || j.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(j)}>Sửa</Button>
                        {j.status === "draft" && <Button size="sm" onClick={() => handleResume(j.id)}>Chạy</Button>}
                        {j.status === "active" && <Button size="sm" variant="outline" onClick={() => handlePause(j.id)}>Dừng</Button>}
                        {j.status === "paused" && <Button size="sm" variant="outline" onClick={() => handleResume(j.id)}>Tiếp tục</Button>}
                        {!["cancelled", "completed"].includes(j.status) && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id)}>Huỷ</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>Trước</Button>
          <span className="py-2 px-4 text-sm">Trang {page} / {Math.ceil(total / 20) || 1}</span>
          <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => { setPage(page + 1); load(page + 1); }}>Tiếp</Button>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tạo công việc mới</DialogTitle></DialogHeader>
          {jobFormFields}
          <Button onClick={handleCreate} className="w-full">Tạo công việc</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditingJob(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Sửa công việc #{editingJob?.id}</DialogTitle></DialogHeader>
          {jobFormFields}
          <Button onClick={handleUpdate} className="w-full">Cập nhật</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
