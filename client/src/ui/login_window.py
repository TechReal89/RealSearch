"""Màn hình đăng nhập."""
import asyncio
import tkinter as tk
from tkinter import ttk, messagebox

from src.network.api_client import api


class LoginWindow:
    def __init__(self, on_login_success):
        self.on_login_success = on_login_success
        self.root = tk.Tk()
        self.root.title("RealSearch - Đăng nhập")
        self.root.geometry("400x300")
        self.root.resizable(False, False)
        self._center_window()
        self._build_ui()

    def _center_window(self):
        self.root.update_idletasks()
        w, h = 400, 300
        x = (self.root.winfo_screenwidth() - w) // 2
        y = (self.root.winfo_screenheight() - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _build_ui(self):
        frame = ttk.Frame(self.root, padding=30)
        frame.pack(expand=True, fill="both")

        # Title
        ttk.Label(
            frame, text="RealSearch", font=("Segoe UI", 20, "bold")
        ).pack(pady=(0, 5))
        ttk.Label(
            frame, text="Đăng nhập để bắt đầu", font=("Segoe UI", 10)
        ).pack(pady=(0, 20))

        # Username
        ttk.Label(frame, text="Username hoặc Email").pack(anchor="w")
        self.entry_user = ttk.Entry(frame, width=40)
        self.entry_user.pack(pady=(2, 10), fill="x")

        # Password
        ttk.Label(frame, text="Mật khẩu").pack(anchor="w")
        self.entry_pass = ttk.Entry(frame, width=40, show="*")
        self.entry_pass.pack(pady=(2, 15), fill="x")

        # Login button
        self.btn_login = ttk.Button(frame, text="Đăng nhập", command=self._do_login)
        self.btn_login.pack(fill="x")

        # Bind Enter key
        self.root.bind("<Return>", lambda e: self._do_login())
        self.entry_user.focus()

    def _do_login(self):
        username = self.entry_user.get().strip()
        password = self.entry_pass.get().strip()

        if not username or not password:
            messagebox.showwarning("Lỗi", "Vui lòng nhập đầy đủ thông tin")
            return

        self.btn_login.config(state="disabled", text="Đang xử lý...")

        # Chạy async login
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self._async_login(username, password))
        except Exception as e:
            messagebox.showerror("Đăng nhập thất bại", str(e))
            self.btn_login.config(state="normal", text="Đăng nhập")
        finally:
            loop.close()

    async def _async_login(self, username: str, password: str):
        await api.login(username, password)
        user = await api.get_me()
        self.root.destroy()
        self.on_login_success(user)

    def run(self):
        self.root.mainloop()
