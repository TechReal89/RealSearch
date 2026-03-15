"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminApi, Article } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Đã xuất bản", variant: "default" },
  draft: { label: "Bản nháp", variant: "secondary" },
  archived: { label: "Lưu trữ", variant: "destructive" },
};

const CATEGORY_MAP: Record<string, string> = {
  guide: "Hướng dẫn sử dụng",
  news: "Tin tức",
};

export default function ContentPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"guide" | "news">("guide");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .listArticles(`category=${activeTab}&page=${page}&page_size=20`)
      .then((d) => {
        setArticles(d.articles || []);
        setTotal(d.total || 0);
      })
      .catch(() => {
        setArticles([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    try {
      await adminApi.deleteArticle(id);
      toast.success("Đã xóa bài viết");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gold-shimmer">Quản lý Nội dung</h2>
          <Button onClick={() => router.push("/content/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Tạo bài viết
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === "guide" ? "default" : "outline"}
            onClick={() => { setActiveTab("guide"); setPage(1); }}
            className={activeTab === "guide" ? "bg-[rgba(212,168,75,0.15)] text-[#d4a84b] border-[rgba(212,168,75,0.3)] hover:bg-[rgba(212,168,75,0.25)]" : ""}
          >
            Hướng dẫn sử dụng
          </Button>
          <Button
            variant={activeTab === "news" ? "default" : "outline"}
            onClick={() => { setActiveTab("news"); setPage(1); }}
            className={activeTab === "news" ? "bg-[rgba(212,168,75,0.15)] text-[#d4a84b] border-[rgba(212,168,75,0.3)] hover:bg-[rgba(212,168,75,0.25)]" : ""}
          >
            Tin tức
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="luxury-card">
            <CardContent className="p-4">
              <div className="text-sm text-[#8a8999]">Tổng bài viết</div>
              <div className="text-2xl font-bold text-[#f5f0e8]">{total}</div>
            </CardContent>
          </Card>
          <Card className="luxury-card">
            <CardContent className="p-4">
              <div className="text-sm text-[#8a8999]">Đã xuất bản</div>
              <div className="text-2xl font-bold text-green-500">
                {articles.filter((a) => a.status === "published").length}
              </div>
            </CardContent>
          </Card>
          <Card className="luxury-card">
            <CardContent className="p-4">
              <div className="text-sm text-[#8a8999]">Bản nháp</div>
              <div className="text-2xl font-bold text-yellow-500">
                {articles.filter((a) => a.status === "draft").length}
              </div>
            </CardContent>
          </Card>
          <Card className="luxury-card">
            <CardContent className="p-4">
              <div className="text-sm text-[#8a8999]">Tổng lượt xem</div>
              <div className="text-2xl font-bold text-[#d4a84b]">
                {articles.reduce((s, a) => s + a.view_count, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="luxury-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead className="w-32">Trạng thái</TableHead>
                  <TableHead className="w-24 text-right">Lượt xem</TableHead>
                  <TableHead className="w-32">Ngày tạo</TableHead>
                  <TableHead className="w-40 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && articles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && articles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Chưa có bài viết nào trong mục {CATEGORY_MAP[activeTab]}
                    </TableCell>
                  </TableRow>
                )}
                {articles.map((a, idx) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">{(page - 1) * 20 + idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.is_featured && <Star className="w-4 h-4 text-[#d4a84b] fill-[#d4a84b]" />}
                        <div>
                          <div className="font-medium text-[#f5f0e8]">{a.title}</div>
                          {a.excerpt && (
                            <div className="text-xs text-[#8a8999] line-clamp-1 max-w-md">{a.excerpt}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[a.status]?.variant || "secondary"}>
                        {STATUS_MAP[a.status]?.label || a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{a.view_count.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-[#8a8999]">
                      {new Date(a.created_at).toLocaleDateString("vi")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/content/${a.id}`)}>
                          <Pencil className="w-3 h-3 mr-1" />
                          Sửa
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Xóa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex gap-2 justify-center">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <span className="py-2 px-3 text-sm text-[#8a8999]">
              Trang {page} / {Math.ceil(total / 20)}
            </span>
            <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>
              Sau
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
