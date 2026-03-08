"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    job_type: "viewlink",
    target_url: "",
    target_count: 100,
    credit_per_view: 1,
    config: { min_time_on_site: 30, max_time_on_site: 120, scroll_behavior: "natural", click_internal_links: false },
  });

  const load = () => { jobApi.list("page_size=50").then((d) => setJobs(d.jobs || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await jobApi.create(form);
      toast.success("Tạo công việc thành công!");
      setShowCreate(false);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleStart = async (id: number) => {
    try { await jobApi.start(id); toast.success("Đã bắt đầu"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handlePause = async (id: number) => {
    try { await jobApi.pause(id); toast.success("Đã tạm dừng"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleResume = async (id: number) => {
    try { await jobApi.resume(id); toast.success("Đã tiếp tục"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (id: number) => {
    try { await jobApi.delete(id); toast.success("Đã huỷ"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Công việc của tôi</h2>
          <Button onClick={() => setShowCreate(true)}>+ Tạo công việc</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Tiến độ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Chưa có công việc nào
                    </TableCell>
                  </TableRow>
                )}
                {jobs.map((j) => (
                  <TableRow key={j.id as number}>
                    <TableCell className="font-medium">{j.title as string}</TableCell>
                    <TableCell><Badge variant="outline">{j.job_type as string}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.min(((j.completed_count as number) / (j.target_count as number)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{j.completed_count as number}/{j.target_count as number}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={statusColors[(j.status as string) || "draft"]}>{j.status as string}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {j.status === "draft" && <Button size="sm" onClick={() => handleStart(j.id as number)}>Chạy</Button>}
                        {j.status === "active" && <Button size="sm" variant="outline" onClick={() => handlePause(j.id as number)}>Dừng</Button>}
                        {j.status === "paused" && <Button size="sm" variant="outline" onClick={() => handleResume(j.id as number)}>Tiếp tục</Button>}
                        {!["cancelled", "completed"].includes(j.status as string) && (
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id as number)}>Huỷ</Button>
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tạo công việc mới</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tiêu đề</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Tăng view cho trang chủ" />
            </div>
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
            <Button onClick={handleCreate} className="w-full">Tạo công việc</Button>
          </div>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
