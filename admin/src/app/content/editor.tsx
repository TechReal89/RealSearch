"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi, Article } from "@/lib/api";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, List, ListOrdered, Link, Image, Quote, Code,
  Undo, Redo, RemoveFormatting, ArrowLeft, Save, Star, Eye,
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

// --- Toolbar Button ---
function ToolbarBtn({
  icon: Icon, title, onClick, active,
}: {
  icon: React.ElementType; title: string; onClick: () => void; active?: boolean;
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

// --- Rich Text Editor ---
function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value;
      isInitialized.current = true;
    }
  }, [value]);

  useEffect(() => {
    if (value === "" && editorRef.current && isInitialized.current) {
      editorRef.current.innerHTML = "";
      isInitialized.current = false;
    }
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt("Nhập URL liên kết:");
    if (url) exec("createLink", url);
  }, [exec]);

  const insertImageFromUrl = useCallback(() => {
    const url = prompt("Nhập URL hình ảnh:");
    if (url) exec("insertImage", url);
  }, [exec]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await adminApi.uploadImage(file);
      exec("insertImage", result.url);
      toast.success("Upload hình ảnh thành công");
    } catch {
      const localUrl = URL.createObjectURL(file);
      exec("insertImage", localUrl);
      toast.error("Upload thất bại, sử dụng ảnh tạm");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [exec]);

  const handleInsertImage = useCallback(() => {
    const choice = confirm("Nhấn OK để upload file, Cancel để nhập URL");
    if (choice) fileInputRef.current?.click();
    else insertImageFromUrl();
  }, [insertImageFromUrl]);

  const formatBlock = useCallback((tag: string) => exec("formatBlock", tag), [exec]);
  const clearFormatting = useCallback(() => { exec("removeFormat"); exec("formatBlock", "p"); }, [exec]);

  return (
    <div className="border border-[rgba(212,168,75,0.15)] rounded-lg overflow-hidden bg-[#0c0c12] flex-1 flex flex-col">
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

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="flex-1 p-5 text-[#f5f0e8] focus:outline-none prose prose-invert max-w-none overflow-y-auto
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
        style={{ minHeight: "500px" }}
      />
    </div>
  );
}

// --- Article Editor Page ---
export function ArticleEditor({ articleId }: { articleId?: number }) {
  const router = useRouter();
  const [form, setForm] = useState<ArticleForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Load article data if editing
  useEffect(() => {
    if (articleId) {
      setLoading(true);
      adminApi
        .getArticle(articleId)
        .then((a: Article) => {
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
        })
        .catch(() => toast.error("Không thể tải bài viết"))
        .finally(() => setLoading(false));
    }
  }, [articleId]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài viết");
      return;
    }
    setSaving(true);
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
      if (articleId) {
        await adminApi.updateArticle(articleId, payload);
        toast.success("Cập nhật bài viết thành công");
      } else {
        const created = await adminApi.createArticle(payload);
        toast.success("Tạo bài viết thành công");
        router.push(`/content/${created.id}`);
        return;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi khi lưu bài viết");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)]">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/content")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại
            </Button>
            <h2 className="text-xl font-bold gold-shimmer">
              {articleId ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)}>
              <Eye className="w-4 h-4 mr-1" />
              {showSidebar ? "Ẩn" : "Hiện"} cài đặt
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Đang lưu..." : "Lưu bài viết"}
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Editor area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Title input */}
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Nhập tiêu đề bài viết..."
              className="mb-3 text-lg font-semibold h-12"
            />

            {/* Rich text editor */}
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
            />
          </div>

          {/* Sidebar settings */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
              {/* Category & Status */}
              <div className="luxury-card rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#d4a84b] uppercase tracking-wider">Cài đặt</h4>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Danh mục</label>
                  <Select value={form.category} onValueChange={(v) => v && setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guide">Hướng dẫn sử dụng</SelectItem>
                      <SelectItem value="news">Tin tức</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Trạng thái</label>
                  <Select value={form.status} onValueChange={(v) => v && setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Bản nháp</SelectItem>
                      <SelectItem value="published">Xuất bản</SelectItem>
                      <SelectItem value="archived">Lưu trữ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Thứ tự sắp xếp</label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                    className="w-4 h-4 rounded border-[rgba(212,168,75,0.3)] accent-[#d4a84b]"
                  />
                  <span className="text-sm text-[#f5f0e8]">
                    <Star className="w-3.5 h-3.5 inline mr-1 text-[#d4a84b]" />
                    Bài viết nổi bật
                  </span>
                </label>
              </div>

              {/* Excerpt & Thumbnail */}
              <div className="luxury-card rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#d4a84b] uppercase tracking-wider">Mô tả</h4>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Mô tả ngắn</label>
                  <Input
                    value={form.excerpt}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                    placeholder="Mô tả ngắn gọn..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">URL Thumbnail</label>
                  <Input
                    value={form.thumbnail}
                    onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* SEO */}
              <div className="luxury-card rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#d4a84b] uppercase tracking-wider">SEO</h4>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Meta Title</label>
                  <Input
                    value={form.meta_title}
                    onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                    placeholder="Tiêu đề SEO..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#8a8999]">Meta Description</label>
                  <Input
                    value={form.meta_description}
                    onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                    placeholder="Mô tả SEO (tối đa 160 ký tự)"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
