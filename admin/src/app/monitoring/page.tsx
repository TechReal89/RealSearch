"use client";

import { useEffect, useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, ClientInfo } from "@/lib/api";
import { toast } from "sonner";

export default function MonitoringPage() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastLevel, setBroadcastLevel] = useState("info");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const load = () => {
    adminApi.getClients().then((d) => {
      setClients(d.clients || []);
      setStats(d.stats || {});
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    try {
      await adminApi.broadcast(broadcastMsg, broadcastLevel);
      toast.success("Đã gửi broadcast");
      setBroadcastMsg("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const totalClients = clients.length;
  const availableClients = clients.filter((c) => c.is_available).length;
  const totalTasksRunning = clients.reduce((s, c) => s + c.active_task_count, 0);
  const totalCompleted = clients.reduce((s, c) => s + c.tasks_completed, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Giám sát Real-time</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clients Online</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{totalClients}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sẵn sàng</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">{availableClients}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tasks đang chạy</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-yellow-600">{totalTasksRunning}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng hoàn thành</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{totalCompleted.toLocaleString()}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Broadcast thông báo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Nội dung thông báo..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBroadcast()}
                className="flex-1"
              />
              <Select value={broadcastLevel} onValueChange={setBroadcastLevel}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBroadcast}>Gửi</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Clients đang kết nối ({totalClients})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Job Types</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Heartbeat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Không có client nào đang kết nối</TableCell></TableRow>
                )}
                {clients.map((c) => (
                  <TableRow key={c.session_id}>
                    <TableCell className="font-mono text-xs">{c.session_id.slice(0, 8)}...</TableCell>
                    <TableCell>{c.user_id}</TableCell>
                    <TableCell className="text-xs">{c.os_info || "-"}</TableCell>
                    <TableCell><Badge variant="outline">{c.browser_mode}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(c.enabled_job_types || []).map((jt) => (
                          <Badge key={jt} variant="secondary" className="text-xs">{jt}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600">{c.tasks_completed}</span>
                      {" / "}
                      <span className="text-red-600">{c.tasks_failed}</span>
                      {c.active_task_count > 0 && <span className="text-yellow-600 ml-1">({c.active_task_count} active)</span>}
                    </TableCell>
                    <TableCell className="text-green-600">{c.credits_earned.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_available ? "default" : "secondary"}>
                        {c.is_available ? "Sẵn sàng" : "Bận"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.last_heartbeat).toLocaleTimeString("vi")}
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
