"use client";

import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, ServerMetrics, ProcessInfo, DockerContainer } from "@/lib/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function ProgressBar({ value, max = 100, color = "blue" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClass =
    pct > 90 ? "bg-red-500" :
    pct > 70 ? "bg-yellow-500" :
    color === "green" ? "bg-green-500" :
    color === "purple" ? "bg-purple-500" :
    "bg-blue-500";

  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ServerMonitorPage() {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [history, setHistory] = useState<ServerMetrics[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [docker, setDocker] = useState<{ available: boolean; containers?: DockerContainer[] } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadMetrics = () => {
    adminApi.serverMetrics().then(setMetrics).catch(() => {});
  };

  const loadProcesses = () => {
    adminApi.serverProcesses().then((d) => setProcesses(d.processes || [])).catch(() => {});
  };

  const loadDocker = () => {
    adminApi.serverDocker().then(setDocker).catch(() => {});
  };

  const loadHistory = () => {
    adminApi.serverHistory(10).then((d) => setHistory(d.data || [])).catch(() => {});
  };

  useEffect(() => {
    loadMetrics();
    loadProcesses();
    loadDocker();
    loadHistory();
    intervalRef.current = setInterval(() => {
      loadMetrics();
      loadProcesses();
    }, 5000);
    const dockerInterval = setInterval(loadDocker, 15000);
    const historyInterval = setInterval(loadHistory, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(dockerInterval);
      clearInterval(historyInterval);
    };
  }, []);

  if (!metrics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Đang tải dữ liệu máy chủ...</div>
      </AdminLayout>
    );
  }

  const cpuHistory = history.map(h => h.cpu.percent);
  const memHistory = history.map(h => h.memory.percent);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Giám sát Máy chủ</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Uptime: {formatUptime(metrics.system.uptime_seconds)}</Badge>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Alerts */}
        {metrics.alerts && metrics.alerts.length > 0 && (
          <div className="space-y-2">
            {metrics.alerts.map((alert, i) => (
              <div key={i} className={`p-3 rounded-lg border ${alert.level === "error" ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300" : "bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300"}`}>
                {alert.level === "error" ? "[!] " : "[~] "}{alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Main metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">CPU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${metrics.cpu.percent > 90 ? "text-red-600" : metrics.cpu.percent > 70 ? "text-yellow-600" : "text-blue-600"}`}>
                  {metrics.cpu.percent}%
                </span>
                <span className="text-sm text-muted-foreground">{metrics.cpu.count} cores</span>
              </div>
              <ProgressBar value={metrics.cpu.percent} />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Load avg:</span>
                  <span className="font-mono">{metrics.cpu.load_1m} / {metrics.cpu.load_5m} / {metrics.cpu.load_15m}</span>
                </div>
                {metrics.cpu.freq_mhz > 0 && (
                  <div className="flex justify-between">
                    <span>Freq:</span>
                    <span className="font-mono">{metrics.cpu.freq_mhz} MHz</span>
                  </div>
                )}
              </div>
              {/* Mini chart */}
              {cpuHistory.length > 1 && (
                <div className="flex items-end gap-px h-8">
                  {cpuHistory.slice(-30).map((v, i) => (
                    <div key={i} className={`flex-1 rounded-t ${v > 90 ? "bg-red-400" : v > 70 ? "bg-yellow-400" : "bg-blue-400"}`}
                      style={{ height: `${Math.max(v, 2)}%` }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">RAM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${metrics.memory.percent > 90 ? "text-red-600" : metrics.memory.percent > 80 ? "text-yellow-600" : "text-green-600"}`}>
                  {metrics.memory.percent}%
                </span>
                <span className="text-sm text-muted-foreground">{metrics.memory.total_gb} GB</span>
              </div>
              <ProgressBar value={metrics.memory.percent} color="green" />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Đã dùng:</span>
                  <span className="font-mono">{metrics.memory.used_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Khả dụng:</span>
                  <span className="font-mono">{metrics.memory.available_gb} GB</span>
                </div>
                {metrics.memory.swap_total_gb > 0 && (
                  <div className="flex justify-between">
                    <span>Swap:</span>
                    <span className="font-mono">{metrics.memory.swap_used_gb}/{metrics.memory.swap_total_gb} GB ({metrics.memory.swap_percent}%)</span>
                  </div>
                )}
              </div>
              {memHistory.length > 1 && (
                <div className="flex items-end gap-px h-8">
                  {memHistory.slice(-30).map((v, i) => (
                    <div key={i} className={`flex-1 rounded-t ${v > 90 ? "bg-red-400" : v > 80 ? "bg-yellow-400" : "bg-green-400"}`}
                      style={{ height: `${Math.max(v, 2)}%` }} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disk */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">O dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className={`text-3xl font-bold ${metrics.disk.percent > 90 ? "text-red-600" : metrics.disk.percent > 80 ? "text-yellow-600" : "text-purple-600"}`}>
                  {metrics.disk.percent}%
                </span>
                <span className="text-sm text-muted-foreground">{metrics.disk.total_gb} GB</span>
              </div>
              <ProgressBar value={metrics.disk.percent} color="purple" />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Đã dùng:</span>
                  <span className="font-mono">{metrics.disk.used_gb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Còn trống:</span>
                  <span className="font-mono">{metrics.disk.free_gb} GB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Mang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-cyan-600">{metrics.network.connections}</span>
                <span className="text-sm text-muted-foreground">connections</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Upload:</span>
                  <span className="font-mono text-green-600">
                    {metrics.network.speed ? formatBytes(metrics.network.speed.sent_per_sec) + "/s" : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Download:</span>
                  <span className="font-mono text-blue-600">
                    {metrics.network.speed ? formatBytes(metrics.network.speed.recv_per_sec) + "/s" : "-"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t">
                  <span>Total sent:</span>
                  <span className="font-mono">{formatBytes(metrics.network.bytes_sent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total recv:</span>
                  <span className="font-mono">{formatBytes(metrics.network.bytes_recv)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Docker containers */}
        {docker?.available && docker.containers && docker.containers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Docker Containers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container</TableHead>
                    <TableHead>CPU</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Mem %</TableHead>
                    <TableHead>Network I/O</TableHead>
                    <TableHead>PIDs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docker.containers.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono">{c.cpu}</TableCell>
                      <TableCell className="font-mono text-xs">{c.mem_usage}</TableCell>
                      <TableCell className="font-mono">{c.mem_percent}</TableCell>
                      <TableCell className="font-mono text-xs">{c.net_io}</TableCell>
                      <TableCell className="font-mono">{c.pids}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Top processes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Processes (CPU & RAM)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>CPU %</TableHead>
                  <TableHead>RAM %</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Không có dữ liệu</TableCell></TableRow>
                )}
                {processes.slice(0, 15).map((p) => (
                  <TableRow key={p.pid}>
                    <TableCell className="font-mono text-sm">{p.pid}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className={`font-mono ${p.cpu_percent > 50 ? "text-red-600" : p.cpu_percent > 20 ? "text-yellow-600" : ""}`}>
                        {p.cpu_percent}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono ${p.memory_percent > 20 ? "text-red-600" : p.memory_percent > 10 ? "text-yellow-600" : ""}`}>
                        {p.memory_percent}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "running" ? "default" : "secondary"} className="text-xs">
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
