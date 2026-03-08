"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, TierConfig } from "@/lib/api";
import { toast } from "sonner";

type SettingItem = { key: string; value: string; display_name: string; description: string; value_type: string };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingItem[]>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<TierConfig[]>([]);

  useEffect(() => {
    adminApi.getSettings().then(setSettings);
    adminApi.listTiers().then(setTiers);
  }, []);

  const handleChange = (key: string, value: string) => {
    setEdited({ ...edited, [key]: value });
  };

  const handleSave = async () => {
    if (Object.keys(edited).length === 0) return;
    try {
      await adminApi.updateSettings(edited);
      toast.success(`Đã cập nhật ${Object.keys(edited).length} cài đặt`);
      setEdited({});
      adminApi.getSettings().then(setSettings);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const categoryLabels: Record<string, string> = {
    credit: "Credit",
    task: "Task",
    general: "Chung",
    security: "Bảo mật",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Cấu hình Hệ thống</h2>
          {Object.keys(edited).length > 0 && (
            <Button onClick={handleSave}>Lưu {Object.keys(edited).length} thay đổi</Button>
          )}
        </div>

        <Tabs defaultValue="credit">
          <TabsList>
            {Object.keys(settings).map((cat) => (
              <TabsTrigger key={cat} value={cat}>{categoryLabels[cat] || cat}</TabsTrigger>
            ))}
            <TabsTrigger value="tiers">Cấp bậc</TabsTrigger>
          </TabsList>

          {Object.entries(settings).map(([cat, items]) => (
            <TabsContent key={cat} value={cat}>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-4">
                    {items.map((item) => (
                      <div key={item.key} className="grid grid-cols-3 items-center gap-4">
                        <div>
                          <Label className="font-medium">{item.display_name}</Label>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Input
                          value={edited[item.key] ?? item.value}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          className={edited[item.key] !== undefined ? "border-blue-500" : ""}
                        />
                        <span className="text-xs text-muted-foreground">{item.key}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="tiers">
            <Card>
              <CardHeader><CardTitle>Cấp bậc thành viên</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {tiers.map((tier) => (
                    <Card key={tier.id} className="border-2" style={{ borderColor: tier.color || "#ccc" }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color || "#ccc" }} />
                          {tier.display_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <p>Giá: {tier.price_monthly.toLocaleString()} VND/tháng</p>
                        <p>Ưu tiên: {tier.priority_level}</p>
                        <p>Credit/ngày: {tier.daily_credit_limit.toLocaleString()}</p>
                        <p>Jobs: {tier.max_jobs} | Clients: {tier.max_clients}</p>
                        <p>Hệ số: {tier.credit_earn_multiplier}x</p>
                        <div className="pt-2 flex flex-wrap gap-1">
                          {tier.allow_keyword_seo && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">SEO</span>}
                          {tier.allow_backlink && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Backlink</span>}
                          {tier.allow_social_media && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Social</span>}
                          {tier.allow_proxy && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Proxy</span>}
                          {tier.allow_scheduling && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Hẹn giờ</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
