"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { jobApi } from "@/lib/api";
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

type Job = Record<string, unknown>;

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [cancelJob, setCancelJob] = useState<Job | null>(null);

  const [form, setForm] = useState({
    title: "",
    job_type: "viewlink",
    target_url: "",
    target_count: 100,
    credit_per_view: 1,
    config: {} as Record<string, unknown>,
  });

  const load = () => {
    jobApi.list("page_size=50").then((d) => setJobs(d.jobs || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // === Create ===
  const handleCreate = async () => {
    try {
      await jobApi.create(form);
      toast.success("Tao cong viec thanh cong!");
      setShowCreate(false);
      setForm({ title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 1, config: {} });
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  // === Edit ===
  const openEdit = (j: Job) => {
    setEditJob(j);
    setForm({
      title: j.title as string,
      job_type: j.job_type as string,
      target_url: j.target_url as string,
      target_count: j.target_count as number,
      credit_per_view: j.credit_per_view as number,
      config: (j.config as Record<string, unknown>) || {},
    });
  };

  const handleUpdate = async () => {
    if (!editJob) return;
    try {
      await jobApi.update(editJob.id as number, {
        title: form.title,
        target_url: form.target_url,
        target_count: form.target_count,
        credit_per_view: form.credit_per_view,
        config: form.config,
      });
      toast.success("Da cap nhat!");
      setEditJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  // === Actions ===
  const handleStart = async (id: number) => {
    try { await jobApi.start(id); toast.success("Da bat dau"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const handlePause = async (id: number) => {
    try { await jobApi.pause(id); toast.success("Da tam dung"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const handleResume = async (id: number) => {
    try { await jobApi.resume(id); toast.success("Da tiep tuc"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const handleCancel = async () => {
    if (!cancelJob) return;
    try {
      await jobApi.delete(cancelJob.id as number);
      toast.success("Da huy cong viec");
      setCancelJob(null);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const canEdit = (status: string) => !["completed", "cancelled"].includes(status);
  const canCancel = (status: string) => !["completed", "cancelled"].includes(status);

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Cong viec cua toi</h2>
          <Button onClick={() => { setEditJob(null); setForm({ title: "", job_type: "viewlink", target_url: "", target_count: 100, credit_per_view: 1, config: {} }); setShowCreate(true); }}>
            + Tao cong viec
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tieu de</TableHead>
                  <TableHead>Loai</TableHead>
                  <TableHead>Tien do</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead>Hanh dong</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Chua co cong viec nao
                    </TableCell>
                  </TableRow>
                )}
                {jobs.map((j) => (
                  <TableRow key={j.id as number}>
                    <TableCell className="font-medium max-w-[200px] truncate">{j.title as string}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[j.job_type as string] || j.job_type as string}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(((j.completed_count as number) / Math.max(j.target_count as number, 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs whitespace-nowrap">{j.completed_count as number}/{j.target_count as number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{j.credit_spent as number}/{(j.target_count as number) * (j.credit_per_view as number)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[(j.status as string) || "draft"]}>
                        {statusLabels[j.status as string] || j.status as string}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {j.status === "draft" && (
                          <Button size="sm" onClick={() => handleStart(j.id as number)}>Chay</Button>
                        )}
                        {j.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => handlePause(j.id as number)}>Dung</Button>
                        )}
                        {j.status === "paused" && (
                          <Button size="sm" variant="outline" onClick={() => handleResume(j.id as number)}>Tiep tuc</Button>
                        )}
                        {canEdit(j.status as string) && (
                          <Button size="sm" variant="secondary" onClick={() => openEdit(j)}>Sua</Button>
                        )}
                        {canCancel(j.status as string) && (
                          <Button size="sm" variant="destructive" onClick={() => setCancelJob(j)}>Huy</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* === Dialog Tao moi === */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tao cong viec moi</DialogTitle></DialogHeader>
          <JobForm form={form} setForm={setForm} showType />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Dong</Button>
            <Button onClick={handleCreate}>Tao cong viec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Dialog Sua === */}
      <Dialog open={!!editJob} onOpenChange={(open) => { if (!open) setEditJob(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sua cong viec: {editJob?.title as string}</DialogTitle>
          </DialogHeader>
          <JobForm form={form} setForm={setForm} showType={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJob(null)}>Dong</Button>
            <Button onClick={handleUpdate}>Luu thay doi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Dialog Xac nhan huy === */}
      <Dialog open={!!cancelJob} onOpenChange={(open) => { if (!open) setCancelJob(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xac nhan huy cong viec</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ban co chac muon huy cong viec &quot;{cancelJob?.title as string}&quot;?
            Hanh dong nay khong the hoan tac.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelJob(null)}>Khong</Button>
            <Button variant="destructive" onClick={handleCancel}>Huy cong viec</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}

// === Form Component ===
function JobForm({
  form,
  setForm,
  showType,
}: {
  form: { title: string; job_type: string; target_url: string; target_count: number; credit_per_view: number; config: Record<string, unknown> };
  setForm: (f: typeof form) => void;
  showType: boolean;
}) {
  const updateConfig = (key: string, value: unknown) => {
    setForm({ ...form, config: { ...form.config, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tieu de</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Tang view trang chu" />
      </div>
      {showType && (
        <div>
          <Label>Loai cong viec</Label>
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
        <Label>
          {form.job_type === "keyword_seo" ? "URL trang dich (trang can tang thu hang)" : "URL muc tieu"}
        </Label>
        <Input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="https://example.com" />
        {form.job_type === "keyword_seo" && (
          <p className="text-xs text-muted-foreground mt-1">
            Trang web ma ban muon xuat hien cao tren Google khi tim tu khoa
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>So luot can</Label>
          <Input type="number" value={form.target_count} onChange={(e) => setForm({ ...form, target_count: +e.target.value })} />
        </div>
        <div>
          <Label>Credit/luot</Label>
          <Input type="number" value={form.credit_per_view} onChange={(e) => setForm({ ...form, credit_per_view: +e.target.value })} />
        </div>
      </div>

      {/* Config theo loai job */}
      {form.job_type === "viewlink" && (
        <div className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">Cau hinh View Link</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Thoi gian min (s)</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Thoi gian max (s)</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 120} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vl_click_internal"
              checked={!!form.config.click_internal_links}
              onChange={(e) => updateConfig("click_internal_links", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="vl_click_internal" className="text-xs cursor-pointer">
              Click vao cac link noi bo tren trang
            </Label>
          </div>
          {!!form.config.click_internal_links && (
            <div>
              <Label className="text-xs">So link noi bo toi da</Label>
              <Input type="number" value={(form.config.max_internal_clicks as number) || 3} onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)} />
            </div>
          )}
        </div>
      )}

      {form.job_type === "keyword_seo" && (
        <div className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">Cau hinh Keyword SEO</p>
          <p className="text-xs text-muted-foreground">
            Client se mo Google, nhap tu khoa, tim ket qua chua domain muc tieu va click vao.
          </p>
          <div>
            <Label className="text-xs">Tu khoa (moi dong 1 tu khoa) <span className="text-red-500">*</span></Label>
            <Textarea
              value={((form.config.keywords as string[]) || []).join("\n")}
              onChange={(e) => updateConfig("keywords", e.target.value.split("\n").filter(Boolean))}
              placeholder={"mua laptop gia re\nlaptop tot nhat 2024\nmua laptop o dau"}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Moi lan chay, he thong se chon ngau nhien 1 tu khoa de tim kiem
            </p>
          </div>
          <div>
            <Label className="text-xs">Domain muc tieu <span className="text-red-500">*</span></Label>
            <Input value={(form.config.target_domain as string) || ""} onChange={(e) => updateConfig("target_domain", e.target.value)} placeholder="example.com" />
            <p className="text-xs text-muted-foreground mt-1">
              Domain cua trang web ban muon tang thu hang (khong can http://)
            </p>
          </div>
          <div>
            <Label className="text-xs">Tim kiem tren</Label>
            <Select value={(form.config.search_engine as string) || "google.com"} onValueChange={(v) => updateConfig("search_engine", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google.com">Google Quoc te</SelectItem>
                <SelectItem value="google.com.vn">Google Viet Nam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tim toi trang</Label>
              <Input type="number" value={(form.config.max_search_page as number) || 5} onChange={(e) => updateConfig("max_search_page", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">O tren site min (s)</Label>
              <Input type="number" value={(form.config.min_time_on_site as number) || 30} onChange={(e) => updateConfig("min_time_on_site", +e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">O tren site max (s)</Label>
              <Input type="number" value={(form.config.max_time_on_site as number) || 90} onChange={(e) => updateConfig("max_time_on_site", +e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="kw_click_internal"
              checked={!!form.config.click_internal_links}
              onChange={(e) => updateConfig("click_internal_links", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="kw_click_internal" className="text-xs cursor-pointer">
              Click vao bai viet lien quan tren website (tang thoi gian o tren site)
            </Label>
          </div>
          {!!form.config.click_internal_links && (
            <div>
              <Label className="text-xs">So bai viet lien quan toi da</Label>
              <Input type="number" value={(form.config.max_internal_clicks as number) || 3} onChange={(e) => updateConfig("max_internal_clicks", +e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">
                Sau khi click vao trang muc tieu, client se tiep tuc click vao cac link noi bo ngau nhien
              </p>
            </div>
          )}
        </div>
      )}

      {form.job_type === "social_media" && (
        <div className="space-y-3 border rounded-lg p-3">
          <p className="text-sm font-medium">Cau hinh Social Media</p>
          <div>
            <Label className="text-xs">Nen tang</Label>
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
