"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jobApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Briefcase, Plus, Play, Pause, RotateCcw, Pencil, Trash2, Globe, Search, Share2, Link2,
  AlertTriangle, Sparkles,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  draft: { label: "Nháp", color: "text-gray-400", dot: "bg-gray-400" },
  active: { label: "Đang chạy", color: "text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" },
  paused: { label: "Tạm dừng", color: "text-yellow-400", dot: "bg-yellow-400" },
  completed: { label: "Hoàn thành", color: "text-blue-400", dot: "bg-blue-400" },
  cancelled: { label: "Đã huỷ", color: "text-red-400", dot: "bg-red-400" },
};

const typeConfig: Record<string, { label: string; icon: typeof Globe; color: string; bg: string }> = {
  viewlink: { label: "View Link", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10" },
  keyword_seo: { label: "Keyword SEO", icon: Search, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  backlink: { label: "Backlink", icon: Link2, color: "text-purple-400", bg: "bg-purple-500/10" },
  social_media: { label: "Social Media", icon: Share2, color: "text-pink-400", bg: "bg-pink-500/10" },
};

type Job = Record<string, unknown>;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [cancelJob, setCancelJob] = useState<Job | null>(null);

  const [form, setForm] = useState({
    title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 1, config: {} as Record<string, unknown>,
  });

  const load = () => {
    jobApi.list("page_size=50").then((d) => setJobs(d.jobs || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await jobApi.create(form);
      toast.success("Tạo công việc thành công!");
      setShowCreate(false);
      setForm({ title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 1, config: {} });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const openEdit = (j: Job) => {
    setEditJob(j);
    setForm({
      title: j.title as string, job_type: j.job_type as string, target_url: j.target_url as string,
      target_count: j.target_count as number, credit_per_view: j.credit_per_view as number,
      config: (j.config as Record<string, unknown>) || {},
    });
  };

  const handleUpdate = async () => {
    if (!editJob) return;
    try {
      await jobApi.update(editJob.id as number, { title: form.title, target_url: form.target_url, target_count: form.target_count, credit_per_view: form.credit_per_view, config: form.config });
      toast.success("Đã cập nhật!");
      setEditJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleStart = async (id: number) => { try { await jobApi.start(id); toast.success("Đã bắt đầu"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); } };
  const handlePause = async (id: number) => { try { await jobApi.pause(id); toast.success("Đã tạm dừng"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); } };
  const handleResume = async (id: number) => { try { await jobApi.resume(id); toast.success("Đã tiếp tục"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); } };

  const handleCancel = async () => {
    if (!cancelJob) return;
    try {
      await jobApi.delete(cancelJob.id as number);
      toast.success("Đã huỷ công việc");
      setCancelJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const canEdit = (status: string) => !["completed", "cancelled"].includes(status);
  const canCancel = (status: string) => !["completed", "cancelled"].includes(status);

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center animate-pulse-gold">
              <Briefcase className="w-5 h-5 text-[#09090d]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#f5f0e8]">Công việc của tôi</h2>
              <p className="text-sm text-[#8a8999]">Quản lý các job tăng traffic & SEO</p>
            </div>
          </div>
          <Button
            onClick={() => { setEditJob(null); setForm({ title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 1, config: {} }); setShowCreate(true); }}
            className="gold-gradient text-[#09090d] font-bold hover:opacity-90 btn-gold-hover"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Tạo công việc
          </Button>
        </div>

        <div className="ornament-line" />

        {/* Jobs Table */}
        <div className="luxury-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(212,168,75,0.08)] hover:bg-transparent">
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Tiêu đề</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Loại</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Tiến độ</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Credit</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Trạng thái</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.08)] flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-6 h-6 text-[#333]" />
                    </div>
                    <p className="text-[#8a8999] text-sm">Chưa có công việc nào</p>
                  </TableCell>
                </TableRow>
              )}
              {jobs.map((j) => {
                const pct = Math.min(((j.completed_count as number) / Math.max(j.target_count as number, 1)) * 100, 100);
                const st = statusConfig[(j.status as string)] || statusConfig.draft;
                const tp = typeConfig[(j.job_type as string)] || typeConfig.viewlink;
                const TpIcon = tp.icon;
                return (
                  <TableRow key={j.id as number} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(212,168,75,0.02)] transition-colors">
                    <TableCell className="font-medium text-[#f5f0e8] max-w-[200px] truncate">{j.title as string}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md ${tp.bg} flex items-center justify-center`}>
                          <TpIcon className={`w-3 h-3 ${tp.color}`} />
                        </div>
                        <span className={`text-sm ${tp.color}`}>{tp.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-[#16161f] rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full progress-gold transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[#8a8999] font-mono stat-value">{j.completed_count as number}/{j.target_count as number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-[#8a8999] stat-value">
                      {j.credit_spent as number}/{(j.target_count as number) * (j.credit_per_view as number)}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.02)] ${st.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        <span className="text-xs font-medium">{st.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {j.status === "draft" && (
                          <button onClick={() => handleStart(j.id as number)} className="p-1.5 rounded-lg hover:bg-emerald-900/15 text-emerald-400 transition-colors" title="Chạy">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {j.status === "active" && (
                          <button onClick={() => handlePause(j.id as number)} className="p-1.5 rounded-lg hover:bg-yellow-900/15 text-yellow-400 transition-colors" title="Dừng">
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {j.status === "paused" && (
                          <button onClick={() => handleResume(j.id as number)} className="p-1.5 rounded-lg hover:bg-emerald-900/15 text-emerald-400 transition-colors" title="Tiếp tục">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit(j.status as string) && (
                          <button onClick={() => openEdit(j)} className="p-1.5 rounded-lg hover:bg-[rgba(212,168,75,0.08)] text-[#d4a84b] transition-colors" title="Sửa">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canCancel(j.status as string) && (
                          <button onClick={() => setCancelJob(j)} className="p-1.5 rounded-lg hover:bg-red-900/15 text-red-400 transition-colors" title="Huỷ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-[#111118] border-[rgba(212,168,75,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f0e8] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center">
                <Plus className="w-4 h-4 text-[#09090d]" />
              </div>
              Tạo công việc mới
            </DialogTitle>
          </DialogHeader>
          <JobForm form={form} setForm={setForm} showType />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-[#8a8999]">Đóng</Button>
            <Button onClick={handleCreate} className="gold-gradient text-[#09090d] font-bold btn-gold-hover">Tạo công việc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(null); }}>
        <DialogContent className="max-w-lg bg-[#111118] border-[rgba(212,168,75,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f0e8] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5 text-[#d4a84b]" />
              </div>
              Sửa: {editJob?.title as string}
            </DialogTitle>
          </DialogHeader>
          <JobForm form={form} setForm={setForm} showType={false} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditJob(null)} className="text-[#8a8999]">Đóng</Button>
            <Button onClick={handleUpdate} className="gold-gradient text-[#09090d] font-bold btn-gold-hover">Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelJob} onOpenChange={(open) => { if (!open) setCancelJob(null); }}>
        <DialogContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-[#f5f0e8] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              Xác nhận huỷ
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#8a8999]">
            Bạn có chắc muốn huỷ công việc &quot;{cancelJob?.title as string}&quot;? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelJob(null)} className="text-[#8a8999]">Không</Button>
            <Button onClick={handleCancel} className="bg-red-600 hover:bg-red-700 text-white font-semibold">Huỷ công việc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}

function JobForm({
  form, setForm, showType,
}: {
  form: { title: string; job_type: string; target_url: string; target_count: number; credit_per_view: number; config: Record<string, unknown> };
  setForm: (f: typeof form) => void;
  showType: boolean;
}) {
  const updateConfig = (key: string, value: unknown) => {
    setForm({ ...form, config: { ...form.config, [key]: value } });
  };

  const inputClass = "bg-[#09090d] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] focus:shadow-[0_0_12px_rgba(212,168,75,0.08)] text-[#f5f0e8] placeholder:text-[#444] transition-all";
  const labelClass = "text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold";

  return (
    <div className="space-y-4">
      <div>
        <Label className={labelClass}>Tiêu đề</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Tăng view trang chủ" className={inputClass} />
      </div>
      {showType && (
        <div>
          <Label className={labelClass}>Loại công việc</Label>
          <Select value={form.job_type} onValueChange={(v) => v && setForm({ ...form, job_type: v, config: {} })}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
              <SelectItem value="viewlink">View Link</SelectItem>
              <SelectItem value="keyword_seo">Keyword SEO</SelectItem>
              <SelectItem value="backlink">Backlink</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label className={labelClass}>
          {form.job_type === "keyword_seo" ? "URL trang đích" : "URL mục tiêu"}
        </Label>
        <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://example.com" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={labelClass}>Số lượt cần</Label>
          <Input type="number" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: +e.target.value })} className={inputClass} />
        </div>
        <div>
          <Label className={labelClass}>Credit/lượt</Label>
          <Input type="number" value={form.credit_per_view} onChange={(e) => setForm({ ...form, credit_per_view: +e.target.value })} className={inputClass} />
        </div>
      </div>

      {form.job_type === "viewlink" && (
        <div className="space-y-3 rounded-xl p-4 border border-[rgba(212,168,75,0.08)] bg-[rgba(212,168,75,0.02)]">
          <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Cấu hình View Link
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Thời gian min (s)</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Thời gian max (s)</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 120} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vl_click" checked={!!form.config.click_internal_links} onChange={(e) => updateConfig("click_internal_links", e.target.checked)} className="h-4 w-4 rounded accent-[#d4a84b]" />
            <Label htmlFor="vl_click" className="text-xs text-[#8a8999] cursor-pointer">Click vào các link nội bộ trên trang</Label>
          </div>
          {!!form.config.click_internal_links && (
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Số link nội bộ tối đa</Label>
              <Input type="number" value={(form.config.max_internal_clicks as number) || 3} onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)} className={inputClass} />
            </div>
          )}
        </div>
      )}

      {form.job_type === "keyword_seo" && (
        <div className="space-y-3 rounded-xl p-4 border border-[rgba(212,168,75,0.08)] bg-[rgba(212,168,75,0.02)]">
          <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3 h-3" /> Cấu hình Keyword SEO
          </p>
          <div>
            <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Từ khoá (mỗi dòng 1 từ khoá)</Label>
            <Textarea
              value={((form.config.keywords as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("keywords", e.target.value.split("\n").filter(Boolean))}
              placeholder={"mua laptop giá rẻ\nlaptop tốt nhất 2024"}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Domain mục tiêu</Label>
            <Input value={(form.config.target_domain as string) || ""} onChange={(e) => updateConfig("target_domain", e.target.value)} placeholder="example.com" className={inputClass} />
          </div>
          <div>
            <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Tìm kiếm trên</Label>
            <Select value={(form.config.search_engine as string) || "google.com"} onValueChange={(v) => updateConfig("search_engine", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
                <SelectItem value="google.com">Google Quốc tế</SelectItem>
                <SelectItem value="google.com.vn">Google Việt Nam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Tìm tới trang</Label>
              <Input type="number" value={(form.config.max_search_page as number) || 5} onChange={(e) => updateConfig("max_search_page", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Ở trên site min</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Ở trên site max</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 90} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="kw_click" checked={!!form.config.click_internal_links} onChange={(e) => updateConfig("click_internal_links", e.target.checked)} className="h-4 w-4 rounded accent-[#d4a84b]" />
            <Label htmlFor="kw_click" className="text-xs text-[#8a8999] cursor-pointer">Click vào bài viết liên quan</Label>
          </div>
        </div>
      )}

      {form.job_type === "social_media" && (
        <div className="space-y-3 rounded-xl p-4 border border-[rgba(212,168,75,0.08)] bg-[rgba(212,168,75,0.02)]">
          <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-3 h-3" /> Cấu hình Social Media
          </p>
          <div>
            <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Nền tảng</Label>
            <Select value={(form.config.platform as string) || "youtube"} onValueChange={(v) => updateConfig("platform", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Xem min (s)</Label>
              <Input type="number" value={(form.config.min_watch_time as number) || 30} onChange={(e) => updateConfig("min_watch_time", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className="text-[10px] text-[#8a8999] uppercase tracking-wider">Xem max (s)</Label>
              <Input type="number" value={(form.config.max_watch_time as number) || 120} onChange={(e) => updateConfig("max_watch_time", +e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
