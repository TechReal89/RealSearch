"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi, SecurityOverview } from "@/lib/api";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Ban,
  Unlock,
  Wifi,
  Globe,
  AlertTriangle,
  Clock,
  Lock,
  Server,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function SecurityPage() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [newWhitelistIp, setNewWhitelistIp] = useState("");
  const [newWhitelistNote, setNewWhitelistNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [banningIp, setBanningIp] = useState<string | null>(null);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const result = await adminApi.securityOverview();
      setData(result);
    } catch {
      toast.error("Lỗi tải dữ liệu bảo mật");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleBanIp = async (ip: string) => {
    setBanningIp(ip);
    try {
      const result = await adminApi.banIp(ip);
      if (result.success) {
        toast.success(`Đã chặn IP ${ip}`);
        loadData();
      } else {
        toast.error(result.error || "Lỗi chặn IP");
      }
    } catch {
      toast.error("Lỗi chặn IP");
    } finally {
      setBanningIp(null);
    }
  };

  const handleUnbanIp = async (ip: string, jail: string) => {
    setBanningIp(ip);
    try {
      const result = await adminApi.unbanIp(ip, jail);
      if (result.success) {
        toast.success(`Đã mở chặn IP ${ip}`);
        loadData();
      } else {
        toast.error(result.error || "Lỗi mở chặn IP");
      }
    } catch {
      toast.error("Lỗi mở chặn IP");
    } finally {
      setBanningIp(null);
    }
  };

  const handleWhitelistAdd = async (ip: string, note = "") => {
    try {
      const result = await adminApi.whitelistAdd(ip, note);
      if (result.success) {
        toast.success(result.message || `Đã thêm ${ip}`);
        setNewWhitelistIp("");
        setNewWhitelistNote("");
        loadData();
      } else {
        toast.error(result.error || "Lỗi thêm IP");
      }
    } catch {
      toast.error("Lỗi thêm IP vào danh sách");
    }
  };

  const handleWhitelistRemove = async (ip: string) => {
    try {
      const result = await adminApi.whitelistRemove(ip);
      if (result.success) {
        toast.success(result.message || `Đã xóa ${ip}`);
        loadData();
      } else {
        toast.error(result.error || "Lỗi xóa IP");
      }
    } catch {
      toast.error("Lỗi xóa IP khỏi danh sách");
    }
  };

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Đang tải dữ liệu bảo mật...
        </div>
      </AdminLayout>
    );
  }

  // Prepare chart data
  const hourlyData = (data.ssh.hourly || []).map((item: { time: string; count: number }) => ({
    time: item.time.split(" ")[1] || item.time, // Show only HH:00
    fullTime: item.time,
    count: item.count,
  }));

  // Trend: compare last 2 hours
  const lastHour = hourlyData.length > 0 ? hourlyData[hourlyData.length - 1]?.count || 0 : 0;
  const prevHour = hourlyData.length > 1 ? hourlyData[hourlyData.length - 2]?.count || 0 : 0;
  const trendUp = lastHour > prevHour;
  const trendPct = prevHour > 0 ? Math.round(((lastHour - prevHour) / prevHour) * 100) : 0;

  // Top 5 IPs for pie chart
  const top5Ips = data.ssh.top_attacking_ips.slice(0, 5);
  const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  // Connection by port for bar chart
  const portData = Object.entries(data.connections.by_port || {}).map(([port, count]) => ({
    port: `:${port}`,
    connections: count,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-[#d4a84b]" />
            <div>
              <h2 className="text-2xl font-bold">Bảo mật hệ thống</h2>
              <p className="text-xs text-muted-foreground">
                Cập nhật tự động mỗi 30 giây • Lần cuối: {new Date(data.timestamp).toLocaleTimeString("vi-VN")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="border-[rgba(212,168,75,0.2)] hover:bg-[rgba(212,168,75,0.08)]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SSH Failed Attempts */}
          <Card className={data.ssh.failed_attempts > 100 ? "border-red-500/30 bg-red-950/10" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Tấn công SSH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${
                  data.ssh.failed_attempts > 1000 ? "text-red-500" :
                  data.ssh.failed_attempts > 100 ? "text-yellow-500" : "text-green-500"
                }`}>
                  {data.ssh.failed_attempts.toLocaleString()}
                </span>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">lượt thất bại</span>
                  {trendPct !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${trendUp ? "text-red-400" : "text-green-400"}`}>
                      {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(trendPct)}% so giờ trước
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.ssh.top_attacking_ips.length} IP tấn công phát hiện
              </p>
            </CardContent>
          </Card>

          {/* Banned IPs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Ban className="w-4 h-4" />
                IP bị chặn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-orange-500">
                  {data.fail2ban.total_banned}
                </span>
                <Badge variant={data.fail2ban.active ? "default" : "destructive"} className={
                  data.fail2ban.active
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }>
                  {data.fail2ban.active ? "Fail2ban BẬT" : "Fail2ban TẮT"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.fail2ban.jails.length} jail đang hoạt động
              </p>
            </CardContent>
          </Card>

          {/* Active Connections */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Kết nối đang hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-cyan-500">
                  {data.connections.total}
                </span>
                <span className="text-xs text-muted-foreground">kết nối</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(data.connections.by_port).length} cổng đang sử dụng
              </p>
            </CardContent>
          </Card>

          {/* Firewall Status */}
          <Card className={data.firewall.active ? "border-green-500/20" : "border-red-500/30 bg-red-950/10"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                {data.firewall.active ? (
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <ShieldOff className="w-4 h-4 text-red-500" />
                )}
                Tường lửa (UFW)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${data.firewall.active ? "text-green-500" : "text-red-500"}`}>
                  {data.firewall.active ? "BẬT" : "TẮT"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.firewall.rules.length} quy tắc
                </span>
              </div>
              {!data.firewall.active && (
                <p className="text-xs text-red-400 mt-1">
                  Cảnh báo: Tường lửa đang tắt!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Attack Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-[#d4a84b]" />
                Tần suất tấn công SSH theo giờ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hourlyData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa có dữ liệu thống kê
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="attackGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#8a8999", fontSize: 11 }}
                      tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                      tick={{ fill: "#8a8999", fontSize: 11 }}
                      tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111118",
                        border: "1px solid rgba(212,168,75,0.2)",
                        borderRadius: "8px",
                        color: "#f5f0e8",
                      }}
                      labelFormatter={(label) => `Thời gian: ${label}`}
                      formatter={(value) => [`${Number(value).toLocaleString()} lượt`, "Tấn công"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#attackGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Attackers Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-5 h-5 text-red-500" />
                Top 5 IP tấn công
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Ips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Không có dữ liệu
                </p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={top5Ips}
                        dataKey="count"
                        nameKey="ip"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {top5Ips.map((_: unknown, index: number) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111118",
                          border: "1px solid rgba(212,168,75,0.2)",
                          borderRadius: "8px",
                          color: "#f5f0e8",
                          fontSize: "12px",
                        }}
                        formatter={(value) => [`${Number(value).toLocaleString()} lượt`, "Tấn công"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {top5Ips.map((item: { ip: string; count: number; is_banned: boolean }, i: number) => (
                      <div key={item.ip} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[i] }}
                          />
                          <span className="font-mono text-muted-foreground">{item.ip}</span>
                        </div>
                        <span className="font-bold">{item.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connection by Port Chart */}
        {portData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="w-5 h-5 text-cyan-500" />
                Kết nối theo cổng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={portData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="port"
                    tick={{ fill: "#8a8999", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    tick={{ fill: "#8a8999", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111118",
                      border: "1px solid rgba(212,168,75,0.2)",
                      borderRadius: "8px",
                      color: "#f5f0e8",
                    }}
                    formatter={(value) => [`${Number(value)} kết nối`, "Số lượng"]}
                  />
                  <Bar dataKey="connections" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* SSH Whitelist */}
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              Danh sách IP được phép truy cập SSH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new IP form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập địa chỉ IP (vd: 192.168.1.1)"
                value={newWhitelistIp}
                onChange={(e) => setNewWhitelistIp(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-sm text-[#f5f0e8] placeholder:text-[#555] focus:outline-none focus:border-[#d4a84b] font-mono"
              />
              <input
                type="text"
                placeholder="Ghi chú (tùy chọn)"
                value={newWhitelistNote}
                onChange={(e) => setNewWhitelistNote(e.target.value)}
                className="w-48 px-3 py-2 rounded-md border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-sm text-[#f5f0e8] placeholder:text-[#555] focus:outline-none focus:border-[#d4a84b]"
              />
              <Button
                size="sm"
                onClick={() => handleWhitelistAdd(newWhitelistIp, newWhitelistNote)}
                disabled={!newWhitelistIp.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Thêm
              </Button>
            </div>

            {/* Current whitelist */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                IP đang được phép ({data.whitelist?.whitelist?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-2">
                {(data.whitelist?.whitelist || []).map((entry) => (
                  <div
                    key={entry.ip}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                    <span className="font-mono text-sm text-green-300">{entry.ip}</span>
                    {entry.note && (
                      <span className="text-xs text-muted-foreground">({entry.note})</span>
                    )}
                    <button
                      onClick={() => handleWhitelistRemove(entry.ip)}
                      className="text-red-400 hover:text-red-300 transition-colors ml-1"
                      title="Xóa khỏi danh sách"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(data.whitelist?.whitelist || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có IP nào trong danh sách</p>
                )}
              </div>
            </div>

            {/* Successful SSH IPs not yet whitelisted */}
            {(data.whitelist?.successful_ips || []).filter((s) => !s.whitelisted).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-400 mb-2">
                  IP đã đăng nhập thành công (chưa trong danh sách)
                </h4>
                <div className="space-y-1.5">
                  {(data.whitelist?.successful_ips || [])
                    .filter((s) => !s.whitelisted)
                    .map((s) => (
                      <div
                        key={s.ip}
                        className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/15"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-yellow-300">{s.ip}</span>
                          <span className="text-xs text-muted-foreground">
                            user: <span className="text-[#f5f0e8]">{s.user}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            lần cuối: {s.last_login}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWhitelistAdd(s.ip, `user=${s.user}`)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          <ShieldCheck className="w-4 h-4 mr-1" />
                          Cho phép
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nginx Error Summary */}
        {(data.nginx.status_4xx > 0 || data.nginx.status_5xx > 0) && (
          <Card className={data.nginx.status_5xx > 10 ? "border-red-500/30" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#d4a84b]" />
                Nginx — Lỗi gần đây (1000 request cuối)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div>
                  <span className="text-2xl font-bold text-yellow-500">
                    {data.nginx.status_4xx}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">lỗi 4xx</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-500">
                    {data.nginx.status_5xx}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">lỗi 5xx</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-orange-500">
                    {data.nginx.error_count}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">dòng error log</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Attacking IPs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Danh sách IP tấn công (SSH)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Địa chỉ IP</TableHead>
                  <TableHead>Số lần thử</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ssh.top_attacking_ips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Không phát hiện IP tấn công nào
                    </TableCell>
                  </TableRow>
                )}
                {data.ssh.top_attacking_ips.map((item, i) => (
                  <TableRow key={item.ip}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono font-medium">{item.ip}</TableCell>
                    <TableCell>
                      <span className={`font-mono font-bold ${
                        item.count > 100 ? "text-red-500" :
                        item.count > 50 ? "text-yellow-500" : "text-muted-foreground"
                      }`}>
                        {item.count.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.is_banned ? (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                          <Ban className="w-3 h-3 mr-1" />
                          Đã chặn
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                          Chưa chặn
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.is_banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnbanIp(item.ip, "sshd")}
                          disabled={banningIp === item.ip}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          <Unlock className="w-4 h-4 mr-1" />
                          Mở chặn
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBanIp(item.ip)}
                          disabled={banningIp === item.ip}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Chặn
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Security Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#d4a84b]" />
                Sự kiện bảo mật gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {data.recent_events.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Không có sự kiện nào
                  </p>
                )}
                {data.recent_events.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(212,168,75,0.1)] transition-colors"
                  >
                    <div className="mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">{event.time}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{event.ip}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{event.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fail2ban Jails */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-500" />
                Fail2ban Jails
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.fail2ban.active ? (
                <div className="text-center py-8">
                  <ShieldOff className="w-10 h-10 text-red-500 mx-auto mb-3" />
                  <p className="text-sm text-red-400">Fail2ban không hoạt động</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nên cài đặt fail2ban để bảo vệ server
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.fail2ban.jails.map((jail) => (
                    <div
                      key={jail.name}
                      className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{jail.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                            {jail.currently_banned} đang chặn
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Tổng: {jail.total_banned}
                          </Badge>
                        </div>
                      </div>
                      {jail.banned_ips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {jail.banned_ips.map((ip) => (
                            <div
                              key={ip}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                            >
                              <span className="text-xs font-mono text-red-400">{ip}</span>
                              <button
                                onClick={() => handleUnbanIp(ip, jail.name)}
                                className="text-red-400 hover:text-green-400 transition-colors"
                                title="Mở chặn IP này"
                              >
                                <Unlock className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firewall Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                Quy tắc tường lửa (UFW)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.firewall.rules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {data.firewall.active ? "Không có quy tắc nào" : "UFW chưa được bật"}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                  {data.firewall.rules.map((rule, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] font-mono text-xs text-muted-foreground"
                    >
                      {rule}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Open Ports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-500" />
                Các cổng đang mở
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cổng</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Tiến trình</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.open_ports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}
                  {data.open_ports.map((port) => (
                    <TableRow key={port.port}>
                      <TableCell>
                        <span className="font-mono font-bold text-cyan-400">{port.port}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {port.address}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{port.process || "—"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Nginx Recent Errors */}
        {data.nginx.recent_errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-yellow-500" />
                Nginx — Lỗi gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                {data.nginx.recent_errors.map((error, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded bg-red-500/5 border border-red-500/10 font-mono text-xs text-red-300/80 break-all"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
