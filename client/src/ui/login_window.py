"""Màn hình đăng nhập - VIP Luxury Gold Theme."""
import asyncio
import base64
import json
import tkinter as tk
from tkinter import ttk, messagebox

from src.config import get_version, get_app_dir, get_icon_path
from src.network.api_client import api

SAVED_CREDENTIALS_FILE = get_app_dir() / "credentials.dat"

# === VIP Gold Color Palette ===
COLORS = {
    "bg": "#09090d",
    "bg_card": "#111118",
    "bg_input": "#0a0a10",
    "gold": "#d4a84b",
    "gold_light": "#f0d78c",
    "gold_dark": "#b8860b",
    "text": "#f5f0e8",
    "text_muted": "#8a8999",
    "text_dim": "#555555",
    "border": "#1e1e2d",
    "border_gold": "#2a2418",
    "error": "#dc2626",
}


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
        self.root.title(f"RealSearch v{get_version()}")
        self.root.geometry("440x420")
        self.root.resizable(False, False)
        self.root.configure(bg=COLORS["bg"])

        # Set window icon
        icon_path = get_icon_path()
        if icon_path:
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        # Remove default title bar styling
        self.root.option_add("*TCombobox*Listbox.background", COLORS["bg_card"])
        self.root.option_add("*TCombobox*Listbox.foreground", COLORS["text"])

        self._setup_styles()
        self._center_window()
        self._build_ui()
        self._load_saved()

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background=COLORS["bg"], foreground=COLORS["text"])
        style.configure("TFrame", background=COLORS["bg"])
        style.configure("Card.TFrame", background=COLORS["bg_card"])
        style.configure("TLabel", background=COLORS["bg"], foreground=COLORS["text"])
        style.configure("Card.TLabel", background=COLORS["bg_card"], foreground=COLORS["text"])
        style.configure("Muted.TLabel", background=COLORS["bg_card"], foreground=COLORS["text_muted"])
        style.configure("Gold.TLabel", background=COLORS["bg"], foreground=COLORS["gold"])
        style.configure("Dim.TLabel", background=COLORS["bg"], foreground=COLORS["text_dim"])

        style.configure("TEntry",
                        fieldbackground=COLORS["bg_input"],
                        foreground=COLORS["text"],
                        bordercolor=COLORS["border_gold"],
                        lightcolor=COLORS["border_gold"],
                        darkcolor=COLORS["border_gold"],
                        insertcolor=COLORS["gold"],
                        padding=(10, 8))
        style.map("TEntry",
                   bordercolor=[("focus", COLORS["gold"])],
                   lightcolor=[("focus", COLORS["gold"])])

        style.configure("Gold.TButton",
                        background=COLORS["gold"],
                        foreground=COLORS["bg"],
                        borderwidth=0,
                        font=("Segoe UI", 10, "bold"),
                        padding=(15, 10))
        style.map("Gold.TButton",
                   background=[("active", COLORS["gold_dark"]),
                               ("disabled", COLORS["border"])])

        style.configure("TCheckbutton",
                        background=COLORS["bg_card"],
                        foreground=COLORS["text_muted"],
                        font=("Segoe UI", 9))
        style.map("TCheckbutton",
                   background=[("active", COLORS["bg_card"])])

    def _center_window(self):
        self.root.update_idletasks()
        w, h = 440, 420
        x = (self.root.winfo_screenwidth() - w) // 2
        y = (self.root.winfo_screenheight() - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _build_ui(self):
        # Main container
        main = tk.Frame(self.root, bg=COLORS["bg"])
        main.pack(expand=True, fill="both", padx=30, pady=20)

        # Logo area
        logo_frame = tk.Frame(main, bg=COLORS["bg"])
        logo_frame.pack(pady=(0, 5))

        # Logo text (kính lúp emoji + crown emoji as placeholder)
        tk.Label(
            logo_frame, text="🔍👑", font=("Segoe UI", 28),
            bg=COLORS["bg"], fg=COLORS["gold"]
        ).pack()

        # Title
        tk.Label(
            main, text="RealSearch",
            font=("Segoe UI", 22, "bold"),
            bg=COLORS["bg"], fg=COLORS["gold"]
        ).pack(pady=(0, 2))

        tk.Label(
            main, text=f"v{get_version()}  •  Premium Platform",
            font=("Segoe UI", 9),
            bg=COLORS["bg"], fg=COLORS["text_dim"]
        ).pack(pady=(0, 3))

        # Ornament line
        ornament = tk.Canvas(main, width=200, height=1, bg=COLORS["bg"],
                             highlightthickness=0)
        ornament.create_line(0, 0, 200, 0, fill=COLORS["border_gold"], width=1)
        ornament.pack(pady=(5, 15))

        # Card frame
        card = tk.Frame(main, bg=COLORS["bg_card"], highlightbackground=COLORS["border_gold"],
                        highlightthickness=1, padx=25, pady=20)
        card.pack(fill="x")

        # Gold top line on card
        gold_line = tk.Canvas(card, width=350, height=2, bg=COLORS["bg_card"],
                              highlightthickness=0)
        gold_line.create_line(0, 1, 350, 1, fill=COLORS["gold"], width=2)
        gold_line.pack(pady=(0, 15))

        # Username
        tk.Label(
            card, text="USERNAME", font=("Segoe UI", 8, "bold"),
            bg=COLORS["bg_card"], fg=COLORS["text_muted"],
        ).pack(anchor="w")
        self.entry_user = ttk.Entry(card, width=40, style="TEntry")
        self.entry_user.pack(pady=(4, 12), fill="x")

        # Password
        tk.Label(
            card, text="MẬT KHẨU", font=("Segoe UI", 8, "bold"),
            bg=COLORS["bg_card"], fg=COLORS["text_muted"],
        ).pack(anchor="w")
        self.entry_pass = ttk.Entry(card, width=40, show="•", style="TEntry")
        self.entry_pass.pack(pady=(4, 10), fill="x")

        # Remember checkbox
        self.remember_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            card, text="Ghi nhớ đăng nhập", variable=self.remember_var,
            style="TCheckbutton"
        ).pack(anchor="w", pady=(0, 12))

        # Login button
        self.btn_login = ttk.Button(
            card, text="ĐĂNG NHẬP  →", command=self._do_login,
            style="Gold.TButton"
        )
        self.btn_login.pack(fill="x")

        # Footer
        tk.Label(
            main, text="🔒  Bảo mật & An toàn",
            font=("Segoe UI", 8),
            bg=COLORS["bg"], fg=COLORS["text_dim"]
        ).pack(pady=(12, 0))

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
            self.btn_login.config(state="normal", text="ĐĂNG NHẬP  →")
        finally:
            loop.close()

    async def _async_login(self, username: str, password: str):
        await api.login(username, password)
        user = await api.get_me()
        self.root.destroy()
        self.on_login_success(user)

    def run(self):
        self.root.mainloop()
