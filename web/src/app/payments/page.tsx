"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paymentApi, creditApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Wallet, Sparkles, Star, Zap, Crown, Copy, CheckCircle, Clock, XCircle, RotateCcw, X, Coins, ArrowRight, Shield, Flame, Loader2, Timer,
} from "lucide-react";

interface TransferInfo {
  bank_name: string;
  account_number: string;
  account_name: string;
  amount: number;
  content: string;
  note: string;
  qr_url?: string;
}

const badgeLabels: Record<string, { text: string; icon: typeof Star; style: string }> = {
  popular: { text: "Phổ biến", icon: Star, style: "badge-vip" },
  best_value: { text: "Best Value", icon: Zap, style: "badge-vip" },
  hot: { text: "HOT", icon: Flame, style: "badge-hot" },
};

const COUNTDOWN_SECONDS = 5 * 60; // 5 minutes
const POLL_INTERVAL = 5000; // 5 seconds

export default function PaymentsPage() {
  const [packages, setPackages] = useState<Array<Record<string, unknown>>>([]);
  const [channels, setChannels] = useState<Array<Record<string, unknown>>>([]);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [pendingPaymentId, setPendingPaymentId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const refreshData = useCallback(() => {
    paymentApi.history("page_size=20").then((d) => setHistory(d.payments || [])).catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback((paymentId: number) => {
    stopPolling();
    setCountdown(COUNTDOWN_SECONDS);
    setPaymentConfirmed(false);

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Timeout - stop polling but keep transfer info visible
          stopPolling();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll payment status
    pollRef.current = setInterval(async () => {
      try {
        const payment = await paymentApi.get(paymentId);
        if (payment.status === "completed") {
          stopPolling();
          setPaymentConfirmed(true);
          setPendingPaymentId(null);
          toast.success("Thanh toán thành công! Credit đã được cộng vào tài khoản.", {
            duration: 6000,
          });
          // Refresh data
          refreshData();
          // Auto-close transfer info after 5 seconds
          setTimeout(() => {
            setTransferInfo(null);
            setPaymentConfirmed(false);
          }, 5000);
        } else if (payment.status === "failed") {
          stopPolling();
          setPendingPaymentId(null);
          toast.error("Thanh toán thất bại. Vui lòng thử lại.");
          refreshData();
        }
      } catch {
        // Ignore polling errors
      }
    }, POLL_INTERVAL);
  }, [stopPolling, refreshData]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    creditApi.packages().then(setPackages).catch(() => {});
    paymentApi.channels().then((d) => setChannels(d.channels || d || [])).catch(() => {});
    refreshData();
  }, [refreshData]);

  const handleBuy = async (pkg: Record<string, unknown>) => {
    setLoading(true);
    try {
      const channel = channels.find((c) => c.name === "sepay" && c.is_active) ||
        channels.find((c) => c.name === "bank_transfer" && c.is_active) ||
        channels[0];

      if (!channel) {
        toast.error("Chưa có kênh thanh toán nào được kích hoạt");
        return;
      }

      const data = await paymentApi.create({
        channel_id: channel.id,
        amount: pkg.price,
        purpose: "buy_credit",
        credit_amount: (pkg.credit_amount as number) + (pkg.bonus_credit as number || 0),
      });

      if (data.transfer_info) {
        setTransferInfo(data.transfer_info);
        setPendingPaymentId(data.id);
        startPolling(data.id);
        toast.success("Đã tạo đơn nạp. Vui lòng chuyển khoản theo hướng dẫn.");
      } else {
        toast.success(`Đã tạo đơn nạp #${data.id}. Vui lòng chờ xác nhận.`);
      }

      refreshData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
    toast.success("Đã sao chép");
  };

  const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bg: string }> = {
    pending: { label: "Chờ xử lý", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    completed: { label: "Hoàn thành", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    failed: { label: "Thất bại", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
    refunded: { label: "Đã hoàn", icon: RotateCcw, color: "text-gray-400", bg: "bg-gray-500/10" },
  };

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center animate-pulse-gold">
            <Wallet className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Nạp tiền mua Credit</h2>
            <p className="text-sm text-[#8a8999]">Chọn gói phù hợp và thanh toán nhanh chóng</p>
          </div>
        </div>

        <div className="ornament-line" />

        {/* Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg, i) => {
            const badge = badgeLabels[pkg.badge as string];
            const isHighlighted = pkg.badge === "best_value" || pkg.badge === "hot";
            return (
              <div
                key={pkg.id as number}
                className={`relative overflow-hidden transition-all duration-500 animate-fade-up ${
                  isHighlighted
                    ? "luxury-card-premium rounded-xl gold-glow border border-[rgba(212,168,75,0.2)]"
                    : "luxury-card rounded-xl"
                }`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {/* Badge */}
                {badge && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className={`${badge.style} text-[10px] px-2.5 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wider`}>
                      <badge.icon className="w-3 h-3" />
                      {badge.text}
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <p className="text-sm text-[#8a8999] mb-1 font-medium">{pkg.name as string}</p>

                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className={`text-3xl font-bold stat-value ${isHighlighted ? "gold-text" : "text-[#f5f0e8]"}`}>
                      {(pkg.credit_amount as number).toLocaleString()}
                    </span>
                    <div className="w-5 h-5 rounded-full gold-gradient flex items-center justify-center">
                      <Coins className="w-3 h-3 text-[#09090d]" />
                    </div>
                  </div>

                  {(pkg.bonus_credit as number) > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-[#d4a84b]" />
                      <span className="text-sm text-[#d4a84b] font-semibold">
                        +{(pkg.bonus_credit as number).toLocaleString()} bonus
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[rgba(255,255,255,0.04)] pt-3 mt-3">
                    <p className="text-lg font-bold gold-text mb-3 stat-value">
                      {(pkg.price as number).toLocaleString()} <span className="text-xs text-[#8a8999]">VND</span>
                    </p>
                    <Button
                      className={`w-full font-bold h-10 btn-gold-hover ${
                        isHighlighted
                          ? "gold-gradient text-[#09090d] hover:opacity-90"
                          : "bg-[rgba(212,168,75,0.08)] text-[#d4a84b] hover:bg-[rgba(212,168,75,0.15)] border border-[rgba(212,168,75,0.12)]"
                      }`}
                      onClick={() => handleBuy(pkg)}
                      disabled={loading}
                    >
                      {loading ? "Đang xử lý..." : "Mua ngay"}
                      {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transfer Info */}
        {transferInfo && (
          <div className={`luxury-card-premium rounded-xl overflow-hidden border ${
            paymentConfirmed
              ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "border-[rgba(212,168,75,0.2)] gold-glow"
          } transition-all duration-500`}>
            <div className={`${paymentConfirmed ? "bg-emerald-500" : "gold-gradient"} px-5 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {paymentConfirmed ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Shield className="w-5 h-5 text-[#09090d]" />
                )}
                <h3 className={`font-bold ${paymentConfirmed ? "text-white" : "text-[#09090d]"}`}>
                  {paymentConfirmed ? "Thanh toán thành công!" : "Thông tin chuyển khoản"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Countdown Timer */}
                {!paymentConfirmed && countdown > 0 && (
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.15)] px-2.5 py-1 rounded-lg">
                    <Timer className="w-3.5 h-3.5 text-[#09090d]" />
                    <span className="text-sm font-mono font-bold text-[#09090d]">
                      {formatCountdown(countdown)}
                    </span>
                  </div>
                )}
                {/* Polling indicator */}
                {!paymentConfirmed && pendingPaymentId && countdown > 0 && (
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.15)] px-2.5 py-1 rounded-lg">
                    <Loader2 className="w-3.5 h-3.5 text-[#09090d] animate-spin" />
                    <span className="text-[11px] font-medium text-[#09090d]">Đang chờ...</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setTransferInfo(null);
                    setPendingPaymentId(null);
                    setPaymentConfirmed(false);
                    stopPolling();
                  }}
                  className={`${paymentConfirmed ? "text-white" : "text-[#09090d]"} hover:opacity-70 transition-opacity`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              {paymentConfirmed ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-400 mb-2">Credit đã được cộng!</h3>
                  <p className="text-sm text-[#8a8999]">Số dư credit của bạn đã được cập nhật tự động.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* QR Code */}
                  {transferInfo.qr_url && (
                    <div className="flex flex-col items-center gap-3 flex-shrink-0">
                      <div className="bg-white rounded-xl p-2">
                        <img
                          src={transferInfo.qr_url}
                          alt="QR Code chuyển khoản"
                          className="w-[200px] h-auto rounded-lg"
                        />
                      </div>
                      <p className="text-[10px] text-[#8a8999] uppercase tracking-wider">Quét mã QR để chuyển khoản</p>
                    </div>
                  )}

                  {/* Transfer details */}
                  <div className="flex-1">
                    <div className="space-y-0">
                      {[
                        { label: "Ngân hàng", value: transferInfo.bank_name, key: "bank" },
                        { label: "Số tài khoản", value: transferInfo.account_number, key: "acc", mono: true },
                        { label: "Chủ tài khoản", value: transferInfo.account_name, key: "name" },
                        { label: "Số tiền", value: `${transferInfo.amount.toLocaleString()} VND`, key: "amount", highlight: true },
                        { label: "Nội dung CK", value: transferInfo.content, key: "content", mono: true, highlight: true },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.03)]">
                          <span className="text-sm text-[#8a8999]">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${item.mono ? "font-mono stat-value" : ""} ${item.highlight ? "text-[#d4a84b]" : "text-[#f5f0e8]"}`}>
                              {item.value}
                            </span>
                            <button
                              onClick={() => copyText(String(item.value).replace(/[,. ]/g, "").replace("VND", ""), item.key)}
                              className="text-[#555] hover:text-[#d4a84b] transition-colors"
                            >
                              {copiedField === item.key ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Status message */}
                    <div className="mt-4 p-3.5 rounded-xl glass-gold">
                      {countdown > 0 ? (
                        <div className="flex items-start gap-2">
                          <Loader2 className="w-4 h-4 text-[#d4a84b] animate-spin flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-[#d4a84b] leading-relaxed">
                            Hệ thống đang chờ xác nhận thanh toán. Credit sẽ được cộng tự động ngay khi nhận được chuyển khoản.
                            Thời gian còn lại: <span className="font-bold font-mono">{formatCountdown(countdown)}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#d4a84b] leading-relaxed">
                          Hết thời gian chờ tự động. Nếu bạn đã chuyển khoản, credit sẽ được cộng khi hệ thống xác nhận.
                          Vui lòng kiểm tra lịch sử giao dịch bên dưới.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="luxury-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[rgba(212,168,75,0.08)] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[rgba(212,168,75,0.08)] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-[#d4a84b]" />
            </div>
            <h3 className="font-semibold text-[#f5f0e8] text-sm">Lịch sử nạp tiền</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(212,168,75,0.08)] hover:bg-transparent">
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Mã GD</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Số tiền</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Credits</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Trạng thái</TableHead>
                <TableHead className="text-[#8a8999] text-[10px] uppercase tracking-widest font-semibold">Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.08)] flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-6 h-6 text-[#333]" />
                    </div>
                    <p className="text-[#8a8999] text-sm">Chưa có giao dịch nạp tiền</p>
                  </TableCell>
                </TableRow>
              )}
              {history.map((p) => {
                const st = statusConfig[p.status as string] || statusConfig.pending;
                const StIcon = st.icon;
                return (
                  <TableRow key={p.id as number} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(212,168,75,0.02)] transition-colors">
                    <TableCell className="font-mono text-xs text-[#8a8999] stat-value">{p.transaction_id as string}</TableCell>
                    <TableCell className="font-semibold text-[#f5f0e8] stat-value">{(p.amount as number).toLocaleString()} <span className="text-[10px] text-[#8a8999]">VND</span></TableCell>
                    <TableCell className="text-[#d4a84b] font-bold stat-value">{((p.credit_amount as number) || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${st.bg} ${st.color}`}>
                        <StIcon className="w-3 h-3" />
                        <span className="text-xs font-medium">{st.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#8a8999]">{new Date(p.created_at as string).toLocaleString("vi")}</TableCell>
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
