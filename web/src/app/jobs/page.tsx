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
  AlertTriangle, Sparkles, Info, Crown, Zap,
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
type Pricing = {
  min_cost_viewlink: number;
  min_cost_keyword: number;
  extra_internal_click_cost: number;
  extra_keyword_cost: number;
  tier: string;
  tier_max_internal_clicks: number;
  tier_max_keywords: number;
  allow_internal_click: boolean;
  allow_keyword_seo: boolean;
};

const tierNames: Record<string, string> = {
  bronze: "Đồng", silver: "Bạc", gold: "Vàng", diamond: "Kim Cương",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [cancelJob, setCancelJob] = useState<Job | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);

  const [form, setForm] = useState({
    title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 10, config: {} as Record<string, unknown>,
  });

  const load = () => {
    jobApi.list("page_size=50").then((d) => setJobs(d.jobs || [])).catch(() => {});
  };
  useEffect(() => {
    load();
    jobApi.pricing().then(setPricing).catch(() => {});
  }, []);

  const handleCreate = async () => {
    try {
      await jobApi.create(form);
      toast.success("Tạo công việc thành công!");
      setShowCreate(false);
      resetForm();
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const resetForm = () => {
    const minCost = pricing?.min_cost_viewlink || 10;
    setForm({ title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: minCost, config: {} });
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
            onClick={() => { setEditJob(null); resetForm(); setShowCreate(true); }}
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
        <DialogContent className="max-w-2xl bg-[#111118] border-[rgba(212,168,75,0.12)] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-[#f5f0e8] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center">
                <Plus className="w-4 h-4 text-[#09090d]" />
              </div>
              <div>
                <span className="text-lg">Tạo công việc mới</span>
                <p className="text-xs text-[#666] font-normal mt-0.5">Thiết lập job tăng traffic & SEO tự động</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 -mr-1">
            <JobForm form={form} setForm={setForm} showType pricing={pricing} />
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-[rgba(255,255,255,0.04)]">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-[#8a8999] hover:text-[#ccc]">Huỷ bỏ</Button>
            <Button onClick={handleCreate} className="gold-gradient text-[#09090d] font-bold btn-gold-hover px-6">Tạo công việc</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(null); }}>
        <DialogContent className="max-w-2xl bg-[#111118] border-[rgba(212,168,75,0.12)] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-[#f5f0e8] flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
                <Pencil className="w-4 h-4 text-[#d4a84b]" />
              </div>
              <div>
                <span className="text-lg">Chỉnh sửa công việc</span>
                <p className="text-xs text-[#666] font-normal mt-0.5 truncate max-w-[350px]">{editJob?.title as string}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 -mr-1">
            <JobForm form={form} setForm={setForm} showType={false} pricing={pricing} />
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-[rgba(255,255,255,0.04)]">
            <Button variant="ghost" onClick={() => setEditJob(null)} className="text-[#8a8999] hover:text-[#ccc]">Huỷ bỏ</Button>
            <Button onClick={handleUpdate} className="gold-gradient text-[#09090d] font-bold btn-gold-hover px-6">Lưu thay đổi</Button>
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
  form, setForm, showType, pricing,
}: {
  form: { title: string; job_type: string; target_url: string; target_count: number; credit_per_view: number; config: Record<string, unknown> };
  setForm: (f: typeof form) => void;
  showType: boolean;
  pricing: Pricing | null;
}) {
  const updateConfig = (key: string, value: unknown) => {
    setForm({ ...form, config: { ...form.config, [key]: value } });
  };

  const minCost = form.job_type === "keyword_seo"
    ? (pricing?.min_cost_keyword || 20)
    : (pricing?.min_cost_viewlink || 10);

  const tierMaxClicks = pricing?.tier_max_internal_clicks || 0;
  const tierMaxKeywords = pricing?.tier_max_keywords || 1;
  const extraClickCost = pricing?.extra_internal_click_cost || 5;
  const extraKeywordCost = pricing?.extra_keyword_cost || 10;
  const userTier = pricing?.tier || "bronze";

  // Calculate extra costs
  const requestedClicks = form.config.click_internal_links ? ((form.config.max_internal_clicks as number) || 0) : 0;
  const extraClicks = Math.max(0, requestedClicks - tierMaxClicks);
  const extraClickTotal = extraClicks * extraClickCost;

  const keywords = ((form.config.keywords as string[]) || []).filter(Boolean);
  const extraKeywords = Math.max(0, keywords.length - tierMaxKeywords);
  const extraKeywordTotal = extraKeywords * extraKeywordCost;

  const totalExtraCost = (form.job_type === "viewlink" ? extraClickTotal : 0) +
    (form.job_type === "keyword_seo" ? extraClickTotal + extraKeywordTotal : 0);

  const effectiveCost = Math.max(form.credit_per_view, minCost);

  const inputClass = "h-11 bg-[#0a0a12] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] focus:shadow-[0_0_12px_rgba(212,168,75,0.08)] text-[#f5f0e8] placeholder:text-[#555] transition-all rounded-lg";
  const labelClass = "text-[#a0a0b0] text-xs font-medium mb-1.5 block";
  const helperClass = "text-[10px] text-[#555] mt-1";
  const sectionClass = "space-y-4 rounded-xl p-5 border border-[rgba(212,168,75,0.08)] bg-[rgba(212,168,75,0.015)]";

  const jobTypes = [
    { value: "viewlink", label: "View Link", desc: "Tăng lượt truy cập website", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { value: "keyword_seo", label: "Keyword SEO", desc: "Tăng thứ hạng từ khóa Google", icon: Search, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { value: "backlink", label: "Backlink", desc: "Tạo backlink chất lượng", icon: Link2, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { value: "social_media", label: "Social Media", desc: "Tăng view mạng xã hội", icon: Share2, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Job Type Selector */}
      {showType && (
        <div>
          <label className={labelClass}>Chọn loại công việc</label>
          <div className="grid grid-cols-2 gap-3">
            {jobTypes.map((jt) => {
              const Icon = jt.icon;
              const selected = form.job_type === jt.value;
              return (
                <button
                  key={jt.value}
                  type="button"
                  onClick={() => {
                    const newMinCost = jt.value === "keyword_seo" ? (pricing?.min_cost_keyword || 20) : (pricing?.min_cost_viewlink || 10);
                    setForm({ ...form, job_type: jt.value, config: {}, credit_per_view: newMinCost });
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    selected
                      ? `${jt.bg} ${jt.border} border-opacity-100 shadow-sm`
                      : "bg-[#0a0a12] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${jt.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${jt.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${selected ? jt.color : "text-[#ccc]"}`}>{jt.label}</p>
                    <p className="text-[10px] text-[#666] leading-tight">{jt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Basic Info Section */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
            <Briefcase className="w-3 h-3 text-[#d4a84b]" />
          </div>
          <span className="text-xs font-semibold text-[#d4a84b] uppercase tracking-wider">Thông tin cơ bản</span>
        </div>

        <div>
          <label className={labelClass}>Tiêu đề công việc</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="VD: Tăng traffic trang chủ tháng 3"
            className={inputClass}
          />
          <p className={helperClass}>Đặt tên dễ nhớ để quản lý</p>
        </div>

        <div>
          <label className={labelClass}>
            {form.job_type === "keyword_seo" ? "URL trang đích (landing page)" : "URL mục tiêu"}
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <Input
              value={form.target_url}
              onChange={(e) => setForm({ ...form, target_url: e.target.value })}
              placeholder="https://example.com"
              className={`${inputClass} pl-10`}
            />
          </div>
          <p className={helperClass}>
            {form.job_type === "keyword_seo" ? "URL sẽ được click khi tìm thấy trên Google" : "Trang web sẽ nhận lượt truy cập"}
          </p>
        </div>
      </div>

      {/* Budget Section */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-[rgba(212,168,75,0.1)] flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-[#d4a84b]" />
          </div>
          <span className="text-xs font-semibold text-[#d4a84b] uppercase tracking-wider">Ngân sách & Số lượng</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Số lượt cần</label>
            <Input
              type="number"
              value={form.target_count}
              onChange={(e) => setForm({ ...form, target_count: +e.target.value })}
              className={inputClass}
              min={1}
            />
            <p className={helperClass}>Tổng lượt thực hiện</p>
          </div>
          <div>
            <label className={labelClass}>Credit / lượt</label>
            <Input
              type="number"
              value={form.credit_per_view}
              onChange={(e) => setForm({ ...form, credit_per_view: Math.max(+e.target.value, minCost) })}
              className={inputClass}
              min={minCost}
            />
            <p className={helperClass}>Tối thiểu {minCost} credit/lượt</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-[rgba(212,168,75,0.04)] border border-[rgba(212,168,75,0.08)]">
          <span className="text-xs text-[#8a8999]">Tổng chi phí ước tính</span>
          <span className="text-sm font-bold text-[#d4a84b] font-mono">
            {(form.target_count * effectiveCost).toLocaleString()} credit
          </span>
        </div>

        {totalExtraCost > 0 && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.15)]">
            <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-purple-300">
              <p className="font-semibold mb-1">Chi phí tính năng nâng cao (mỗi lượt):</p>
              {extraClicks > 0 && (
                <p>+{extraClicks} link nội bộ vượt quota = +{extraClickTotal} credit/lượt</p>
              )}
              {extraKeywords > 0 && (
                <p>+{extraKeywords} keyword vượt quota = +{extraKeywordTotal} credit/lượt</p>
              )}
              <p className="mt-1 text-purple-400 font-medium">
                Nâng cấp cấp bậc để tăng quota miễn phí
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ViewLink Config */}
      {form.job_type === "viewlink" && (
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Cấu hình View Link</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Thời gian tối thiểu (giây)</label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} className={inputClass} min={5} />
              <p className={helperClass}>Ở trên trang ít nhất</p>
            </div>
            <div>
              <label className={labelClass}>Thời gian tối đa (giây)</label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 120} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} className={inputClass} min={10} />
              <p className={helperClass}>Ở trên trang nhiều nhất</p>
            </div>
          </div>

          {/* Internal Click - Premium Feature */}
          <div className="rounded-lg border border-[rgba(255,255,255,0.04)] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-[#0a0a12]">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="vl_click" checked={!!form.config.click_internal_links} onChange={(e) => updateConfig("click_internal_links", e.target.checked)}
                  className="h-4 w-4 rounded accent-[#d4a84b]"
                  disabled={!pricing?.allow_internal_click && tierMaxClicks === 0}
                />
                <div>
                  <Label htmlFor="vl_click" className="text-sm text-[#ccc] cursor-pointer font-medium flex items-center gap-1.5">
                    Click link nội bộ
                    <Crown className="w-3.5 h-3.5 text-[#d4a84b]" />
                  </Label>
                  <p className="text-[10px] text-[#555]">Tự động click vào các link trên trang để tăng pageview</p>
                </div>
              </div>
            </div>

            {!!form.config.click_internal_links && (
              <div className="p-3.5 border-t border-[rgba(255,255,255,0.04)] space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-[#888] bg-[rgba(212,168,75,0.04)] rounded-md px-3 py-2">
                  <Crown className="w-3 h-3 text-[#d4a84b]" />
                  <span>Cấp <strong className="text-[#d4a84b]">{tierNames[userTier]}</strong>: miễn phí {tierMaxClicks} link/lượt</span>
                  {tierMaxClicks < 10 && <span className="text-[#666]">| Thêm: +{extraClickCost} credit/link/lượt</span>}
                </div>
                <div>
                  <label className={labelClass}>Số link nội bộ tối đa</label>
                  <Input type="number" value={(form.config.max_internal_clicks as number) || tierMaxClicks || 1}
                    onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)}
                    className={inputClass} min={1} max={10}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyword SEO Config */}
      {form.job_type === "keyword_seo" && (
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Search className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Cấu hình Keyword SEO</span>
          </div>

          {/* Keywords with tier info */}
          <div>
            <label className={labelClass}>Từ khoá (mỗi dòng 1 từ khoá)</label>
            <div className="flex items-center gap-2 text-[10px] text-[#888] bg-[rgba(212,168,75,0.04)] rounded-md px-3 py-2 mb-2">
              <Crown className="w-3 h-3 text-[#d4a84b]" />
              <span>Cấp <strong className="text-[#d4a84b]">{tierNames[userTier]}</strong>: miễn phí {tierMaxKeywords} keyword/job</span>
              {tierMaxKeywords < 10 && <span className="text-[#666]">| Thêm: +{extraKeywordCost} credit/keyword/lượt</span>}
            </div>
            <Textarea
              value={((form.config.keywords as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("keywords", e.target.value.split("\n").filter(Boolean))}
              placeholder={"mua laptop giá rẻ\nlaptop tốt nhất 2024\nmua laptop ở đâu"}
              rows={4}
              className={`${inputClass} h-auto resize-none`}
            />
            <div className="flex items-center justify-between mt-1">
              <p className={helperClass}>Hệ thống sẽ search từ khoá trên Google và click vào trang của bạn</p>
              <span className={`text-[10px] font-mono ${keywords.length > tierMaxKeywords ? "text-purple-400" : "text-[#555]"}`}>
                {keywords.length}/{tierMaxKeywords} miễn phí
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Domain mục tiêu</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <Input value={(form.config.target_domain as string) || ""} onChange={(e) => updateConfig("target_domain", e.target.value)} placeholder="example.com" className={`${inputClass} pl-10`} />
            </div>
            <p className={helperClass}>Domain cần tìm và click trong kết quả Google</p>
          </div>

          <div>
            <label className={labelClass}>Tìm kiếm trên</label>
            <Select value={(form.config.search_engine as string) || "google.com"} onValueChange={(v) => updateConfig("search_engine", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
                <SelectItem value="google.com">Google Quốc tế (google.com)</SelectItem>
                <SelectItem value="google.com.vn">Google Việt Nam (google.com.vn)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Tìm tới trang</label>
              <Input type="number" value={(form.config.max_search_page as number) || 5} onChange={(e) => updateConfig("max_search_page", +e.target.value)} className={inputClass} min={1} max={10} />
              <p className={helperClass}>Số trang Google</p>
            </div>
            <div>
              <label className={labelClass}>Ở trên site min (s)</label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} className={inputClass} min={5} />
            </div>
            <div>
              <label className={labelClass}>Ở trên site max (s)</label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 90} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} className={inputClass} min={10} />
            </div>
          </div>

          {/* Internal Click for Keyword SEO */}
          <div className="rounded-lg border border-[rgba(255,255,255,0.04)] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-[#0a0a12]">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="kw_click" checked={!!form.config.click_internal_links} onChange={(e) => updateConfig("click_internal_links", e.target.checked)}
                  className="h-4 w-4 rounded accent-[#d4a84b]"
                  disabled={!pricing?.allow_internal_click && tierMaxClicks === 0}
                />
                <div>
                  <Label htmlFor="kw_click" className="text-sm text-[#ccc] cursor-pointer font-medium flex items-center gap-1.5">
                    Click bài viết liên quan
                    <Crown className="w-3.5 h-3.5 text-[#d4a84b]" />
                  </Label>
                  <p className="text-[10px] text-[#555]">Sau khi vào trang, click thêm các bài viết liên quan</p>
                </div>
              </div>
            </div>

            {!!form.config.click_internal_links && (
              <div className="p-3.5 border-t border-[rgba(255,255,255,0.04)] space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-[#888] bg-[rgba(212,168,75,0.04)] rounded-md px-3 py-2">
                  <Crown className="w-3 h-3 text-[#d4a84b]" />
                  <span>Cấp <strong className="text-[#d4a84b]">{tierNames[userTier]}</strong>: miễn phí {tierMaxClicks} link/lượt</span>
                  {tierMaxClicks < 10 && <span className="text-[#666]">| Thêm: +{extraClickCost} credit/link/lượt</span>}
                </div>
                <div>
                  <label className={labelClass}>Số link nội bộ tối đa</label>
                  <Input type="number" value={(form.config.max_internal_clicks as number) || tierMaxClicks || 1}
                    onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)}
                    className={inputClass} min={1} max={10}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Media Config */}
      {form.job_type === "social_media" && (
        <div className={sectionClass}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-pink-500/10 flex items-center justify-center">
              <Share2 className="w-3 h-3 text-pink-400" />
            </div>
            <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Cấu hình Social Media</span>
          </div>

          <div>
            <label className={labelClass}>Nền tảng</label>
            <Select value={(form.config.platform as string) || "youtube"} onValueChange={(v) => updateConfig("platform", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111118] border-[rgba(212,168,75,0.12)]">
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Thời gian xem tối thiểu (s)</label>
              <Input type="number" value={(form.config.min_watch_time as number) || 30} onChange={(e) => updateConfig("min_watch_time", +e.target.value)} className={inputClass} min={5} />
            </div>
            <div>
              <label className={labelClass}>Thời gian xem tối đa (s)</label>
              <Input type="number" value={(form.config.max_watch_time as number) || 120} onChange={(e) => updateConfig("max_watch_time", +e.target.value)} className={inputClass} min={10} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
