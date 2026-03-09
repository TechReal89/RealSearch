"use client";

import { UserLayout } from "@/components/layout/user-layout";
import {
  Download, Monitor, Cpu, Wifi, Shield, Zap, CheckCircle, ArrowRight, Coins, Crown, Sparkles, Star,
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
          <p className="text-[#8a8999] mt-2">Cài đặt trên máy tính để tự động kiếm credit mỗi ngày</p>
          <div className="ornament-line mt-5 max-w-xs mx-auto" />
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
                <p className="text-sm text-[#09090d]/60 font-medium">Phiên bản mới nhất v0.3.2</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#09090d]/15 border border-[#09090d]/10">
              <Shield className="w-4 h-4 text-[#09090d]" />
              <span className="text-xs font-bold text-[#09090d] uppercase tracking-wider">Verified</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Description */}
            <p className="text-[#8a8999] leading-relaxed">
              Ứng dụng chạy nền trên máy tính, tự động thực hiện các task từ hệ thống và kiếm credit cho bạn.
              Hoàn toàn không ảnh hưởng đến công việc hàng ngày.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Zap, text: "Kiếm credit tự động 24/7", color: "text-[#d4a84b]", bg: "bg-[rgba(212,168,75,0.06)]", border: "border-[rgba(212,168,75,0.1)]" },
                { icon: Shield, text: "Chạy ẩn, không gây phiền", color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
                { icon: Sparkles, text: "Tự động cập nhật phiên bản", color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10" },
                { icon: Crown, text: "Hỗ trợ tất cả tier VIP", color: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/10" },
              ].map((feat, i) => (
                <div key={i} className={`flex items-center gap-2.5 p-3.5 rounded-xl ${feat.bg} border ${feat.border} transition-all hover:border-opacity-30`}>
                  <div className={`w-8 h-8 rounded-lg ${feat.bg} flex items-center justify-center`}>
                    <feat.icon className={`w-4 h-4 ${feat.color}`} />
                  </div>
                  <span className="text-sm text-[#f5f0e8] font-medium">{feat.text}</span>
                </div>
              ))}
            </div>

            {/* Requirements */}
            <div className="p-4 rounded-xl glass-gold">
              <p className="text-xs font-bold text-[#d4a84b] mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-3 h-3" /> Yêu cầu hệ thống
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: Monitor, text: "Windows 10/11 (64-bit)" },
                  { icon: Cpu, text: "RAM tối thiểu 4GB" },
                  { icon: Wifi, text: "Internet ổn định" },
                ].map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <req.icon className="w-4 h-4 text-[#8a8999]" />
                    <span className="text-xs text-[#8a8999]">{req.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div>
              <p className="text-xs font-bold text-[#f5f0e8] mb-4 uppercase tracking-wider">Hướng dẫn cài đặt</p>
              <div className="space-y-3">
                {[
                  "Tải file RealSearch.exe bên dưới",
                  "Chạy file, đăng nhập bằng tài khoản RealSearch",
                  'Nhấn "Bắt đầu" để tự động kiếm credit',
                  "App sẽ tự động cập nhật khi có phiên bản mới",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center shrink-0 mt-0.5 group-hover:gold-glow-subtle transition-all">
                      <span className="text-xs font-bold text-[#09090d]">{i + 1}</span>
                    </div>
                    <span className="text-sm text-[#8a8999] pt-1">{step}</span>
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

            <div className="flex items-center justify-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Shield className="w-3 h-3 text-[#d4a84b]" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Malware-Free</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <Zap className="w-3 h-3 text-[#d4a84b]" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">Auto-Update</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(212,168,75,0.05)] border border-[rgba(212,168,75,0.1)]">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-[#8a8999] uppercase tracking-widest font-semibold">v0.3.2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
