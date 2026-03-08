"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, Job } from "@/lib/api";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  viewlink: "ViewLink",
  keyword_seo: "Keyword SEO",
  backlink: "Backlink",
  social_media: "Social Media",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = (p = page, status = statusFilter) => {
    const params = new URLSearchParams({ page: String(p), page_size: "20" });
    if (status !== "all") params.set("status", status);
    adminApi.listJobs(params.toString()).then((d) => { setJobs(d.jobs); setTotal(d.total); });
  };

  useEffect(() => { load(); }, []);

  const handlePriority = async (id: number, priority: number) => {
    try {
      await adminApi.setJobPriority(id, priority);
      toast.success(`Priority updated to ${priority}`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handlePause = async (id: number) => {
    try { await adminApi.pauseJob(id); toast.success("Job paused"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleResume = async (id: number) => {
    try { await adminApi.resumeJob(id); toast.success("Job resumed"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (id: number) => {
    try { await adminApi.deleteJob(id); toast.success("Job cancelled"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quản lý công việc ({total})</h2>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); load(1, v); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Priority</TableHead>
                  <TableHead>Admin+</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                    <TableCell><Badge className={statusColors[j.status]}>{j.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {j.status === "active" && <Button size="sm" variant="outline" onClick={() => handlePause(j.id)}>Pause</Button>}
                        {j.status === "paused" && <Button size="sm" variant="outline" onClick={() => handleResume(j.id)}>Resume</Button>}
                        {j.status !== "cancelled" && j.status !== "completed" && (
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
    </AdminLayout>
  );
}
