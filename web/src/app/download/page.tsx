"use client";

import { UserLayout } from "@/components/layout/user-layout";
import {
  Download, Monitor, Cpu, Wifi, Shield, Zap, CheckCircle, ArrowRight, Crown, Sparkles, Star,
  Search, MousePointerClick, Globe, TrendingUp, Eye, Link2, BarChart3, Target,
} from "lucide-react";

export default function DownloadPage() {
  return (
    <UserLayout>
      <div className="space-y-8 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center">
          <div className="relative inline-block mb-5">
            <div className="w-18 h-18 rounded-2xl gold-gradient gold-glow-strong flex items-center justify-center animate-float" style={{ width: 72, height: 72 }}>
              <Download className="w-9 h-9 text-[#09090d]" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center animate-sparkle">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#f5f0e8]">
            Tải <span className="gold-shimmer">RealSearch Client</span>
          </h2>
          <p className="text-[#8a8999] mt-2 max-w-md mx-auto">
            Biến máy tính thành cỗ máy tăng traffic tự động &mdash; kiếm credit mỗi ngày, không cần động tay
          </p>
          <div className="ornament-line mt-5 max-w-xs mx-auto" />
        </div>

        {/* Pain Points & Solution */}
        <div className="luxury-card rounded-xl p-5 space-y-4">
          <p className="text-xs font-bold text-[#d4a84b] uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Bạn đang gặp vấn đề này?
          </p>
          <div className="space-y-3">
            {[
              "Website ít traffic, Google không đánh giá cao dù nội dung tốt?",
              "Chạy quảng cáo tốn kém mà lượt truy cập không bền vững?",
              "Muốn tăng thứ hạng keyword trên Google nhưng không biết bắt đầu từ đâu?",
              "Cần nguồn traffic tự nhiên, đa dạng hành vi như người thật?",
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-rose-400 mt-0.5 shrink-0">&#10007;</span>
                <span className="text-sm text-[#8a8999] leading-relaxed">{pain}</span>
              </div>
            ))}
          </div>
          <div className="h-px bg-[rgba(212,168,75,0.08)] my-2" />
          <p className="text-sm text-[#f5f0e8] leading-relaxed">
            <span className="text-[#d4a84b] font-bold">RealSearch Client</span> giải quyết tất cả.
            Chỉ cần cài đặt và bấm <span className="text-emerald-400 font-semibold">&quot;Bắt đầu&quot;</span> &mdash;
            hệ thống tự động mô phỏng hành vi người dùng thật: <span className="text-[#f5f0e8]">truy cập website, cuộn trang, click link nội bộ, tìm kiếm keyword trên Google rồi click vào kết quả, xem video YouTube</span>...
            Tất cả diễn ra hoàn toàn tự nhiên, chạy nền mà <span className="text-emerald-400">không ảnh hưởng đến công việc hàng ngày</span> của bạn.
          </p>
        </div>

        {/* Main Card */}
        <div className="luxury-card-premium rounded-2xl overflow-hidden gold-glow border border-[rgba(212,168,75,0.15)]">
          {/* Header */}
          <div className="gold-gradient p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#09090d]/20 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-[#09090d]" />
              </div>
              <div>
                <h3 className="font-bold text-[#09090d] text-lg">RealSearch Client for Windows</h3>
                <p className="text-sm text-[#09090d]/60 font-medium">Phiên bản mới nhất</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#09090d]/15 border border-[#09090d]/10">
              <Shield className="w-4 h-4 text-[#09090d]" />
              <span className="text-xs font-bold text-[#09090d] uppercase tracking-wider">Verified</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* What it does */}
            <div>
              <p className="text-xs font-bold text-[#d4a84b] mb-3.5 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> App tự động thực hiện
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Eye, text: "View link website tự động", desc: "Truy cập, đọc, cuộn trang như người thật", color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.06)]", border: "border-[rgba(212,168,75,0.1)]" },
                  { icon: Search, text: "Search keyword trên Google", desc: "Tìm kiếm & click vào kết quả tự nhiên", color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                  { icon: MousePointerClick, text: "Click link nội bộ & tương tác", desc: "Duyệt nhiều trang, tăng session duration", color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10" },
                  { icon: Globe, text: "Xem video YouTube, TikTok", desc: "Tăng lượt xem, tương tác mạng xã hội", color: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/10" },
                  { icon: Link2, text: "Tạo backlink tự động", desc: "Đăng ký directory, forum, comment link", color: "text-cyan-400", bg: "bg-cyan-500/5", border: "border-cyan-500/10" },
                  { icon: BarChart3, text: "Mọi thứ như người thật", desc: "Chuột Bezier, gõ phím tự nhiên, hành vi ngẫu nhiên", color: "text-orange-400", bg: "bg-orange-500/5", border: "border-orange-500/10" },
                ].map((feat, i) => (
                  <div key={i} className={`p-3.5 rounded-xl ${feat.bg} border ${feat.border} transition-all hover:border-opacity-30`}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className={`w-8 h-8 rounded-lg ${feat.bg} flex items-center justify-center`}>
                        <feat.icon className={`w-4 h-4 ${feat.color}`} />
                      </div>
                      <span className="text-sm text-[#f5f0e8] font-semibold">{feat.text}</span>
                    </div>
                    <p className="text-xs text-[#8a8999] ml-[42px]">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div className="p-4 rounded-xl glass-gold">
              <p className="text-xs font-bold text-[#d4a84b] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Lợi ích khi chạy RealSearch
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  "Kiếm credit tự động 24/7, đổi sang traffic cho website của bạn",
                  "Traffic tự nhiên, đa dạng IP & hành vi \u2014 Google đánh giá cao",
                  "Tăng thứ hạng keyword qua CTR thực tế từ trang tìm kiếm",
                  "Hoàn toàn miễn phí \u2014 bật máy, chạy nền, kiếm credit",
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-[#f5f0e8] leading-relaxed">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            <div className="p-4 rounded-xl glass-dark border border-[rgba(255,255,255,0.03)]">
              <p className="text-xs font-bold text-[#8a8999] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Yêu cầu hệ thống
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Monitor, text: "Windows 10/11 (64-bit)" },
                  { icon: Cpu, text: "RAM tối thiểu 4GB" },
                  { icon: Wifi, text: "Internet ổn định" },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <req.icon className="w-4 h-4 text-[#555]" />
                    <span className="text-xs text-[#8a8999]">{req.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <p className="text-xs font-bold text-[#f5f0e8] mb-4 uppercase tracking-wider">Cài đặt trong 30 giây</p>
              <div className="space-y-3">
                {[
                  { text: "Tải file RealSearch.exe bên dưới", sub: "App tự cài vào máy & tạo shortcut trên Desktop" },
                  { text: "Mở app, đăng nhập bằng tài khoản RealSearch", sub: "Hỗ trợ ghi nhớ đăng nhập, lần sau mở là chạy luôn" },
                  { text: 'Nhấn "Bắt đầu" \u2014 xong!', sub: "Hệ thống tự kết nối server, nhận task và thực hiện" },
                  { text: "Ngồi chờ credit về tài khoản", sub: "App tự cập nhật phiên bản mới, không cần tải lại" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center shrink-0 mt-0.5 group-hover:gold-glow-subtle transition-all">
                      <span className="text-xs font-bold text-[#09090d]">{i + 1}</span>
                    </div>
                    <div>
                      <span className="text-sm text-[#f5f0e8] font-medium">{step.text}</span>
                      <p className="text-xs text-[#555] mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Button */}
            <a
              href="https://github.com/TechReal89/RealSearch/releases/latest/download/RealSearch.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-xl gold-gradient text-[#09090d] font-bold text-base hover:opacity-90 transition-all gold-glow btn-gold-hover"
            >
              <Download className="w-5 h-5" />
              Tải RealSearch.exe
              <ArrowRight className="w-5 h-5" />
            </a>

            <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Shield className="w-3 h-3 text-[#d4a84b]" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">An toàn</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Zap className="w-3 h-3 text-[#d4a84b]" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Auto-Update</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Chạy ẩn 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
