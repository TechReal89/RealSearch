"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { creditApi } from "@/lib/api";
import { Coins, Crown, Star, Zap, Sparkles, ArrowRight, Flame, Award, CheckCircle } from "lucide-react";
import Link from "next/link";

const badgeConfig: Record<string, { text: string; icon: typeof Star; style: string }> = {
  popular: { text: "Phổ biến", icon: Star, style: "badge-vip" },
  best_value: { text: "Best Value", icon: Zap, style: "badge-vip" },
  hot: { text: "HOT", icon: Flame, style: "badge-hot" },
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    creditApi.packages().then(setPackages).catch(() => {});
  }, []);

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="relative inline-block mb-5">
            <div className="w-16 h-16 rounded-2xl gold-gradient gold-glow-strong flex items-center justify-center animate-float">
              <Crown className="w-8 h-8 text-[#09090d]" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gold-gradient flex items-center justify-center animate-sparkle">
              <Sparkles className="w-3 h-3 text-[#09090d]" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#f5f0e8]">
            Gói dịch vụ <span className="gold-shimmer">VIP Premium</span>
          </h2>
          <p className="text-[#8a8999] mt-2 max-w-md mx-auto">
            Chọn gói credit phù hợp với nhu cầu của bạn. Nâng cấp để nhận thêm nhiều ưu đãi.
          </p>
          <div className="ornament-line mt-6 max-w-xs mx-auto" />
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg, i) => {
            const badge = badgeConfig[pkg.badge as string];
            const isHighlighted = pkg.badge === "best_value" || pkg.badge === "hot";
            const bonusPercent = (pkg.bonus_credit as number) > 0
              ? Math.round(((pkg.bonus_credit as number) / (pkg.credit_amount as number)) * 100)
              : 0;

            return (
              <div
                key={pkg.id as number}
                className={`relative rounded-2xl overflow-hidden transition-all duration-500 group animate-fade-up ${
                  isHighlighted
                    ? "luxury-card-premium gold-glow-strong border border-[rgba(212,168,75,0.25)]"
                    : "luxury-card"
                }`}
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Top gradient bar */}
                <div className={`h-1 ${isHighlighted ? "gold-gradient" : "bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent"}`} />

                {/* Badge */}
                {badge && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className={`${badge.style} text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider`}>
                      <badge.icon className="w-3 h-3" />
                      {badge.text}
                    </div>
                  </div>
                )}

                {/* Decorative corner */}
                {isHighlighted && (
                  <>
                    <div className="corner-ornament corner-ornament-tl border-[rgba(212,168,75,0.25)]" />
                    <div className="corner-ornament corner-ornament-br border-[rgba(212,168,75,0.25)]" />
                  </>
                )}

                <div className="p-6 relative">
                  <p className="text-sm text-[#8a8999] font-medium mb-5">{pkg.name as string}</p>

                  {/* Credit Amount */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-4xl font-bold stat-value ${isHighlighted ? "gold-text" : "text-[#f5f0e8]"}`}>
                      {(pkg.credit_amount as number).toLocaleString()}
                    </span>
                    <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center">
                      <Coins className="w-4 h-4 text-[#09090d]" />
                    </div>
                  </div>

                  {/* Bonus */}
                  {(pkg.bonus_credit as number) > 0 ? (
                    <div className="flex items-center gap-1.5 mt-2 mb-5">
                      <div className="badge-premium text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        +{(pkg.bonus_credit as number).toLocaleString()} bonus (+{bonusPercent}%)
                      </div>
                    </div>
                  ) : (
                    <div className="h-[30px] mb-5" />
                  )}

                  {/* Features mini list */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-xs text-[#8a8999]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#d4a84b]" />
                      <span>Cộng credit tức thì</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#8a8999]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#d4a84b]" />
                      <span>Không giới hạn thời gian</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="border-t border-[rgba(255,255,255,0.04)] pt-4">
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-bold gold-text stat-value">
                        {(pkg.price as number).toLocaleString()}
                      </span>
                      <span className="text-xs text-[#8a8999] uppercase tracking-wider">VND</span>
                    </div>

                    <Link
                      href="/payments"
                      className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all btn-gold-hover ${
                        isHighlighted
                          ? "gold-gradient text-[#09090d] hover:opacity-90 gold-glow-subtle"
                          : "bg-[rgba(212,168,75,0.08)] text-[#d4a84b] hover:bg-[rgba(212,168,75,0.15)] border border-[rgba(212,168,75,0.12)]"
                      }`}
                    >
                      Mua ngay <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="luxury-card rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(212,168,75,0.2)]" />
            <Award className="w-5 h-5 text-[#d4a84b]" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(212,168,75,0.2)]" />
          </div>
          <p className="text-[#8a8999] text-sm">
            Tất cả gói đều được <span className="text-[#d4a84b] font-semibold">cộng credit tức thì</span> sau khi thanh toán.
            Nâng cấp <span className="text-[#d4a84b] font-semibold">tier VIP</span> để nhận hệ số nhân credit cao hơn.
          </p>
        </div>
      </div>
    </UserLayout>
  );
}
