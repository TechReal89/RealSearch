"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, License, LicenseProduct, LicensePlan, LicenseDevice, LicenseLog, LicenseStats } from "@/lib/api";
import { toast } from "sonner";
import { Copy, Download, Trash2, Eye, Plus, KeyRound, Package, LayoutList } from "lucide-react";

// ==================== STATUS HELPERS ====================
const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Hoạt động", variant: "default" },
  expired: { label: "Hết hạn", variant: "destructive" },
  revoked: { label: "Thu hồi", variant: "destructive" },
  suspended: { label: "Tạm ngưng", variant: "secondary" },
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success("Đã copy!");
}

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("vi", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDuration(days: number) {
  if (days === 0) return "Vĩnh viễn";
  if (days >= 365) return `${Math.round(days / 365)} năm`;
  if (days >= 30) return `${Math.round(days / 30)} tháng`;
  return `${days} ngày`;
}

// ==================== MAIN PAGE ====================
export default function LicensesPage() {
  const [tab, setTab] = useState("licenses");
  const [stats, setStats] = useState<LicenseStats | null>(null);
  const [products, setProducts] = useState<LicenseProduct[]>([]);
  const [plans, setPlans] = useState<LicensePlan[]>([]);

  // License list state
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Dialogs
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showBatchResult, setShowBatchResult] = useState(false);
  const [batchKeys, setBatchKeys] = useState<string[]>([]);

  // Form states
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productForm, setProductForm] = useState({ name: "", slug: "", description: "", icon_url: "", latest_version: "", download_url: "" });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planForm, setPlanForm] = useState({ product_id: "", name: "", duration_days: "", price: "", max_devices: "1" });
  const [licenseForm, setLicenseForm] = useState({ product_id: "", plan_id: "", customer_name: "", customer_email: "", max_devices: "1", duration_days: "", note: "" });
  const [batchForm, setBatchForm] = useState({ product_id: "", plan_id: "", quantity: "10", max_devices: "1", duration_days: "", note: "" });

  // Detail view
  const [detailLicense, setDetailLicense] = useState<License | null>(null);
  const [detailDevices, setDetailDevices] = useState<LicenseDevice[]>([]);
  const [detailLogs, setDetailLogs] = useState<LicenseLog[]>([]);

  // ==================== LOAD DATA ====================
  const loadStats = useCallback(() => {
    adminApi.licenseStats().then(setStats).catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    adminApi.listProducts().then(setProducts).catch(() => {});
  }, []);

  const loadPlans = useCallback(() => {
    adminApi.listPlans().then(setPlans).catch(() => {});
  }, []);

  const loadLicenses = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", "20");
    if (filterProduct !== "all") params.set("product_id", filterProduct);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (search) params.set("search", search);
    adminApi.listLicenses(params.toString()).then((d) => {
      setLicenses(d.licenses || []);
      setTotal(d.total || 0);
    }).catch(() => {});
  }, [page, filterProduct, filterStatus, search]);

  useEffect(() => {
    loadStats();
    loadProducts();
    loadPlans();
  }, []);

  useEffect(() => { loadLicenses(); }, [page, filterProduct, filterStatus, search]);

  // ==================== PRODUCT HANDLERS ====================
  const openProductCreate = () => {
    setEditingProductId(null);
    setProductForm({ name: "", slug: "", description: "", icon_url: "", latest_version: "", download_url: "" });
    setShowProductDialog(true);
  };

  const openProductEdit = (p: LicenseProduct) => {
    setEditingProductId(p.id);
    setProductForm({ name: p.name, slug: p.slug, description: p.description || "", icon_url: p.icon_url || "", latest_version: p.latest_version || "", download_url: p.download_url || "" });
    setShowProductDialog(true);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.slug) { toast.error("Tên và slug bắt buộc"); return; }
    try {
      if (editingProductId) {
        await adminApi.updateProduct(editingProductId, productForm as Partial<LicenseProduct>);
        toast.success("Cập nhật thành công");
      } else {
        await adminApi.createProduct(productForm as Partial<LicenseProduct>);
        toast.success("Tạo sản phẩm thành công");
      }
      setShowProductDialog(false);
      loadProducts();
      loadStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Xoá sản phẩm này?")) return;
    try {
      await adminApi.deleteProduct(id);
      toast.success("Đã xoá");
      loadProducts();
      loadStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  // ==================== PLAN HANDLERS ====================
  const openPlanCreate = () => {
    setEditingPlanId(null);
    setPlanForm({ product_id: products[0]?.id?.toString() || "", name: "", duration_days: "30", price: "", max_devices: "1" });
    setShowPlanDialog(true);
  };

  const openPlanEdit = (p: LicensePlan) => {
    setEditingPlanId(p.id);
    setPlanForm({ product_id: String(p.product_id), name: p.name, duration_days: String(p.duration_days), price: String(p.price), max_devices: String(p.max_devices) });
    setShowPlanDialog(true);
  };

  const savePlan = async () => {
    if (!planForm.product_id || !planForm.name) { toast.error("Vui lòng điền đầy đủ"); return; }
    try {
      const payload = { product_id: parseInt(planForm.product_id), name: planForm.name, duration_days: parseInt(planForm.duration_days) || 0, price: parseInt(planForm.price) || 0, max_devices: parseInt(planForm.max_devices) || 1 };
      if (editingPlanId) {
        await adminApi.updatePlan(editingPlanId, payload);
        toast.success("Cập nhật thành công");
      } else {
        await adminApi.createPlan(payload);
        toast.success("Tạo gói thành công");
      }
      setShowPlanDialog(false);
      loadPlans();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const deletePlan = async (id: number) => {
    if (!confirm("Xoá gói license này?")) return;
    try {
      await adminApi.deletePlan(id);
      toast.success("Đã xoá");
      loadPlans();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  // ==================== LICENSE HANDLERS ====================
  const openLicenseCreate = () => {
    setLicenseForm({ product_id: products[0]?.id?.toString() || "", plan_id: "", customer_name: "", customer_email: "", max_devices: "1", duration_days: "", note: "" });
    setShowLicenseDialog(true);
  };

  const saveLicense = async () => {
    if (!licenseForm.product_id) { toast.error("Chọn sản phẩm"); return; }
    try {
      const payload: Record<string, unknown> = {
        product_id: parseInt(licenseForm.product_id),
        plan_id: licenseForm.plan_id ? parseInt(licenseForm.plan_id) : null,
        customer_name: licenseForm.customer_name || null,
        customer_email: licenseForm.customer_email || null,
        max_devices: parseInt(licenseForm.max_devices) || 1,
        duration_days: licenseForm.duration_days ? parseInt(licenseForm.duration_days) : null,
        note: licenseForm.note || null,
      };
      const result = await adminApi.createLicense(payload);
      toast.success(`License tạo thành công: ${result.license_key}`);
      copyToClipboard(result.license_key);
      setShowLicenseDialog(false);
      loadLicenses();
      loadStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const openBatchCreate = () => {
    setBatchForm({ product_id: products[0]?.id?.toString() || "", plan_id: "", quantity: "10", max_devices: "1", duration_days: "", note: "" });
    setShowBatchDialog(true);
  };

  const saveBatch = async () => {
    if (!batchForm.product_id || !batchForm.quantity) { toast.error("Chọn sản phẩm và số lượng"); return; }
    try {
      const payload: Record<string, unknown> = {
        product_id: parseInt(batchForm.product_id),
        plan_id: batchForm.plan_id ? parseInt(batchForm.plan_id) : null,
        quantity: parseInt(batchForm.quantity),
        max_devices: parseInt(batchForm.max_devices) || 1,
        duration_days: batchForm.duration_days ? parseInt(batchForm.duration_days) : null,
        note: batchForm.note || null,
      };
      const result = await adminApi.createLicenseBatch(payload);
      setBatchKeys(result.keys);
      setShowBatchDialog(false);
      setShowBatchResult(true);
      loadLicenses();
      loadStats();
      toast.success(`Đã tạo ${result.count} license keys`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const updateLicenseStatus = async (id: number, status: string) => {
    const labels: Record<string, string> = { revoked: "thu hồi", suspended: "tạm ngưng", active: "kích hoạt lại" };
    if (!confirm(`Bạn muốn ${labels[status] || status} license này?`)) return;
    try {
      await adminApi.updateLicense(id, { status } as Partial<License>);
      toast.success("Cập nhật thành công");
      loadLicenses();
      loadStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const deleteLicense = async (id: number) => {
    if (!confirm("Xoá license này? (không thể hoàn tác)")) return;
    try {
      await adminApi.deleteLicense(id);
      toast.success("Đã xoá");
      loadLicenses();
      loadStats();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  // Detail view
  const openDetail = async (lic: License) => {
    setDetailLicense(lic);
    setShowDetailDialog(true);
    try {
      const [devices, logs] = await Promise.all([
        adminApi.licenseDevices(lic.id),
        adminApi.licenseLogs(lic.id),
      ]);
      setDetailDevices(devices);
      setDetailLogs(logs);
    } catch { }
  };

  const removeDevice = async (deviceId: number) => {
    if (!confirm("Gỡ thiết bị này?")) return;
    try {
      await adminApi.removeDevice(deviceId);
      toast.success("Đã gỡ thiết bị");
      if (detailLicense) {
        const devices = await adminApi.licenseDevices(detailLicense.id);
        setDetailDevices(devices);
      }
      loadLicenses();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (filterProduct !== "all") params.set("product_id", filterProduct);
    if (filterStatus !== "all") params.set("status", filterStatus);
    const token = typeof window !== "undefined" ? localStorage.getItem("realsearch_access_token") : "";
    const url = `${process.env.NEXT_PUBLIC_API_URL || "https://api.realsearch.techreal.vn"}/api/v1/admin/license/licenses/export/csv?${params.toString()}`;
    window.open(url + `&token=${token}`, "_blank");
  };

  const copyAllKeys = () => {
    copyToClipboard(batchKeys.join("\n"));
  };

  const plansForProduct = (productId: string) => plans.filter(p => String(p.product_id) === productId);

  // ==================== RENDER ====================
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Quản lý License</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openLicenseCreate}><Plus className="w-4 h-4 mr-1" /> Tạo key</Button>
            <Button onClick={openBatchCreate}><KeyRound className="w-4 h-4 mr-1" /> Tạo hàng loạt</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sản phẩm</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.products_count || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tổng License</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats?.total_licenses || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Đang hoạt động</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-green-600">{stats?.by_status?.active || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Thiết bị online</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">{stats?.active_devices || 0}</div></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="licenses"><KeyRound className="w-4 h-4 mr-1" /> Licenses</TabsTrigger>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" /> Sản phẩm</TabsTrigger>
            <TabsTrigger value="plans"><LayoutList className="w-4 h-4 mr-1" /> Gói license</TabsTrigger>
          </TabsList>

          {/* ==================== TAB: LICENSES ==================== */}
          <TabsContent value="licenses" className="space-y-4">
            <div className="flex gap-3 items-center">
              <Input placeholder="Tìm key, tên, email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
              <Select value={filterProduct} onValueChange={(v) => { setFilterProduct(v ?? "all"); setPage(1); }}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Sản phẩm" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                  {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v ?? "all"); setPage(1); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="expired">Hết hạn</SelectItem>
                  <SelectItem value="revoked">Thu hồi</SelectItem>
                  <SelectItem value="suspended">Tạm ngưng</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Key</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Gói</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Thiết bị</TableHead>
                      <TableHead>Hết hạn</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chưa có license</TableCell></TableRow>
                    )}
                    {licenses.map(lic => (
                      <TableRow key={lic.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">{lic.license_key}</code>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(lic.license_key)}><Copy className="w-3 h-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{lic.product_name || "-"}</TableCell>
                        <TableCell className="text-sm">{lic.plan_name || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {lic.customer_name || lic.customer_email || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm">{lic.current_devices}/{lic.max_devices}</TableCell>
                        <TableCell className="text-sm">{formatDate(lic.expires_at)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_MAP[lic.status]?.variant || "secondary"}>
                            {STATUS_MAP[lic.status]?.label || lic.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(lic)}><Eye className="w-3.5 h-3.5" /></Button>
                            {lic.status === "active" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateLicenseStatus(lic.id, "suspended")}>Ngưng</Button>
                            )}
                            {lic.status === "suspended" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateLicenseStatus(lic.id, "active")}>Mở</Button>
                            )}
                            {lic.status !== "revoked" && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateLicenseStatus(lic.id, "revoked")}>Thu hồi</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {total > 20 && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
                <span className="py-2 px-3 text-sm">Trang {page} / {Math.ceil(total / 20)}</span>
                <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Sau</Button>
              </div>
            )}
          </TabsContent>

          {/* ==================== TAB: PRODUCTS ==================== */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openProductCreate}><Plus className="w-4 h-4 mr-1" /> Thêm sản phẩm</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chưa có sản phẩm</TableCell></TableRow>
                    )}
                    {products.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><code className="text-sm bg-muted px-1 rounded">{p.slug}</code></TableCell>
                        <TableCell>{p.latest_version || "-"}</TableCell>
                        <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-sm">{formatDate(p.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openProductEdit(p)}>Sửa</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB: PLANS ==================== */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openPlanCreate}><Plus className="w-4 h-4 mr-1" /> Thêm gói</Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Tên gói</TableHead>
                      <TableHead>Thời hạn</TableHead>
                      <TableHead>Giá (VND)</TableHead>
                      <TableHead>Max thiết bị</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Chưa có gói license</TableCell></TableRow>
                    )}
                    {plans.map(p => {
                      const prod = products.find(pr => pr.id === p.product_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{prod?.name || "-"}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{formatDuration(p.duration_days)}</TableCell>
                          <TableCell className="font-mono">{p.price.toLocaleString()}</TableCell>
                          <TableCell>{p.max_devices}</TableCell>
                          <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openPlanEdit(p)}>Sửa</Button>
                              <Button size="sm" variant="destructive" onClick={() => deletePlan(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ==================== DIALOG: PRODUCT ==================== */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingProductId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tên sản phẩm *</label>
                <Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Slug * (URL-friendly, VD: my-software)</label>
                <Input value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả</label>
                <Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Version mới nhất</label>
                  <Input value={productForm.latest_version} onChange={e => setProductForm(f => ({ ...f, latest_version: e.target.value }))} placeholder="1.0.0" />
                </div>
                <div>
                  <label className="text-sm font-medium">URL Download</label>
                  <Input value={productForm.download_url} onChange={e => setProductForm(f => ({ ...f, download_url: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProductDialog(false)}>Hủy</Button>
              <Button onClick={saveProduct}>{editingProductId ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== DIALOG: PLAN ==================== */}
        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingPlanId ? "Sửa gói" : "Thêm gói license"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sản phẩm *</label>
                <Select value={planForm.product_id} onValueChange={v => v && setPlanForm(f => ({ ...f, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tên gói *</label>
                <Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: 1 tháng, 1 năm, Vĩnh viễn" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Thời hạn (ngày)</label>
                  <Input type="number" value={planForm.duration_days} onChange={e => setPlanForm(f => ({ ...f, duration_days: e.target.value }))} placeholder="0 = vĩnh viễn" />
                </div>
                <div>
                  <label className="text-sm font-medium">Giá (VND)</label>
                  <Input type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Max thiết bị</label>
                  <Input type="number" value={planForm.max_devices} onChange={e => setPlanForm(f => ({ ...f, max_devices: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Hủy</Button>
              <Button onClick={savePlan}>{editingPlanId ? "Cập nhật" : "Tạo"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== DIALOG: CREATE LICENSE ==================== */}
        <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tạo License Key</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sản phẩm *</label>
                <Select value={licenseForm.product_id} onValueChange={v => v && setLicenseForm(f => ({ ...f, product_id: v, plan_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Gói license</label>
                <Select value={licenseForm.plan_id || "none"} onValueChange={v => v && setLicenseForm(f => ({ ...f, plan_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn gói" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn gói</SelectItem>
                    {plansForProduct(licenseForm.product_id).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} - {formatDuration(p.duration_days)} - {p.price.toLocaleString()}đ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tên khách hàng</label>
                  <Input value={licenseForm.customer_name} onChange={e => setLicenseForm(f => ({ ...f, customer_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input value={licenseForm.customer_email} onChange={e => setLicenseForm(f => ({ ...f, customer_email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Max thiết bị</label>
                  <Input type="number" value={licenseForm.max_devices} onChange={e => setLicenseForm(f => ({ ...f, max_devices: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Thời hạn (ngày, ghi đè gói)</label>
                  <Input type="number" value={licenseForm.duration_days} onChange={e => setLicenseForm(f => ({ ...f, duration_days: e.target.value }))} placeholder="Theo gói" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Ghi chú</label>
                <Input value={licenseForm.note} onChange={e => setLicenseForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>Hủy</Button>
              <Button onClick={saveLicense}>Tạo License</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== DIALOG: BATCH CREATE ==================== */}
        <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Tạo hàng loạt License Keys</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sản phẩm *</label>
                <Select value={batchForm.product_id} onValueChange={v => v && setBatchForm(f => ({ ...f, product_id: v, plan_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Gói license</label>
                <Select value={batchForm.plan_id || "none"} onValueChange={v => v && setBatchForm(f => ({ ...f, plan_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn gói" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn gói</SelectItem>
                    {plansForProduct(batchForm.product_id).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name} - {formatDuration(p.duration_days)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Số lượng *</label>
                  <Input type="number" value={batchForm.quantity} onChange={e => setBatchForm(f => ({ ...f, quantity: e.target.value }))} min={1} max={500} />
                </div>
                <div>
                  <label className="text-sm font-medium">Max thiết bị</label>
                  <Input type="number" value={batchForm.max_devices} onChange={e => setBatchForm(f => ({ ...f, max_devices: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Thời hạn (ngày)</label>
                  <Input type="number" value={batchForm.duration_days} onChange={e => setBatchForm(f => ({ ...f, duration_days: e.target.value }))} placeholder="Theo gói" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Ghi chú</label>
                <Input value={batchForm.note} onChange={e => setBatchForm(f => ({ ...f, note: e.target.value }))} placeholder="VD: Đại lý ABC, Đợt 1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Hủy</Button>
              <Button onClick={saveBatch}>Tạo {batchForm.quantity} keys</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== DIALOG: BATCH RESULT ==================== */}
        <Dialog open={showBatchResult} onOpenChange={setShowBatchResult}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Đã tạo {batchKeys.length} License Keys</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 max-h-80 overflow-y-auto font-mono text-sm">
                {batchKeys.map((key, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5">
                    <span>{key}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(key)}><Copy className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={copyAllKeys}><Copy className="w-4 h-4 mr-1" /> Copy tất cả</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchResult(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ==================== DIALOG: LICENSE DETAIL ==================== */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Chi tiết License</DialogTitle></DialogHeader>
            {detailLicense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Key:</span> <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{detailLicense.license_key}</code></div>
                  <div><span className="text-muted-foreground">Sản phẩm:</span> {detailLicense.product_name}</div>
                  <div><span className="text-muted-foreground">Gói:</span> {detailLicense.plan_name || "-"}</div>
                  <div><span className="text-muted-foreground">Trạng thái:</span> <Badge variant={STATUS_MAP[detailLicense.status]?.variant || "secondary"}>{STATUS_MAP[detailLicense.status]?.label || detailLicense.status}</Badge></div>
                  <div><span className="text-muted-foreground">Khách hàng:</span> {detailLicense.customer_name || "-"}</div>
                  <div><span className="text-muted-foreground">Email:</span> {detailLicense.customer_email || "-"}</div>
                  <div><span className="text-muted-foreground">Thiết bị:</span> {detailLicense.current_devices}/{detailLicense.max_devices}</div>
                  <div><span className="text-muted-foreground">Hết hạn:</span> {formatDate(detailLicense.expires_at)}</div>
                  <div><span className="text-muted-foreground">Kích hoạt:</span> {formatDate(detailLicense.activated_at)}</div>
                  <div><span className="text-muted-foreground">Tạo lúc:</span> {formatDate(detailLicense.created_at)}</div>
                </div>

                {detailLicense.note && (
                  <div className="text-sm"><span className="text-muted-foreground">Ghi chú:</span> {detailLicense.note}</div>
                )}

                {/* Devices */}
                <div>
                  <h4 className="font-medium mb-2">Thiết bị ({detailDevices.length})</h4>
                  {detailDevices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có thiết bị</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên</TableHead>
                          <TableHead>Machine ID</TableHead>
                          <TableHead>OS</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Lần cuối</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailDevices.map(d => (
                          <TableRow key={d.id} className={!d.is_active ? "opacity-50" : ""}>
                            <TableCell className="text-sm">{d.device_name || "-"}</TableCell>
                            <TableCell className="text-xs font-mono">{d.machine_id.slice(0, 16)}...</TableCell>
                            <TableCell className="text-sm">{d.os_info || "-"}</TableCell>
                            <TableCell className="text-sm">{d.ip_address || "-"}</TableCell>
                            <TableCell className="text-xs">{formatDate(d.last_seen)}</TableCell>
                            <TableCell>
                              {d.is_active && <Button size="sm" variant="destructive" className="h-6 text-xs" onClick={() => removeDevice(d.id)}>Gỡ</Button>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Logs */}
                <div>
                  <h4 className="font-medium mb-2">Lịch sử ({detailLogs.length})</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {detailLogs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Chưa có hoạt động</p>
                    ) : (
                      <div className="space-y-1">
                        {detailLogs.map(log => (
                          <div key={log.id} className="flex items-center gap-3 text-xs py-1 border-b border-muted">
                            <span className="text-muted-foreground w-28 shrink-0">{new Date(log.created_at).toLocaleString("vi")}</span>
                            <Badge variant="outline" className="text-xs">{log.action}</Badge>
                            <span className="truncate">{log.detail || log.ip_address || ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
