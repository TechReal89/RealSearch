"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  Landmark,
  Smartphone,
  Shield,
  Settings2,
  TrendingUp,
  Zap,
  CircleDollarSign,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { adminApi, Payment, PaymentChannelConfig } from "@/lib/api";
import { toast } from "sonner";

// ---- Channel visual configs ----
const CHANNEL_VISUALS: Record<string, {
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  description: string;
}> = {
  momo: {
    icon: <Smartphone className="w-7 h-7" />,
    gradient: "from-pink-500 to-rose-600",
    accent: "text-pink-600 dark:text-pink-400",
    description: "Vi dien tu MoMo - Thanh toan nhanh bang QR code",
  },
  sepay: {
    icon: <Zap className="w-7 h-7" />,
    gradient: "from-blue-500 to-indigo-600",
    accent: "text-blue-600 dark:text-blue-400",
    description: "SePay Gateway - Tu dong xac nhan chuyen khoan ngan hang",
  },
  bank_transfer: {
    icon: <Landmark className="w-7 h-7" />,
    gradient: "from-emerald-500 to-teal-600",
    accent: "text-emerald-600 dark:text-emerald-400",
    description: "Chuyen khoan truc tiep - Xac nhan thu cong hoac tu dong",
  },
};

const CHANNEL_CONFIG_FIELDS: Record<string, { key: string; label: string; type?: string; placeholder?: string; icon?: React.ReactNode }[]> = {
  momo: [
    { key: "partner_code", label: "Partner Code", placeholder: "MOMO_PARTNER_CODE", icon: <CreditCard className="w-4 h-4" /> },
    { key: "access_key", label: "Access Key", placeholder: "Access key tu MoMo Business", icon: <Shield className="w-4 h-4" /> },
    { key: "secret_key", label: "Secret Key", type: "password", placeholder: "Secret key tu MoMo Business", icon: <Shield className="w-4 h-4" /> },
    { key: "endpoint", label: "API Endpoint", placeholder: "https://payment.momo.vn/v2/gateway/api/create", icon: <ExternalLink className="w-4 h-4" /> },
    { key: "return_url", label: "Return URL", placeholder: "https://realsearch.techreal.vn/payments/result", icon: <ExternalLink className="w-4 h-4" /> },
    { key: "notify_url", label: "IPN Callback URL", placeholder: "https://api.realsearch.techreal.vn/api/v1/payments/callback/momo", icon: <ExternalLink className="w-4 h-4" /> },
  ],
  sepay: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "API key tu SePay.vn", icon: <Shield className="w-4 h-4" /> },
    { key: "bank_name", label: "Ngan hang", placeholder: "MB Bank / Vietcombank / ...", icon: <Landmark className="w-4 h-4" /> },
    { key: "account_number", label: "So tai khoan", placeholder: "0123456789", icon: <CreditCard className="w-4 h-4" /> },
    { key: "account_name", label: "Chu tai khoan", placeholder: "NGUYEN VAN A", icon: <CreditCard className="w-4 h-4" /> },
    { key: "branch", label: "Chi nhanh", placeholder: "Ho Chi Minh", icon: <Landmark className="w-4 h-4" /> },
  ],
  bank_transfer: [
    { key: "bank_name", label: "Ngan hang", placeholder: "Vietcombank / MB Bank / ...", icon: <Landmark className="w-4 h-4" /> },
    { key: "account_number", label: "So tai khoan", placeholder: "0123456789", icon: <CreditCard className="w-4 h-4" /> },
    { key: "account_name", label: "Chu tai khoan", placeholder: "NGUYEN VAN A", icon: <CreditCard className="w-4 h-4" /> },
    { key: "branch", label: "Chi nhanh", placeholder: "Ho Chi Minh", icon: <Landmark className="w-4 h-4" /> },
  ],
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: {
    label: "Cho xu ly",
    icon: <Clock className="w-3.5 h-3.5" />,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  completed: {
    label: "Thanh cong",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  failed: {
    label: "That bai",
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
  refunded: {
    label: "Hoan tien",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700",
  },
};

const PURPOSE_MAP: Record<string, string> = {
  buy_credit: "Nap Credit",
  buy_tier: "Nang cap VIP",
  buy_both: "Credit + VIP",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total_revenue: number; total_payments: number; pending_payments: number } | null>(null);
  const [channels, setChannels] = useState<PaymentChannelConfig[]>([]);
  const [editChannel, setEditChannel] = useState<PaymentChannelConfig | null>(null);
  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [channelForm, setChannelForm] = useState<{
    display_name: string;
    config: Record<string, string>;
    is_active: boolean;
    fee_percent: string;
    min_amount: string;
    max_amount: string;
  }>({
    display_name: "",
    config: {},
    is_active: true,
    fee_percent: "0",
    min_amount: "10000",
    max_amount: "10000000",
  });

  const loadPayments = () => {
    adminApi.listPayments("page_size=50").then((d) => { setPayments(d.payments); setTotal(d.total); }).catch(() => {});
    adminApi.paymentStats().then(setStats).catch(() => {});
  };

  const loadChannels = () => {
    adminApi.listChannels().then((d) => setChannels(d.channels || [])).catch(() => {});
  };

  useEffect(() => { loadPayments(); loadChannels(); }, []);

  const handleConfirm = async (id: number) => {
    if (!confirm("Xac nhan thanh toan nay? Credit/Tier se duoc cap cho user.")) return;
    try { await adminApi.confirmPayment(id); toast.success("Thanh toan da duoc xac nhan thanh cong"); loadPayments(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const handleRefund = async (id: number) => {
    if (!confirm("Hoan tien giao dich nay? Credit/Tier se bi thu hoi.")) return;
    try { await adminApi.refundPayment(id); toast.success("Da hoan tien thanh cong"); loadPayments(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Loi"); }
  };

  const openChannelEdit = (ch: PaymentChannelConfig) => {
    setEditChannel(ch);
    setChannelForm({
      display_name: ch.display_name,
      config: { ...ch.config },
      is_active: ch.is_active,
      fee_percent: String(ch.fee_percent),
      min_amount: String(ch.min_amount),
      max_amount: String(ch.max_amount),
    });
    setShowPasswords({});
    setShowChannelDialog(true);
  };

  const handleChannelSave = async () => {
    if (!editChannel) return;
    try {
      await adminApi.updateChannel(editChannel.id, {
        display_name: channelForm.display_name,
        config: channelForm.config,
        is_active: channelForm.is_active,
        fee_percent: parseFloat(channelForm.fee_percent) || 0,
        min_amount: parseFloat(channelForm.min_amount) || 10000,
        max_amount: parseFloat(channelForm.max_amount) || 10000000,
      } as Partial<PaymentChannelConfig>);
      toast.success("Da cap nhat kenh thanh toan");
      setShowChannelDialog(false);
      loadChannels();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Loi");
    }
  };

  const updateConfigField = (key: string, value: string) => {
    setChannelForm(f => ({ ...f, config: { ...f.config, [key]: value } }));
  };

  const togglePassword = (key: string) => {
    setShowPasswords(p => ({ ...p, [key]: !p[key] }));
  };

  const configFields = editChannel ? (CHANNEL_CONFIG_FIELDS[editChannel.name] || []) : [];
  const channelVisual = editChannel ? (CHANNEL_VISUALS[editChannel.name] || CHANNEL_VISUALS.bank_transfer) : null;

  // Filter payments
  const filteredPayments = filterStatus === "all" ? payments : payments.filter(p => p.status === filterStatus);

  // Count config completeness
  const getConfigComplete = (ch: PaymentChannelConfig) => {
    const fields = CHANNEL_CONFIG_FIELDS[ch.name] || [];
    if (fields.length === 0) return 100;
    const filled = fields.filter(f => ch.config?.[f.key] && ch.config[f.key].length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* ===== Header ===== */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Thanh toan</h2>
          <p className="text-muted-foreground mt-1">Quan ly giao dich va cau hinh kenh thanh toan</p>
        </div>

        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="channels" className="text-sm font-medium gap-2 h-10">
              <Settings2 className="w-4 h-4" />
              Kenh thanh toan
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-sm font-medium gap-2 h-10">
              <Wallet className="w-4 h-4" />
              Giao dich
            </TabsTrigger>
          </TabsList>

          {/* ========================================= */}
          {/* ===== TAB: KENH THANH TOAN (Premium) ===== */}
          {/* ========================================= */}
          <TabsContent value="channels" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {channels.map((ch) => {
                const visual = CHANNEL_VISUALS[ch.name] || CHANNEL_VISUALS.bank_transfer;
                const completePct = getConfigComplete(ch);
                const isReady = ch.is_active && completePct === 100;

                return (
                  <Card key={ch.id} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    {/* Gradient header */}
                    <div className={`bg-gradient-to-r ${visual.gradient} p-6 text-white`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                            {visual.icon}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{ch.display_name}</h3>
                            <p className="text-white/70 text-sm font-mono">{ch.name}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          isReady
                            ? "bg-white/25 text-white backdrop-blur-sm"
                            : !ch.is_active
                            ? "bg-black/20 text-white/60"
                            : "bg-yellow-400/30 text-yellow-100"
                        }`}>
                          {isReady ? "San sang" : !ch.is_active ? "Tat" : "Chua hoan tat"}
                        </div>
                      </div>

                      <p className="text-white/60 text-xs mt-3">{visual.description}</p>
                    </div>

                    <CardContent className="p-5 space-y-4">
                      {/* Config progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Cau hinh</span>
                          <span className={`text-xs font-bold ${completePct === 100 ? "text-emerald-600" : "text-amber-600"}`}>{completePct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${completePct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: `${completePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Config fields status */}
                      <div className="space-y-2">
                        {(CHANNEL_CONFIG_FIELDS[ch.name] || []).map((field) => {
                          const val = ch.config?.[field.key];
                          const hasValue = val && val.length > 0;
                          return (
                            <div key={field.key} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                {hasValue ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                )}
                                <span className="text-sm text-muted-foreground">{field.label}</span>
                              </div>
                              {hasValue ? (
                                <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                                  {field.type === "password" ? "****" + val.slice(-4) : val}
                                </span>
                              ) : (
                                <span className="text-xs text-amber-500 font-medium">Chua nhap</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Fee & limits */}
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-dashed">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CircleDollarSign className="w-3.5 h-3.5" />
                          <span>Phi: <span className="font-semibold text-foreground">{ch.fee_percent}%</span></span>
                        </div>
                        <span className="text-muted-foreground">
                          {(ch.min_amount / 1000).toFixed(0)}K - {(ch.max_amount / 1000000).toFixed(0)}M VND
                        </span>
                      </div>

                      {/* Action */}
                      <Button
                        className="w-full group/btn"
                        variant={isReady ? "outline" : "default"}
                        onClick={() => openChannelEdit(ch)}
                      >
                        <Settings2 className="w-4 h-4 mr-2 group-hover/btn:rotate-90 transition-transform duration-300" />
                        {isReady ? "Chinh sua cau hinh" : "Cau hinh ngay"}
                        <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}

              {channels.length === 0 && (
                <Card className="col-span-3 border-dashed">
                  <CardContent className="py-16 text-center">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Chua co kenh thanh toan. Chay seed de tao mac dinh.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ====================================== */}
          {/* ===== TAB: GIAO DICH (Premium) ======= */}
          {/* ====================================== */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="relative overflow-hidden border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tong Doanh Thu</p>
                      <p className="text-3xl font-bold mt-2 tracking-tight">
                        {stats ? `${(stats.total_revenue / 1000).toFixed(0)}K` : "--"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">VND</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
                      <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tong Giao Dich</p>
                      <p className="text-3xl font-bold mt-2 tracking-tight">
                        {stats?.total_payments ?? "--"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">giao dich</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/50">
                      <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/5" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cho Xu Ly</p>
                      <p className="text-3xl font-bold mt-2 tracking-tight text-amber-600">
                        {stats?.pending_payments ?? "--"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">can xac nhan</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50">
                      <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-2">
              {["all", "pending", "completed", "failed", "refunded"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={filterStatus === s ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Tat ca" : STATUS_CONFIG[s]?.label || s}
                  {s === "pending" && stats?.pending_payments ? (
                    <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                      {stats.pending_payments}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>

            {/* Transaction table */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Ma giao dich</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Muc dich</TableHead>
                    <TableHead className="font-semibold text-right">So tien</TableHead>
                    <TableHead className="font-semibold text-right">Credits</TableHead>
                    <TableHead className="font-semibold">Trang thai</TableHead>
                    <TableHead className="font-semibold">Thoi gian</TableHead>
                    <TableHead className="font-semibold text-right">Thao tac</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <Wallet className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground">Khong co giao dich nao</p>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredPayments.map((p) => {
                    const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              #{p.id}
                            </div>
                            <span className="font-mono text-xs text-muted-foreground">{p.transaction_id?.slice(0, 15)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                              {p.user_id}
                            </div>
                            User #{p.user_id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {PURPOSE_MAP[p.purpose] || p.purpose}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold tabular-nums">{p.amount.toLocaleString()}</span>
                          <span className="text-muted-foreground text-xs ml-1">VND</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.credit_amount ? (
                            <span className="tabular-nums">
                              {p.credit_amount.toLocaleString()}
                              {p.bonus_credit > 0 && (
                                <span className="text-emerald-600 text-xs font-medium ml-1">+{p.bonus_credit}</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.className}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div>{new Date(p.created_at).toLocaleDateString("vi")}</div>
                            <div className="text-muted-foreground">{new Date(p.created_at).toLocaleTimeString("vi")}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {p.status === "pending" && (
                              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => handleConfirm(p.id)}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Duyet
                              </Button>
                            )}
                            {p.status === "completed" && (
                              <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRefund(p.id)}>
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Hoan
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ========================================= */}
        {/* ===== DIALOG CAU HINH (Premium) ========= */}
        {/* ========================================= */}
        <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
            {/* Dialog header with gradient */}
            {channelVisual && (
              <div className={`bg-gradient-to-r ${channelVisual.gradient} p-6 text-white rounded-t-lg`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    {channelVisual.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-white">
                      Cau hinh {editChannel?.display_name}
                    </DialogTitle>
                    <p className="text-white/70 text-sm mt-0.5">{channelVisual.description}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Status toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${channelForm.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-gray-300"}`} />
                  <div>
                    <Label className="font-semibold">Trang thai kenh</Label>
                    <p className="text-xs text-muted-foreground">
                      {channelForm.is_active ? "Dang bat - User co the thanh toan qua kenh nay" : "Dang tat - An voi user"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={channelForm.is_active}
                  onCheckedChange={(checked) => setChannelForm(f => ({ ...f, is_active: checked }))}
                />
              </div>

              {/* Display name */}
              <div>
                <Label className="text-sm font-semibold">Ten hien thi</Label>
                <Input
                  className="mt-1.5"
                  value={channelForm.display_name}
                  onChange={(e) => setChannelForm(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>

              {/* Fee & Limits */}
              <div>
                <Label className="text-sm font-semibold">Phi & Gioi han</Label>
                <div className="grid grid-cols-3 gap-3 mt-1.5">
                  <div>
                    <span className="text-xs text-muted-foreground">Phi giao dich (%)</span>
                    <Input type="number" step="0.1" value={channelForm.fee_percent}
                      onChange={(e) => setChannelForm(f => ({ ...f, fee_percent: e.target.value }))} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Toi thieu (VND)</span>
                    <Input type="number" value={channelForm.min_amount}
                      onChange={(e) => setChannelForm(f => ({ ...f, min_amount: e.target.value }))} />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Toi da (VND)</span>
                    <Input type="number" value={channelForm.max_amount}
                      onChange={(e) => setChannelForm(f => ({ ...f, max_amount: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Channel-specific config */}
              {configFields.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Thong tin ket noi</Label>
                  </div>
                  {configFields.map((field) => (
                    <div key={field.key}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {field.icon && <span className="text-muted-foreground">{field.icon}</span>}
                        <Label className="text-sm">{field.label}</Label>
                      </div>
                      <div className="relative">
                        <Input
                          type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                          placeholder={field.placeholder}
                          value={channelForm.config[field.key] || ""}
                          onChange={(e) => updateConfigField(field.key, e.target.value)}
                          className="pr-10"
                        />
                        {field.type === "password" && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => togglePassword(field.key)}
                          >
                            {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw JSON for unknown types */}
              {configFields.length === 0 && editChannel && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-sm font-semibold">Config (JSON)</Label>
                  <textarea
                    className="w-full h-32 font-mono text-sm border rounded-lg p-3 bg-muted/30"
                    value={JSON.stringify(channelForm.config, null, 2)}
                    onChange={(e) => {
                      try { setChannelForm(f => ({ ...f, config: JSON.parse(e.target.value) })); } catch { /* typing */ }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="border-t p-4 flex justify-end gap-3 bg-muted/30">
              <Button variant="outline" onClick={() => setShowChannelDialog(false)}>Huy bo</Button>
              <Button onClick={handleChannelSave} className="min-w-[120px]">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Luu thay doi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
