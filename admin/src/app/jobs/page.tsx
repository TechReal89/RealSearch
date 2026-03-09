"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

interface JobForm {
  user_id: number;
  title: string;
  job_type: string;
  target_url: string;
  target_count: number;
  credit_per_view: number;
  priority: number;
  admin_priority: number;
  auto_start: boolean;
  config: Record<string, unknown>;
}

const defaultForm: JobForm = {
  user_id: 0,
  title: "",
  job_type: "viewlink",
  target_url: "",
  target_count: 100,
  credit_per_view: 1,
  priority: 5,
  admin_priority: 5,
  auto_start: true,
  config: {},
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [cancelJob, setCancelJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobForm>({ ...defaultForm });

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
      const job = await adminApi.createJob({
        user_id: form.user_id,
        title: form.title,
        job_type: form.job_type,
        target_url: form.target_url,
        target_count: form.target_count,
        credit_per_view: form.credit_per_view,
        priority: form.priority,
        admin_priority: form.admin_priority,
        config: form.config,
      });
      // Tự động bắt đầu nếu chọn
      if (form.auto_start) {
        try { await adminApi.startJob(job.id); } catch {}
      }
      toast.success("Tạo công việc thành công!" + (form.auto_start ? " Đã bật chạy." : ""));
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
      auto_start: false,
      config: (job.config || {}) as Record<string, unknown>,
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
      toast.success("Cập nhật thành công!");
      setShowEdit(false);
      setEditingJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi cập nhật"); }
  };

  const handlePriority = async (id: number, priority: number) => {
    try {
      await adminApi.setJobPriority(id, priority);
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

  const handleCancel = async () => {
    if (!cancelJob) return;
    try { await adminApi.deleteJob(cancelJob.id); toast.success("Đã huỷ"); setCancelJob(null); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

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
                  <TableHead>User</TableHead>
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
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Chưa có công việc nào</TableCell>
                  </TableRow>
                )}
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.id}</TableCell>
                    <TableCell className="text-xs">#{j.user_id}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[j.job_type] || j.job_type}</Badge></TableCell>
                    <TableCell className="font-medium max-w-40 truncate">{j.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min((j.completed_count / Math.max(j.target_count, 1)) * 100, 100)}%` }} />
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
                      <div className="flex gap-1 flex-wrap">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(j)}>Sửa</Button>
                        {j.status === "draft" && <Button size="sm" onClick={() => handleResume(j.id)}>Chạy</Button>}
                        {j.status === "active" && <Button size="sm" variant="outline" onClick={() => handlePause(j.id)}>Dừng</Button>}
                        {j.status === "paused" && <Button size="sm" variant="outline" onClick={() => handleResume(j.id)}>Tiếp tục</Button>}
                        {!["cancelled", "completed"].includes(j.status) && (
                          <Button size="sm" variant="destructive" onClick={() => setCancelJob(j)}>Huỷ</Button>
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

      {/* === Dialog Tạo mới === */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tạo công việc mới (Admin)</DialogTitle></DialogHeader>
          <AdminJobForm form={form} setForm={setForm} isCreate />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Đóng</Button>
            <Button onClick={handleCreate}>Tạo công việc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Dialog Sửa === */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) setEditingJob(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Sửa công việc #{editingJob?.id}</DialogTitle></DialogHeader>
          <AdminJobForm form={form} setForm={setForm} isCreate={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Đóng</Button>
            <Button onClick={handleUpdate}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Dialog Xác nhận huỷ === */}
      <Dialog open={!!cancelJob} onOpenChange={(open) => { if (!open) setCancelJob(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xác nhận huỷ công việc</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bạn có chắc muốn huỷ công việc &quot;{cancelJob?.title}&quot;? Tất cả client sẽ ngừng chạy task cho công việc này.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelJob(null)}>Không</Button>
            <Button variant="destructive" onClick={handleCancel}>Huỷ công việc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// === Admin Job Form ===
function AdminJobForm({
  form,
  setForm,
  isCreate,
}: {
  form: JobForm;
  setForm: (f: JobForm) => void;
  isCreate: boolean;
}) {
  const updateConfig = (key: string, value: unknown) => {
    setForm({ ...form, config: { ...form.config, [key]: value } });
  };

  return (
    <div className="space-y-4">
      {/* User ID - chỉ khi tạo mới */}
      {isCreate && (
        <div>
          <Label>User ID (owner của job)</Label>
          <Input type="number" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: +e.target.value })} />
          <p className="text-xs text-muted-foreground mt-1">
            Credit sẽ trừ từ user này. Đặt 0 hoặc ID admin nếu muốn admin chịu chi phí.
          </p>
        </div>
      )}

      <div>
        <Label>Tiêu đề</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: SEO từ khóa laptop giá rẻ" />
      </div>

      {/* Loại job - chỉ khi tạo */}
      {isCreate && (
        <div>
          <Label>Loại công việc</Label>
          <Select value={form.job_type} onValueChange={(v) => v && setForm({ ...form, job_type: v, config: {} })}>
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
        <Label>{form.job_type === "keyword_seo" ? "URL trang đích (trang cần tăng thứ hạng)" : "URL mục tiêu"}</Label>
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

      {/* Auto-start checkbox - chỉ khi tạo */}
      {isCreate && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <input
            type="checkbox"
            id="auto_start"
            checked={form.auto_start}
            onChange={(e) => setForm({ ...form, auto_start: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="auto_start" className="cursor-pointer text-sm">
            Tự động bắt đầu chạy ngay (tất cả client online sẽ nhận task)
          </Label>
        </div>
      )}

      {/* ==================== CONFIG THEO LOẠI JOB ==================== */}

      {/* --- View Link --- */}
      {form.job_type === "viewlink" && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <p className="text-sm font-medium">Cấu hình View Link</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Thời gian min (s)</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Thời gian max (s)</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 120} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vl_click" checked={!!form.config.click_internal_links}
              onChange={(e) => updateConfig("click_internal_links", e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="vl_click" className="text-xs cursor-pointer">Click vào link nội bộ trên trang</Label>
          </div>
          {!!form.config.click_internal_links && (
            <div>
              <Label className="text-xs">Số link nội bộ tối đa</Label>
              <Input type="number" value={(form.config.max_internal_clicks as number) || 3} onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)} />
            </div>
          )}
        </div>
      )}

      {/* --- Keyword SEO --- */}
      {form.job_type === "keyword_seo" && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <p className="text-sm font-medium">Cấu hình Keyword SEO</p>
          <p className="text-xs text-muted-foreground">
            Client sẽ mở Google → nhập từ khóa → tìm kết quả chứa domain mục tiêu → click vào → duyệt web tự nhiên.
          </p>

          <div>
            <Label className="text-xs">Từ khóa (mỗi dòng 1 từ khóa) <span className="text-red-500">*</span></Label>
            <Textarea
              value={((form.config.keywords as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("keywords", e.target.value.split("\n").filter(Boolean))}
              placeholder={"mua laptop giá rẻ\nlaptop tốt nhất 2024\nmua laptop ở đâu uy tín"}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">Mỗi lần chạy, hệ thống chọn ngẫu nhiên 1 từ khóa</p>
          </div>

          <div>
            <Label className="text-xs">Domain mục tiêu <span className="text-red-500">*</span></Label>
            <Input value={(form.config.target_domain as string) || ""} onChange={(e) => updateConfig("target_domain", e.target.value)} placeholder="example.com" />
            <p className="text-xs text-muted-foreground mt-1">Domain trang web cần tăng thứ hạng (không cần http://)</p>
          </div>

          <div>
            <Label className="text-xs">Tìm kiếm trên</Label>
            <Select value={(form.config.search_engine as string) || "google.com"} onValueChange={(v) => updateConfig("search_engine", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google.com">Google Quốc tế</SelectItem>
                <SelectItem value="google.com.vn">Google Việt Nam</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tìm tối đa (trang)</Label>
              <Input type="number" value={(form.config.max_search_page as number) || 5} onChange={(e) => updateConfig("max_search_page", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ở trên site min (s)</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ở trên site max (s)</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 90} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="kw_click" checked={!!form.config.click_internal_links}
              onChange={(e) => updateConfig("click_internal_links", e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="kw_click" className="text-xs cursor-pointer">
              Click vào bài viết liên quan trên website (tăng thời gian ở trên site)
            </Label>
          </div>
          {!!form.config.click_internal_links && (
            <div>
              <Label className="text-xs">Số bài viết liên quan tối đa</Label>
              <Input type="number" value={(form.config.max_internal_clicks as number) || 3} onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)} />
            </div>
          )}
        </div>
      )}

      {/* --- Backlink --- */}
      {form.job_type === "backlink" && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <p className="text-sm font-medium">Cấu hình Backlink</p>
          <div>
            <Label className="text-xs">Anchor texts (mỗi dòng 1 anchor)</Label>
            <Textarea
              value={((form.config.anchor_texts as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("anchor_texts", e.target.value.split("\n").filter(Boolean))}
              placeholder={"trang web hay\nxem thêm tại đây"}
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Trang đặt backlink (mỗi dòng 1 URL)</Label>
            <Textarea
              value={((form.config.target_sites as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("target_sites", e.target.value.split("\n").filter(Boolean))}
              placeholder={"https://directory1.com/submit\nhttps://forum.example.com/post"}
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Loại backlink</Label>
            <Select value={(form.config.backlink_type as string) || "directory"} onValueChange={(v) => updateConfig("backlink_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="directory">Directory (thư mục web)</SelectItem>
                <SelectItem value="comment">Comment (bình luận)</SelectItem>
                <SelectItem value="forum">Forum (diễn đàn)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* --- Social Media --- */}
      {form.job_type === "social_media" && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <p className="text-sm font-medium">Cấu hình Social Media</p>
          <div>
            <Label className="text-xs">Nền tảng</Label>
            <Select value={(form.config.platform as string) || "youtube"} onValueChange={(v) => updateConfig("platform", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Xem min (s)</Label>
              <Input type="number" value={(form.config.min_watch_time as number) || 30} onChange={(e) => updateConfig("min_watch_time", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Xem max (s)</Label>
              <Input type="number" value={(form.config.max_watch_time as number) || 120} onChange={(e) => updateConfig("max_watch_time", +e.target.value)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
