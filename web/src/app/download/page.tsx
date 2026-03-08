"use client";

import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DownloadPage() {
  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Tải ứng dụng</h2>

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>RealSearch Client cho Windows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Cài đặt ứng dụng trên máy tính để tự động kiếm credit bằng cách chạy các task
              từ hệ thống. Ứng dụng chạy nền, không ảnh hưởng đến công việc của bạn.
            </p>

            <div className="space-y-2 text-sm">
              <p><strong>Yêu cầu hệ thống:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Windows 10/11 (64-bit)</li>
                <li>RAM tối thiểu 4GB</li>
                <li>Kết nối Internet ổn định</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <p><strong>Hướng dẫn:</strong></p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>Tải file RealSearch.exe bên dưới</li>
                <li>Chạy file, đăng nhập bằng tài khoản RealSearch</li>
                <li>Nhấn &quot;Bắt đầu&quot; để tự động kiếm credit</li>
                <li>App sẽ tự động cập nhật khi có phiên bản mới</li>
              </ol>
            </div>

            <a
              href="https://github.com/TechReal89/RealSearch/releases/latest/download/RealSearch.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full rounded-md bg-primary text-primary-foreground h-11 px-8 text-sm font-medium hover:bg-primary/90"
            >
              Tải RealSearch.exe
            </a>

            <p className="text-xs text-center text-muted-foreground">
              Phiên bản mới nhất tự động từ GitHub Releases
            </p>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
