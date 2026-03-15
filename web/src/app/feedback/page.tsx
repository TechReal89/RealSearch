"use client";

import { useState, useEffect } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { useAuth } from "@/hooks/useAuth";
import { feedbackApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  MessageSquarePlus, Send, Bug, Lightbulb, MessageCircle,
  Clock, CheckCircle, XCircle, Eye, Trophy, AlertTriangle,
  Coins,
} from "lucide-react";

const typeOptions = [
  { value: "bug_report", label: "Báo lỗi", icon: Bug, color: "text-red-400" },
  { value: "feature_request", label: "Đề xuất tính năng", icon: Lightbulb, color: "text-yellow-400" },
  { value: "general", label: "Góp ý chung", icon: MessageCircle, color: "text-blue-400" },
];

const severityOptions = [
  { value: "low", label: "Thấp", color: "text-blue-400" },
  { value: "medium", label: "Trung bình", color: "text-yellow-400" },
  { value: "high", label: "Cao", color: "text-orange-400" },
  { value: "critical", label: "Nghiêm trọng", color: "text-red-400" },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Chờ xử lý", color: "text-yellow-400", icon: Clock },
  reviewing: { label: "Đang xem xét", color: "text-blue-400", icon: Eye },
  approved: { label: "Đã duyệt", color: "text-emerald-400", icon: CheckCircle },
  rejected: { label: "Từ chối", color: "text-red-400", icon: XCircle },
};

interface FeedbackItem {
  id: number;
  type: string;
  status: string;
  title: string;
  description: string;
  severity: string | null;
  credit_reward: number;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function FeedbackPage() {
  useAuth();

  const [type, setType] = useState("bug_report");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadFeedbacks = async (p = 1) => {
    setLoading(true);
    try {
      const data = await feedbackApi.list(p);
      setFeedbacks(data.feedbacks);
      setTotal(data.total);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSubmit = async () => {
    if (title.length < 5) {
      toast.error("Tiêu đề phải có ít nhất 5 ký tự");
      return;
    }
    if (description.length < 10) {
      toast.error("Mô tả phải có ít nhất 10 ký tự");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackApi.submit({
        type,
        title,
        description,
        severity: type === "bug_report" ? severity : undefined,
      });
      toast.success("Gửi góp ý thành công! Cảm ơn bạn đã đóng góp.");
      setTitle("");
      setDescription("");
      loadFeedbacks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lỗi gửi góp ý");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "bg-[#0a0a10] border-[rgba(212,168,75,0.10)] focus:border-[#d4a84b] text-[#f5f0e8] placeholder:text-[#444]";

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5 text-[#09090d]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#f5f0e8]">Góp ý & Báo lỗi</h2>
              <p className="text-sm text-[#8a8999]">
                Báo lỗi chính xác sẽ được thưởng Credits!
              </p>
            </div>
          </div>
          <a
            href="/hall-of-fame"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(212,168,75,0.08)] border border-[rgba(212,168,75,0.15)] text-[#d4a84b] hover:bg-[rgba(212,168,75,0.15)] transition-colors text-sm font-medium"
          >
            <Trophy className="w-4 h-4" />
            Bảng vinh danh
          </a>
        </div>

        <div className="ornament-line" />

        {/* Info Banner */}
        <div className="luxury-card rounded-xl p-4 bg-gradient-to-r from-emerald-900/20 to-emerald-800/5 border-emerald-800/30">
          <div className="flex items-start gap-3">
            <Coins className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-sm text-[#c0bbb0]">
              <p className="font-semibold text-emerald-400 mb-1">Nhận thưởng Credits khi báo lỗi!</p>
              <p>Nếu bạn phát hiện và báo cáo lỗi chính xác, hệ thống sẽ trao thưởng Credits. Lỗi càng nghiêm trọng, phần thưởng càng lớn. Tên bạn sẽ được ghi nhận trên Bảng Vinh Danh!</p>
            </div>
          </div>
        </div>

        {/* Submit Form */}
        <div className="luxury-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#f5f0e8] mb-5 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#d4a84b]" />
            Gửi góp ý mới
          </h3>

          <div className="space-y-5">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Loại góp ý</Label>
              <div className="flex gap-3">
                {typeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                        type === opt.value
                          ? "border-[#d4a84b] bg-[rgba(212,168,75,0.08)] text-[#d4a84b]"
                          : "border-[rgba(255,255,255,0.06)] bg-[#0a0a10] text-[#8a8999] hover:border-[rgba(255,255,255,0.12)]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${type === opt.value ? "text-[#d4a84b]" : opt.color}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity - only for bug reports */}
            {type === "bug_report" && (
              <div className="space-y-2">
                <Label className="text-[#8a8999] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Mức độ nghiêm trọng
                </Label>
                <div className="flex gap-3">
                  {severityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSeverity(opt.value)}
                      className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                        severity === opt.value
                          ? "border-[#d4a84b] bg-[rgba(212,168,75,0.08)] text-[#d4a84b]"
                          : "border-[rgba(255,255,255,0.06)] bg-[#0a0a10] text-[#8a8999] hover:border-[rgba(255,255,255,0.12)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Tiêu đề</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tóm tắt ngắn gọn vấn đề hoặc đề xuất..."
                className={inputClass}
                maxLength={255}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[#8a8999] text-xs uppercase tracking-wider">Mô tả chi tiết</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải, các bước tái tạo lỗi, hoặc đề xuất cải thiện..."
                rows={5}
                maxLength={5000}
                className={`w-full rounded-md px-3 py-2 text-sm resize-none ${inputClass} border`}
              />
              <p className="text-xs text-[#555]">{description.length}/5000 ký tự</p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || title.length < 5 || description.length < 10}
              className="gold-gradient text-[#09090d] font-bold hover:opacity-90 transition-all btn-gold-hover"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Đang gửi..." : "Gửi góp ý"}
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="luxury-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#f5f0e8] mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#d4a84b]" />
            Lịch sử góp ý ({total})
          </h3>

          {loading ? (
            <div className="text-center py-10 text-[#8a8999]">Đang tải...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-10 text-[#555]">Bạn chưa gửi góp ý nào</div>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((f) => {
                const st = statusConfig[f.status] || statusConfig.pending;
                const StatusIcon = st.icon;
                const typeOpt = typeOptions.find((t) => t.value === f.type);
                const TypeIcon = typeOpt?.icon || MessageCircle;

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-lg bg-[#0a0a10] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon className={`w-4 h-4 shrink-0 ${typeOpt?.color || "text-[#8a8999]"}`} />
                          <span className="font-medium text-[#f5f0e8] truncate">{f.title}</span>
                        </div>
                        <p className="text-xs text-[#555] mb-2">
                          {new Date(f.created_at).toLocaleDateString("vi-VN")} &middot; {typeOpt?.label}
                          {f.severity && ` &middot; ${f.severity}`}
                        </p>
                        <p className="text-sm text-[#8a8999] line-clamp-2">{f.description}</p>
                        {f.admin_note && (
                          <div className="mt-2 p-2 rounded bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                            <p className="text-xs text-[#d4a84b] font-medium">Phản hồi từ Admin:</p>
                            <p className="text-xs text-[#c0bbb0] mt-1">{f.admin_note}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {st.label}
                        </span>
                        {f.credit_reward > 0 && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <Coins className="w-3.5 h-3.5" />
                            +{f.credit_reward}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {total > 20 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadFeedbacks(page - 1)}
                    disabled={page <= 1}
                    className="border-[rgba(255,255,255,0.06)] text-[#8a8999]"
                  >
                    Trước
                  </Button>
                  <span className="text-xs text-[#555] self-center">Trang {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadFeedbacks(page + 1)}
                    disabled={page * 20 >= total}
                    className="border-[rgba(255,255,255,0.06)] text-[#8a8999]"
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
