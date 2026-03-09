"""Màn hình đăng nhập."""
import asyncio
import base64
import json
import tkinter as tk
from tkinter import ttk, messagebox

from src.config import get_version, get_app_dir
from src.network.api_client import api

SAVED_CREDENTIALS_FILE = get_app_dir() / "credentials.dat"


def _save_credentials(username: str, password: str):
    """Lưu thông tin đăng nhập (base64 encode đơn giản)."""
    data = json.dumps({"username": username, "password": password})
    encoded = base64.b64encode(data.encode()).decode()
    SAVED_CREDENTIALS_FILE.write_text(encoded, encoding="utf-8")


def _load_credentials() -> tuple[str, str] | None:
    """Đọc thông tin đăng nhập đã lưu."""
    try:
        if SAVED_CREDENTIALS_FILE.exists():
            encoded = SAVED_CREDENTIALS_FILE.read_text(encoding="utf-8").strip()
            data = json.loads(base64.b64decode(encoded).decode())
            return data["username"], data["password"]
    except Exception:
        pass
    return None


def _clear_credentials():
    """Xoá thông tin đăng nhập đã lưu."""
    try:
        if SAVED_CREDENTIALS_FILE.exists():
            SAVED_CREDENTIALS_FILE.unlink()
    except Exception:
        pass


class LoginWindow:
    def __init__(self, on_login_success):
        self.on_login_success = on_login_success
        self.root = tk.Tk()
        self.root.title(f"Real SEO v{get_version()} - Đăng nhập")
        self.root.geometry("400x340")
        self.root.resizable(False, False)
        self._center_window()
        self._build_ui()
        self._load_saved()

    def _center_window(self):
        self.root.update_idletasks()
        w, h = 400, 340
        x = (self.root.winfo_screenwidth() - w) // 2
        y = (self.root.winfo_screenheight() - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _build_ui(self):
        frame = ttk.Frame(self.root, padding=30)
        frame.pack(expand=True, fill="both")

        # Title
        ttk.Label(
            frame, text="Real SEO", font=("Segoe UI", 20, "bold")
        ).pack(pady=(0, 2))
        ttk.Label(
            frame, text=f"v{get_version()}", font=("Segoe UI", 9), foreground="gray"
        ).pack(pady=(0, 3))
        ttk.Label(
            frame, text="Đăng nhập để bắt đầu", font=("Segoe UI", 10)
        ).pack(pady=(0, 15))

        # Username
        ttk.Label(frame, text="Username hoặc Email").pack(anchor="w")
        self.entry_user = ttk.Entry(frame, width=40)
        self.entry_user.pack(pady=(2, 10), fill="x")

        # Password
        ttk.Label(frame, text="Mật khẩu").pack(anchor="w")
        self.entry_pass = ttk.Entry(frame, width=40, show="*")
        self.entry_pass.pack(pady=(2, 8), fill="x")

        # Remember checkbox
        self.remember_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            frame, text="Ghi nhớ tài khoản", variable=self.remember_var
        ).pack(anchor="w", pady=(0, 10))

        # Login button
        self.btn_login = ttk.Button(frame, text="Đăng nhập", command=self._do_login)
        self.btn_login.pack(fill="x")

        # Bind Enter key
        self.root.bind("<Return>", lambda e: self._do_login())
        self.entry_user.focus()

    def _load_saved(self):
        """Điền thông tin đã lưu vào form."""
        saved = _load_credentials()
        if saved:
            username, password = saved
            self.entry_user.insert(0, username)
            self.entry_pass.insert(0, password)
            self.remember_var.set(True)
            # Tự động đăng nhập nếu có thông tin đã lưu
            self.root.after(500, self._do_login)

    def _do_login(self):
        username = self.entry_user.get().strip()
        password = self.entry_pass.get().strip()

        if not username or not password:
            messagebox.showwarning("Lỗi", "Vui lòng nhập đầy đủ thông tin")
            return

        self.btn_login.config(state="disabled", text="Đang xử lý...")

        # Lưu hoặc xoá credentials
        if self.remember_var.get():
            _save_credentials(username, password)
        else:
            _clear_credentials()

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
