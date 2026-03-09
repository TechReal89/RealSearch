"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { creditApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Coins, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Gift, RefreshCw, Settings2, Sparkles, Clock,
} from "lucide-react";

const typeConfig: Record<string, { label: string; icon: typeof Coins; color: string; bg: string }> = {
  earn_task: { label: "Kiếm từ task", icon: ArrowUpRight, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  spend_job: { label: "Chi cho job", icon: ArrowDownRight, color: "text-rose-400", bg: "bg-rose-500/10" },
  purchase: { label: "Mua credit", icon: Coins, color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.1)]" },
  bonus: { label: "Thưởng", icon: Gift, color: "text-purple-400", bg: "bg-purple-500/10" },
  referral: { label: "Giới thiệu", icon: Sparkles, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  refund: { label: "Hoàn trả", icon: RefreshCw, color: "text-orange-400", bg: "bg-orange-500/10" },
  admin_adjust: { label: "Admin điều chỉnh", icon: Settings2, color: "text-gray-400", bg: "bg-gray-500/10" },
  promotion: { label: "Khuyến mãi", icon: Sparkles, color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.1)]" },
};

export default function CreditsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    creditApi.history("page_size=50").then((d) => setHistory(d.transactions || [])).catch(() => {});
  }, []);

  const statCards = [
    {
      label: "Số dư hiện tại",
      value: user?.credit_balance.toLocaleString() || "0",
      icon: Coins,
      color: "text-[#d4a84b]",
      iconBg: "gold-gradient",
      iconColor: "text-[#09090d]",
    },
    {
      label: "Tổng đã kiếm",
      value: `+${user?.total_earned.toLocaleString() || "0"}`,
      icon: TrendingUp,
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    {
      label: "Tổng đã chi",
      value: `-${user?.total_spent.toLocaleString() || "0"}`,
      icon: TrendingDown,
      color: "text-rose-400",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-400",
    },
  ];

  return (
    <UserLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center animate-pulse-gold">
            <Coins className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Credits của tôi</h2>
            <p className="text-sm text-[#8a8999]">Quản lý số dư và lịch sử giao dịch</p>
          </div>
        </div>

        <div className="ornament-line" />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="luxury-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">{card.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
                <div className={`text-3xl font-bold ${card.color} stat-value`}>{card.value}</div>
              </div>
            );
          })}
        </div>

        {/* Transaction History */}
        <div className="luxury-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(212,168,75,0.08)] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[rgba(212,168,75,0.08)] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-[#d4a84b]" />
            </div>
            <h3 className="font-semibold text-[#f5f0e8] text-sm">Lịch sử giao dịch</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(212,168,75,0.08)] hover:bg-transparent">
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Thời gian</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Loại</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Số lượng</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Số dư sau</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Mô tả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.08)] flex items-center justify-center mx-auto mb-4">
                      <Coins className="w-6 h-6 text-[#333]" />
                    </div>
                    <p className="text-[#8a8999] text-sm">Chưa có giao dịch nào</p>
                  </TableCell>
                </TableRow>
              )}
              {history.map((t) => {
                const tc = typeConfig[t.type as string] || typeConfig.earn_task;
                const TcIcon = tc.icon;
                const isPositive = (t.amount as number) > 0;
                return (
                  <TableRow key={t.id as number} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(212,168,75,0.02)] transition-colors">
                    <TableCell className="text-sm text-[#8a8999]">{new Date(t.created_at as string).toLocaleString("vi")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md ${tc.bg} flex items-center justify-center`}>
                          <TcIcon className={`w-3 h-3 ${tc.color}`} />
                        </div>
                        <span className={`text-sm ${tc.color}`}>{tc.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold font-mono stat-value ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPositive ? "+" : ""}{(t.amount as number).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[#f5f0e8] stat-value">{(t.balance_after as number).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-[#8a8999] max-w-[200px] truncate">{t.description as string}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </UserLayout>
  );
}
