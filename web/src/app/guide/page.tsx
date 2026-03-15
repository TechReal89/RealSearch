"use client";

import { UserLayout } from "@/components/layout/user-layout";
import { articleApi } from "@/lib/api";
import { BookOpen, ArrowRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  thumbnail?: string;
  published_at?: string;
  created_at?: string;
}

interface ArticleListResponse {
  articles: Article[];
  total: number;
}

const PAGE_SIZE = 20;

export default function GuidePage() {
  const [data, setData] = useState<ArticleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  useEffect(() => {
    setLoading(true);
    articleApi
      .list("guide", page)
      .then((res: ArticleListResponse) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <UserLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-block mb-5">
            <div
              className="w-18 h-18 rounded-2xl gold-gradient gold-glow-strong flex items-center justify-center animate-float"
              style={{ width: 72, height: 72 }}
            >
              <BookOpen className="w-9 h-9 text-[#09090d]" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#f5f0e8]">
            <span className="gold-shimmer">Huong dan su dung</span>
          </h2>
          <p className="text-[#8a8999] mt-2 max-w-md mx-auto">
            Cac bai huong dan chi tiet giup ban su dung RealSearch hieu qua nhat
          </p>
          <div className="ornament-line mt-5 max-w-xs mx-auto" />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-[rgba(212,168,75,0.15)]" />
              <div className="absolute inset-0 w-12 h-12 border-2 border-[#d4a84b] border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && (!data || !data.articles || data.articles.length === 0) && (
          <div className="luxury-card rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-[#555] mx-auto mb-4" />
            <p className="text-[#8a8999] text-lg">Chua co bai huong dan nao</p>
            <p className="text-[#555] text-sm mt-1">Cac bai huong dan se som duoc cap nhat</p>
          </div>
        )}

        {/* Article Grid */}
        {!loading && data && data.articles && data.articles.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/guide/${article.slug}`}
                  className="luxury-card rounded-xl overflow-hidden group hover:border-[rgba(212,168,75,0.2)] transition-all duration-300"
                >
                  {/* Thumbnail */}
                  {article.thumbnail ? (
                    <div className="aspect-video bg-[rgba(255,255,255,0.02)] overflow-hidden">
                      <img
                        src={article.thumbnail}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-[rgba(212,168,75,0.04)] flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[rgba(212,168,75,0.2)]" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-[#f5f0e8] line-clamp-2 group-hover:text-[#d4a84b] transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-xs text-[#8a8999] line-clamp-2 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5 text-[#555]">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px]">
                          {new Date(article.published_at || article.created_at || "").toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[#d4a84b] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Doc</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-[#8a8999]">
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg text-[#8a8999] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </UserLayout>
  );
}
