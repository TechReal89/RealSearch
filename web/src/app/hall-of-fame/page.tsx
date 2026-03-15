"use client";

import { useState, useEffect } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { feedbackApi } from "@/lib/api";
import {
  Trophy, Medal, Crown, Star, Coins, Bug, Lightbulb, MessageCircle,
} from "lucide-react";

const typeIcons: Record<string, { icon: typeof Bug; color: string }> = {
  bug_report: { icon: Bug, color: "text-red-400" },
  feature_request: { icon: Lightbulb, color: "text-yellow-400" },
  general: { icon: MessageCircle, color: "text-blue-400" },
};

const tierColors: Record<string, string> = {
  bronze: "text-amber-600",
  silver: "text-gray-300",
  gold: "text-[#d4a84b]",
  diamond: "text-cyan-300",
};

interface TopContributor {
  user_id: number;
  username: string;
  full_name: string | null;
  tier: string;
  feedback_count: number;
  total_reward: number;
}

interface RecentApproved {
  id: number;
  title: string;
  type: string;
  credit_reward: number;
  username: string;
  reviewed_at: string | null;
}

export default function HallOfFamePage() {
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [recentApproved, setRecentApproved] = useState<RecentApproved[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackApi.hallOfFame().then((data) => {
      setTopContributors(data.top_contributors);
      setRecentApproved(data.recent_approved);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rankIcons = [
    { icon: Crown, color: "text-[#d4a84b]", bg: "gold-gradient" },
    { icon: Medal, color: "text-gray-300", bg: "bg-gray-600/30" },
    { icon: Medal, color: "text-amber-700", bg: "bg-amber-900/30" },
  ];

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Bảng Vinh Danh</h2>
            <p className="text-sm text-[#8a8999]">Những người đóng góp xuất sắc nhất</p>
          </div>
        </div>

        <div className="ornament-line" />

        {loading ? (
          <div className="text-center py-20 text-[#8a8999]">Đang tải...</div>
        ) : (
          <>
            {/* Top Contributors */}
            <div className="luxury-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#f5f0e8] mb-5 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#d4a84b]" />
                Top Người Đóng Góp
              </h3>

              {topContributors.length === 0 ? (
                <div className="text-center py-10 text-[#555]">Chưa có ai trên bảng vinh danh</div>
              ) : (
                <div className="space-y-3">
                  {topContributors.map((u, i) => {
                    const rank = rankIcons[i];
                    const RankIcon = rank?.icon || Star;

                    return (
                      <div
                        key={u.user_id}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                          i < 3
                            ? "bg-gradient-to-r from-[rgba(212,168,75,0.05)] to-transparent border border-[rgba(212,168,75,0.1)]"
                            : "bg-[#0a0a10] border border-[rgba(255,255,255,0.04)]"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          rank?.bg || "bg-white/5"
                        }`}>
                          {i < 3 ? (
                            <RankIcon className={`w-5 h-5 ${i === 0 ? "text-[#09090d]" : rank?.color}`} />
                          ) : (
                            <span className="text-sm font-bold text-[#555]">#{i + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#f5f0e8]">
                            {u.full_name || u.username}
                            <span className={`ml-2 text-xs font-normal ${tierColors[u.tier] || "text-[#8a8999]"}`}>
                              {u.tier}
                            </span>
                          </p>
                          <p className="text-xs text-[#8a8999]">{u.feedback_count} góp ý được duyệt</p>
                        </div>

                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <Coins className="w-4 h-4" />
                          <span className="stat-value">{u.total_reward.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Approved */}
            <div className="luxury-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#f5f0e8] mb-5 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Góp ý được thưởng gần đây
              </h3>

              {recentApproved.length === 0 ? (
                <div className="text-center py-10 text-[#555]">Chưa có góp ý nào được thưởng</div>
              ) : (
                <div className="space-y-3">
                  {recentApproved.map((f) => {
                    const typeInfo = typeIcons[f.type] || typeIcons.general;
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-[#0a0a10] border border-[rgba(255,255,255,0.04)]"
                      >
                        <TypeIcon className={`w-4 h-4 shrink-0 ${typeInfo.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#f5f0e8] truncate">{f.title}</p>
                          <p className="text-xs text-[#555]">
                            bởi <span className="text-[#d4a84b]">{f.username}</span>
                            {f.reviewed_at && (
                              <> &middot; {new Date(f.reviewed_at).toLocaleDateString("vi-VN")}</>
                            )}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 shrink-0">
                          <Coins className="w-3.5 h-3.5" />
                          +{f.credit_reward}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}
