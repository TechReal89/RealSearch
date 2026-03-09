"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { userApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Gift, Copy, CheckCircle, Users, Coins, Share2, Sparkles,
  MessageCircle, Link2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralData {
  referral_code: string;
  referral_link: string;
  referred_count: number;
  rewarded_count: number;
  pending_count: number;
  total_referral_credit: number;
  required_tasks: number;
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    userApi.referral().then(setData).catch(() => {});
  }, []);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Đã sao chép!");
    setTimeout(() => setCopiedField(""), 2000);
  };

  const shareUrl = data?.referral_link || "";
  const shareText = "Dùng RealSearch để tăng traffic website miễn phí! Đăng ký qua link này để nhận 50 Credit:";

  const shareLinks = [
    {
      label: "Facebook",
      icon: Share2,
      color: "text-blue-400",
      bg: "bg-blue-500/10 hover:bg-blue-500/20",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Telegram",
      icon: MessageCircle,
      color: "text-sky-400",
      bg: "bg-sky-500/10 hover:bg-sky-500/20",
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
  ];

  return (
    <UserLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#09090d]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f0e8]">Giới thiệu bạn bè</h2>
            <p className="text-sm text-[#8a8999]">Mời bạn bè tham gia và nhận thưởng Credit</p>
          </div>
        </div>

        <div className="ornament-line" />

        {/* Referral Code Card */}
        <div className="luxury-card-premium rounded-xl overflow-hidden gold-glow">
          <div className="gold-gradient px-6 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#09090d]" />
              <h3 className="font-bold text-[#09090d]">Mã giới thiệu của bạn</h3>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Code */}
            <div>
              <p className="text-xs text-[#8a8999] uppercase tracking-wider mb-2">Mã giới thiệu</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#0a0a10] rounded-lg px-4 py-3 border border-[rgba(212,168,75,0.15)]">
                  <span className="font-mono text-2xl font-bold gold-text tracking-widest">
                    {data?.referral_code || "---"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => data && copyText(data.referral_code, "code")}
                  className="gold-gradient text-[#09090d] font-bold hover:opacity-90 h-12 px-4"
                >
                  {copiedField === "code" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Link */}
            <div>
              <p className="text-xs text-[#8a8999] uppercase tracking-wider mb-2">Link giới thiệu</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#0a0a10] rounded-lg px-4 py-3 border border-[rgba(212,168,75,0.15)] overflow-hidden">
                  <span className="text-sm text-[#8a8999] truncate block">
                    {data?.referral_link || "---"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => data && copyText(data.referral_link, "link")}
                  className="gold-gradient text-[#09090d] font-bold hover:opacity-90 h-12 px-4"
                >
                  {copiedField === "link" ? <CheckCircle className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="luxury-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#8a8999] uppercase tracking-wider">Đã giới thiệu</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400 stat-value">
              {data?.referred_count || 0}
            </p>
            <p className="text-xs text-[#555] mt-1">người dùng</p>
          </div>

          <div className="luxury-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#8a8999] uppercase tracking-wider">Đã nhận thưởng</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-400 stat-value">
              {data?.rewarded_count || 0}
            </p>
            <p className="text-xs text-[#555] mt-1">đã hoàn thành</p>
          </div>

          <div className="luxury-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#8a8999] uppercase tracking-wider">Đang chờ</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400 stat-value">
              {data?.pending_count || 0}
            </p>
            <p className="text-xs text-[#555] mt-1">chờ đủ điều kiện</p>
          </div>

          <div className="luxury-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#8a8999] uppercase tracking-wider">Credit nhận được</span>
              <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
                <Coins className="w-4 h-4 text-[#09090d]" />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#d4a84b] stat-value">
              {data?.total_referral_credit?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-[#555] mt-1">credit</p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="luxury-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Chia sẻ ngay</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {shareLinks.map((s) => (
              <button
                key={s.label}
                onClick={() => window.open(s.url, "_blank", "width=600,height=400")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg ${s.bg} ${s.color} text-sm font-medium transition-all`}
              >
                <s.icon className="w-4 h-4" />
                {s.label}
              </button>
            ))}
            <button
              onClick={() => data && copyText(data.referral_link, "share")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[rgba(212,168,75,0.1)] hover:bg-[rgba(212,168,75,0.2)] text-[#d4a84b] text-sm font-medium transition-all"
            >
              {copiedField === "share" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Sao chép link
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="luxury-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#d4a84b]" />
            <h3 className="text-lg font-semibold text-[#f5f0e8]">Cách hoạt động</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Chia sẻ link",
                desc: "Gửi link giới thiệu cho bạn bè qua mạng xã hội hoặc tin nhắn",
                icon: Share2,
              },
              {
                step: "2",
                title: "Bạn bè đăng ký",
                desc: "Bạn bè click vào link và tạo tài khoản RealSearch",
                icon: Users,
              },
              {
                step: "3",
                title: "Nhận thưởng",
                desc: "Bạn nhận 50 Credit khi bạn bè hoàn thành 10 tasks đầu tiên (chống lạm dụng tài khoản ảo)",
                icon: Gift,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg font-bold text-[#09090d]">{item.step}</span>
                </div>
                <h4 className="text-sm font-semibold text-[#f5f0e8] mb-1">{item.title}</h4>
                <p className="text-xs text-[#8a8999] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
