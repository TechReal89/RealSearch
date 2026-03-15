"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { adminApi, Article } from "@/lib/api";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered, Link, Image, Quote, Code,
  Undo, Redo, RemoveFormatting, Plus, Pencil, Trash2, Eye, Star,
} from "lucide-react";

// --- Types ---

interface ArticleForm {
  title: string;
  excerpt: string;
  thumbnail: string;
  category: string;
  status: string;
  sort_order: string;
  meta_title: string;
  meta_description: string;
  is_featured: boolean;
  content: string;
}

const defaultForm: ArticleForm = {
  title: "",
  excerpt: "",
  thumbnail: "",
  category: "guide",
  status: "draft",
  sort_order: "0",
  meta_title: "",
  meta_description: "",
  is_featured: false,
  content: "",
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  published: { label: "Đã xuất bản", variant: "default" },
  draft: { label: "Bản nháp", variant: "secondary" },
  archived: { label: "Lưu trữ", variant: "destructive" },
};

const CATEGORY_MAP: Record<string, string> = {
  guide: "Hướng dẫn sử dụng",
  news: "Tin tức",
};

// --- Rich Text Editor Toolbar Button ---

function ToolbarBtn({
  icon: Icon,
  title,
  onClick,
  active,
}: {
  icon: React.ElementType;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[rgba(212,168,75,0.2)] text-[#d4a84b]"
          : "text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-[rgba(255,255,255,0.08)] mx-1" />;
}

// --- Rich Text Editor Component ---

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);

  // Set initial content once
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value;
      isInitialized.current = true;
    }
  }, [value]);

  // Reset when value becomes empty (new form)
  useEffect(() => {
    if (value === "" && editorRef.current && isInitialized.current) {
      editorRef.current.innerHTML = "";
      isInitialized.current = false;
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    // Sync to parent
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt("Nhập URL liên kết:");
    if (url) {
      exec("createLink", url);
    }
  }, [exec]);

  const insertImageFromUrl = useCallback(() => {
    const url = prompt("Nhập URL hình ảnh:");
    if (url) {
      exec("insertImage", url);
    }
  }, [exec]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await adminApi.uploadImage(file);
      exec("insertImage", result.url);
      toast.success("Upload hình ảnh thành công");
    } catch {
      // Fallback: use local URL
      const localUrl = URL.createObjectURL(file);
      exec("insertImage", localUrl);
      toast.error("Upload thất bại, sử dụng ảnh tạm");
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [exec]);

  const handleInsertImage = useCallback(() => {
    const choice = confirm("Nhấn OK để upload file, Cancel để nhập URL");
    if (choice) {
      fileInputRef.current?.click();
    } else {
      insertImageFromUrl();
    }
  }, [insertImageFromUrl]);

  const formatBlock = useCallback((tag: string) => {
    exec("formatBlock", tag);
  }, [exec]);

  const clearFormatting = useCallback(() => {
    exec("removeFormat");
    exec("formatBlock", "p");
  }, [exec]);

  return (
    <div className="border border-[rgba(212,168,75,0.15)] rounded-lg overflow-hidden bg-[#0c0c12]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[rgba(212,168,75,0.1)] bg-[rgba(0,0,0,0.2)]">
        <ToolbarBtn icon={Bold} title="Đậm (Ctrl+B)" onClick={() => exec("bold")} />
        <ToolbarBtn icon={Italic} title="Nghiêng (Ctrl+I)" onClick={() => exec("italic")} />
        <ToolbarBtn icon={Underline} title="Gạch chân (Ctrl+U)" onClick={() => exec("underline")} />
        <ToolbarBtn icon={Strikethrough} title="Gạch ngang" onClick={() => exec("strikeThrough")} />

        <ToolbarSep />

        <ToolbarBtn icon={AlignLeft} title="Căn trái" onClick={() => exec("justifyLeft")} />
        <ToolbarBtn icon={AlignCenter} title="Căn giữa" onClick={() => exec("justifyCenter")} />
        <ToolbarBtn icon={AlignRight} title="Căn phải" onClick={() => exec("justifyRight")} />
        <ToolbarBtn icon={AlignJustify} title="Căn đều" onClick={() => exec("justifyFull")} />

        <ToolbarSep />

        <ToolbarBtn icon={Heading1} title="Tiêu đề 1" onClick={() => formatBlock("h1")} />
        <ToolbarBtn icon={Heading2} title="Tiêu đề 2" onClick={() => formatBlock("h2")} />
        <ToolbarBtn icon={Heading3} title="Tiêu đề 3" onClick={() => formatBlock("h3")} />

        <ToolbarSep />

        <ToolbarBtn icon={ListOrdered} title="Danh sách có số" onClick={() => exec("insertOrderedList")} />
        <ToolbarBtn icon={List} title="Danh sách không số" onClick={() => exec("insertUnorderedList")} />

        <ToolbarSep />

        <ToolbarBtn icon={Link} title="Chèn liên kết" onClick={insertLink} />
        <ToolbarBtn icon={Image} title="Chèn hình ảnh" onClick={handleInsertImage} />
        <ToolbarBtn icon={Quote} title="Trích dẫn" onClick={() => formatBlock("blockquote")} />
        <ToolbarBtn icon={Code} title="Khối mã" onClick={() => exec("formatBlock", "pre")} />

        <ToolbarSep />

        <ToolbarBtn icon={Undo} title="Hoàn tác (Ctrl+Z)" onClick={() => exec("undo")} />
        <ToolbarBtn icon={Redo} title="Làm lại (Ctrl+Y)" onClick={() => exec("redo")} />
        <ToolbarBtn icon={RemoveFormatting} title="Xóa định dạng" onClick={clearFormatting} />
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[400px] p-4 text-[#f5f0e8] focus:outline-none prose prose-invert max-w-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:text-[#d4a84b]
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:text-[#d4a84b]
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:text-[#d4a84b]
          [&_p]:mb-2 [&_p]:leading-relaxed
          [&_a]:text-[#d4a84b] [&_a]:underline
          [&_blockquote]:border-l-4 [&_blockquote]:border-[#d4a84b] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#8a8999] [&_blockquote]:my-3
          [&_pre]:bg-[rgba(0,0,0,0.3)] [&_pre]:p-3 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-3 [&_pre]:overflow-x-auto
          [&_code]:bg-[rgba(0,0,0,0.3)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
          [&_li]:mb-1
          [&_img]:max-w-full [&_img]:rounded [&_img]:my-3
          [&_hr]:border-[rgba(212,168,75,0.15)] [&_hr]:my-4"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}

// --- Main Page ---

export default function ContentPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"guide" | "news">("guide");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleForm>(defaultForm);
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

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, category: activeTab });
    setShowDialog(true);
  };

  const openEdit = (a: Article) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      excerpt: a.excerpt || "",
      thumbnail: a.thumbnail || "",
      category: a.category,
      status: a.status,
      sort_order: String(a.sort_order),
      meta_title: a.meta_title || "",
      meta_description: a.meta_description || "",
      is_featured: a.is_featured,
      content: a.content || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài viết");
      return;
    }

    const payload: Partial<Article> = {
      title: form.title,
      content: form.content,
      excerpt: form.excerpt || null,
      thumbnail: form.thumbnail || null,
      category: form.category,
      status: form.status,
      sort_order: parseInt(form.sort_order) || 0,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      is_featured: form.is_featured,
    };

    try {
      if (editingId) {
        await adminApi.updateArticle(editingId, payload);
        toast.success("Cập nhật bài viết thành công");
      } else {
        await adminApi.createArticle(payload);
        toast.success("Tạo bài viết thành công");
      }
      setShowDialog(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

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

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setShowDialog(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold gold-shimmer">Quản lý Nội dung</h2>
          <Button onClick={openCreate}>
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
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
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

        {/* Create / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="gold-shimmer">
                {editingId ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-[#f5f0e8]">Tiêu đề *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Nhập tiêu đề bài viết..."
                  className="mt-1"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="text-sm font-medium text-[#f5f0e8]">Mô tả ngắn</label>
                <Input
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Mô tả ngắn gọn cho bài viết..."
                  className="mt-1"
                />
              </div>

              {/* Row: Category, Status, Sort Order */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#f5f0e8]">Danh mục</label>
                  <Select value={form.category} onValueChange={(v) => v && setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guide">Hướng dẫn sử dụng</SelectItem>
                      <SelectItem value="news">Tin tức</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#f5f0e8]">Trạng thái</label>
                  <Select value={form.status} onValueChange={(v) => v && setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bản nháp</SelectItem>
                      <SelectItem value="published">Xuất bản</SelectItem>
                      <SelectItem value="archived">Lưu trữ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#f5f0e8]">Thứ tự sắp xếp</label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Thumbnail + Featured */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#f5f0e8]">URL Thumbnail</label>
                  <Input
                    value={form.thumbnail}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-[rgba(212,168,75,0.3)] accent-[#d4a84b]"
                    />
                    <span className="text-sm font-medium text-[#f5f0e8]">
                      <Star className="w-4 h-4 inline mr-1 text-[#d4a84b]" />
                      Bài viết nổi bật
                    </span>
                  </label>
                </div>
              </div>

              {/* SEO Fields */}
              <div className="border border-[rgba(212,168,75,0.1)] rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#d4a84b] uppercase tracking-wider">SEO</h4>
                <div>
                  <label className="text-sm font-medium text-[#8a8999]">Meta Title</label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                    placeholder="Tiêu đề SEO (mặc định dùng tiêu đề bài viết)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#8a8999]">Meta Description</label>
                  <Input
                    value={form.meta_description}
                    onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                    placeholder="Mô tả SEO (tối đa 160 ký tự)"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Rich Text Editor */}
              <div>
                <label className="text-sm font-medium text-[#f5f0e8] mb-2 block">Nội dung bài viết</label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleSave}>{editingId ? "Cập nhật" : "Tạo mới"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
