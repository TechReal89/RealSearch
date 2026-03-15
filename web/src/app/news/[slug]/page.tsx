"use client";

import { UserLayout } from "@/components/layout/user-layout";
import { articleApi } from "@/lib/api";
import { ArrowLeft, Calendar, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  created_at: string;
  updated_at?: string;
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    articleApi
      .get(slug)
      .then((res: Article) => setArticle(res))
      .catch((err: Error) => setError(err.message || "Khong tim thay bai viet"))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm text-[#8a8999] hover:text-[#d4a84b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lai danh sach tin tuc
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[rgba(212,168,75,0.15)]" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="luxury-card rounded-xl p-12 text-center">
            <Newspaper className="w-12 h-12 text-[#555] mx-auto mb-4" />
            <p className="text-[#8a8999] text-lg">{error}</p>
          </div>
        )}

        {/* Article */}
        {!loading && article && (
          <div className="luxury-card rounded-xl overflow-hidden">
            {/* Thumbnail */}
            {article.thumbnail && (
              <div className="aspect-[21/9] bg-[rgba(255,255,255,0.02)] overflow-hidden">
                <img
                  src={article.thumbnail}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Header */}
            <div className="p-6 pb-4 border-b border-[rgba(255,255,255,0.04)]">
              <h1 className="text-2xl font-bold text-[#f5f0e8] leading-tight">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 mt-3 text-[#555]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    {new Date(article.created_at).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Article content styles */}
      <style jsx global>{`
        .article-content {
          color: #c4c0b6;
          font-size: 0.9375rem;
          line-height: 1.8;
        }
        .article-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #f5f0e8;
          margin: 2rem 0 1rem;
        }
        .article-content h2 {
          font-size: 1.375rem;
          font-weight: 700;
          color: #f5f0e8;
          margin: 1.75rem 0 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(212, 168, 75, 0.1);
        }
        .article-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #f5f0e8;
          margin: 1.5rem 0 0.5rem;
        }
        .article-content h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #d4a84b;
          margin: 1.25rem 0 0.5rem;
        }
        .article-content p {
          margin: 0.75rem 0;
        }
        .article-content a {
          color: #d4a84b;
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: opacity 0.2s;
        }
        .article-content a:hover {
          opacity: 0.8;
        }
        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .article-content ul,
        .article-content ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }
        .article-content ul {
          list-style-type: disc;
        }
        .article-content ol {
          list-style-type: decimal;
        }
        .article-content li {
          margin: 0.375rem 0;
        }
        .article-content blockquote {
          border-left: 3px solid rgba(212, 168, 75, 0.4);
          padding: 0.75rem 1rem;
          margin: 1rem 0;
          background: rgba(212, 168, 75, 0.04);
          border-radius: 0 0.5rem 0.5rem 0;
          color: #8a8999;
          font-style: italic;
        }
        .article-content pre {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.5rem;
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
          font-size: 0.8125rem;
        }
        .article-content code {
          background: rgba(212, 168, 75, 0.08);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.8125rem;
          color: #d4a84b;
        }
        .article-content pre code {
          background: none;
          padding: 0;
          color: #c4c0b6;
        }
        .article-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .article-content th,
        .article-content td {
          padding: 0.5rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          text-align: left;
        }
        .article-content th {
          background: rgba(212, 168, 75, 0.06);
          color: #d4a84b;
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .article-content hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin: 2rem 0;
        }
      `}</style>
    </UserLayout>
  );
}
