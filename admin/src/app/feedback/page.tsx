"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { MessageSquarePlus, Bug, Lightbulb, MessageCircle, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

interface Feedback {
  id: number;
  user_id: number;
  username?: string;
  type: string;
  status: string;
  title: string;
  description: string;
  screenshot_url?: string;
  severity?: string;
  admin_note?: string;
  credit_reward: number;
  created_at: string;
  reviewed_at?: string;
}

interface FeedbackStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  total_rewards: number;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Chờ duyệt", variant: "outline", icon: Clock },
  reviewing: { label: "Đang xem", variant: "secondary", icon: Eye },
  approved: { label: "Đã duyệt", variant: "default", icon: CheckCircle },
  rejected: { label: "Từ chối", variant: "destructive", icon: XCircle },
};

const TYPE_MAP: Record<string, { label: string; icon: typeof Bug }> = {
  bug_report: { label: "Báo lỗi", icon: Bug },
  feature_request: { label: "Đề xuất", icon: Lightbulb },
  general: { label: "Góp ý", icon: MessageCircle },
};

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-green-400" },
  medium: { label: "Trung bình", color: "text-yellow-400" },
  high: { label: "Cao", color: "text-orange-400" },
  critical: { label: "Nghiêm trọng", color: "text-red-400" },
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [creditReward, setCreditReward] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", "20");
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    adminApi
      .listFeedbacks(params.toString())
      .then((d) => {
        setFeedbacks((d.feedbacks as Feedback[]) || []);
        setTotal(d.total || 0);
      })
      .catch(() => {
        setFeedbacks([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, typeFilter]);

  const loadStats = useCallback(() => {
    adminApi.feedbackStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleReview = async (id: number, status: "approved" | "rejected") => {
    try {
      await adminApi.reviewFeedback(id, {
        status,
        admin_note: reviewNote || undefined,
        credit_reward: status === "approved" ? creditReward : 0,
      });
      toast.success(status === "approved" ? "Đã duyệt và thưởng credit" : "Đã từ chối");
      setSelectedId(null);
      setReviewNote("");
      setCreditReward(0);
      load();
      loadStats();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f0e8]">Quản lý Góp ý & Báo lỗi</h1>
            <p className="text-sm text-[#8a8999] mt-1">Duyệt feedback, thưởng credit cho bug report hữu ích</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Tổng", value: stats.total, icon: MessageSquarePlus },
              { label: "Chờ duyệt", value: stats.pending, icon: Clock },
              { label: "Đã duyệt", value: stats.approved, icon: CheckCircle },
              { label: "Từ chối", value: stats.rejected, icon: XCircle },
              { label: "Tổng thưởng", value: `${stats.total_rewards} credit`, icon: Lightbulb },
            ].map((s) => (
              <Card key={s.label} className="bg-[#12121a] border-[rgba(212,168,75,0.08)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[#8a8999] text-xs mb-1">
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                  <p className="text-xl font-bold text-[#f5f0e8]">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-[#12121a] border border-[rgba(212,168,75,0.15)] rounded-lg px-3 py-2 text-sm text-[#f5f0e8]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="reviewing">Đang xem</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-[#12121a] border border-[rgba(212,168,75,0.15)] rounded-lg px-3 py-2 text-sm text-[#f5f0e8]"
          >
            <option value="">Tất cả loại</option>
            <option value="bug_report">Báo lỗi</option>
            <option value="feature_request">Đề xuất</option>
            <option value="general">Góp ý</option>
          </select>
        </div>

        {/* Table */}
        <Card className="bg-[#12121a] border-[rgba(212,168,75,0.08)]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(212,168,75,0.06)] hover:bg-transparent">
                  <TableHead className="text-[#8a8999]">#</TableHead>
                  <TableHead className="text-[#8a8999]">User</TableHead>
                  <TableHead className="text-[#8a8999]">Loại</TableHead>
                  <TableHead className="text-[#8a8999]">Tiêu đề</TableHead>
                  <TableHead className="text-[#8a8999]">Mức độ</TableHead>
                  <TableHead className="text-[#8a8999]">Trạng thái</TableHead>
                  <TableHead className="text-[#8a8999]">Thưởng</TableHead>
                  <TableHead className="text-[#8a8999]">Ngày</TableHead>
                  <TableHead className="text-[#8a8999]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-[#8a8999]">Đang tải...</TableCell>
                  </TableRow>
                ) : feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-[#8a8999]">Chưa có feedback nào</TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((fb) => {
                    const st = STATUS_MAP[fb.status] || STATUS_MAP.pending;
                    const tp = TYPE_MAP[fb.type] || TYPE_MAP.general;
                    const sv = fb.severity ? SEVERITY_MAP[fb.severity] : null;
                    return (
                      <TableRow key={fb.id} className="border-[rgba(212,168,75,0.06)]">
                        <TableCell className="text-[#f5f0e8]">{fb.id}</TableCell>
                        <TableCell className="text-[#f5f0e8]">{fb.username || `#${fb.user_id}`}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[#8a8999]">
                            <tp.icon className="w-3.5 h-3.5" />
                            <span className="text-xs">{tp.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[#f5f0e8] max-w-[200px] truncate">{fb.title}</TableCell>
                        <TableCell>
                          {sv ? <span className={`text-xs font-medium ${sv.color}`}>{sv.label}</span> : <span className="text-[#555]">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-[#d4a84b] font-medium">
                          {fb.credit_reward > 0 ? `+${fb.credit_reward}` : "-"}
                        </TableCell>
                        <TableCell className="text-[#8a8999] text-xs">
                          {new Date(fb.created_at).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-[rgba(212,168,75,0.2)] text-[#d4a84b] hover:bg-[rgba(212,168,75,0.1)]"
                            onClick={() => {
                              setSelectedId(selectedId === fb.id ? null : fb.id);
                              setReviewNote(fb.admin_note || "");
                              setCreditReward(fb.credit_reward || 0);
                            }}
                          >
                            {fb.status === "pending" || fb.status === "reviewing" ? "Duyệt" : "Chi tiết"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Panel */}
        {selectedId && (() => {
          const fb = feedbacks.find((f) => f.id === selectedId);
          if (!fb) return null;
          const canReview = fb.status === "pending" || fb.status === "reviewing";
          return (
            <Card className="bg-[#12121a] border-[rgba(212,168,75,0.15)]">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#f5f0e8]">#{fb.id} - {fb.title}</h3>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)} className="text-[#8a8999]">Đóng</Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#8a8999]">Loại:</span>{" "}
                    <span className="text-[#f5f0e8]">{TYPE_MAP[fb.type]?.label || fb.type}</span>
                  </div>
                  <div>
                    <span className="text-[#8a8999]">Mức độ:</span>{" "}
                    <span className={fb.severity ? SEVERITY_MAP[fb.severity]?.color || "" : "text-[#555]"}>
                      {fb.severity ? SEVERITY_MAP[fb.severity]?.label || fb.severity : "N/A"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[#8a8999] text-xs mb-1">Mô tả:</p>
                  <p className="text-[#f5f0e8] text-sm whitespace-pre-wrap bg-[#0a0a10] rounded-lg p-3">{fb.description}</p>
                </div>
                {fb.screenshot_url && (
                  <div>
                    <p className="text-[#8a8999] text-xs mb-1">Screenshot:</p>
                    <a href={fb.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-[#d4a84b] text-sm hover:underline">{fb.screenshot_url}</a>
                  </div>
                )}
                {canReview && (
                  <>
                    <div>
                      <label className="text-[#8a8999] text-xs block mb-1">Ghi chú admin:</label>
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="w-full bg-[#0a0a10] border border-[rgba(212,168,75,0.15)] rounded-lg p-3 text-sm text-[#f5f0e8] min-h-[80px]"
                        placeholder="Nhận xét về feedback này..."
                      />
                    </div>
                    <div>
                      <label className="text-[#8a8999] text-xs block mb-1">Credit thưởng (cho bug report hữu ích):</label>
                      <input
                        type="number"
                        min={0}
                        value={creditReward}
                        onChange={(e) => setCreditReward(Number(e.target.value))}
                        className="w-32 bg-[#0a0a10] border border-[rgba(212,168,75,0.15)] rounded-lg px-3 py-2 text-sm text-[#f5f0e8]"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReview(fb.id, "approved")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Duyệt{creditReward > 0 ? ` (+${creditReward} credit)` : ""}
                      </Button>
                      <Button
                        onClick={() => handleReview(fb.id, "rejected")}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Từ chối
                      </Button>
                    </div>
                  </>
                )}
                {!canReview && fb.admin_note && (
                  <div>
                    <p className="text-[#8a8999] text-xs mb-1">Ghi chú admin:</p>
                    <p className="text-[#f5f0e8] text-sm">{fb.admin_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="border-[rgba(212,168,75,0.2)] text-[#8a8999]"
            >
              Trước
            </Button>
            <span className="text-sm text-[#8a8999]">{page}/{totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="border-[rgba(212,168,75,0.2)] text-[#8a8999]"
            >
              Sau
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
