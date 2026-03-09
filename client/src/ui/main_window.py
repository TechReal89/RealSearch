"""Cửa sổ chính sau khi đăng nhập - VIP Luxury Gold Theme."""
import asyncio
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext

from src.config import config, get_version, get_icon_path
from src.jobs.viewlink import ViewLinkExecutor
from src.jobs.keyword_seo import KeywordSEOExecutor
from src.jobs.backlink import BacklinkExecutor
from src.jobs.social_media import SocialMediaExecutor
from src.network.api_client import api
from src.network.ws_client import ws_client, set_callbacks
from src.utils.logger import log, set_ui_callback

# === VIP Gold Color Palette ===
COLORS = {
    "bg": "#09090d",
    "bg_card": "#111118",
    "bg_input": "#0a0a10",
    "bg_log": "#0c0c12",
    "gold": "#d4a84b",
    "gold_light": "#f0d78c",
    "gold_dark": "#b8860b",
    "text": "#f5f0e8",
    "text_muted": "#8a8999",
    "text_dim": "#555555",
    "border": "#1e1e2d",
    "border_gold": "#2a2418",
    "green": "#22c55e",
    "red": "#ef4444",
    "yellow": "#eab308",
    "cyan": "#22d3ee",
    "orange": "#f97316",
}


class MainWindow:
    def __init__(self, user_data: dict):
        self.user = user_data
        self.running = False
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ws_thread: threading.Thread | None = None

        # Job executors
        self.executors = {
            "viewlink": ViewLinkExecutor(),
            "keyword_seo": KeywordSEOExecutor(),
            "backlink": BacklinkExecutor(),
            "social_media": SocialMediaExecutor(),
        }

        self.root = tk.Tk()
        self.root.title(f"RealSearch v{get_version()}")
        self.root.geometry("750x550")
        self.root.minsize(650, 450)
        self.root.configure(bg=COLORS["bg"])
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # Set window icon
        icon_path = get_icon_path()
        if icon_path:
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        self._setup_styles()
        self._build_ui()
        self._setup_callbacks()

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background=COLORS["bg"], foreground=COLORS["text"])
        style.configure("TFrame", background=COLORS["bg"])
        style.configure("Card.TFrame", background=COLORS["bg_card"])
        style.configure("TLabel", background=COLORS["bg"], foreground=COLORS["text"])
        style.configure("Card.TLabel", background=COLORS["bg_card"], foreground=COLORS["text"])
        style.configure("Gold.TLabel", background=COLORS["bg"], foreground=COLORS["gold"])
        style.configure("CardGold.TLabel", background=COLORS["bg_card"], foreground=COLORS["gold"])
        style.configure("Muted.TLabel", background=COLORS["bg"], foreground=COLORS["text_muted"])
        style.configure("CardMuted.TLabel", background=COLORS["bg_card"], foreground=COLORS["text_muted"])

        # Buttons
        style.configure("Gold.TButton",
                        background=COLORS["gold"],
                        foreground=COLORS["bg"],
                        borderwidth=0,
                        font=("Segoe UI", 10, "bold"),
                        padding=(12, 8))
        style.map("Gold.TButton",
                   background=[("active", COLORS["gold_dark"]),
                               ("disabled", COLORS["border"])])

        style.configure("Stop.TButton",
                        background=COLORS["border"],
                        foreground=COLORS["text_muted"],
                        borderwidth=0,
                        font=("Segoe UI", 10),
                        padding=(12, 8))
        style.map("Stop.TButton",
                   background=[("active", "#2a2a3a"),
                               ("disabled", COLORS["bg"])])

        style.configure("Ghost.TButton",
                        background=COLORS["bg_card"],
                        foreground=COLORS["text_muted"],
                        borderwidth=0,
                        font=("Segoe UI", 9),
                        padding=(8, 6))
        style.map("Ghost.TButton",
                   background=[("active", COLORS["border"])])

        # Combobox
        style.configure("TCombobox",
                        fieldbackground=COLORS["bg_input"],
                        foreground=COLORS["text"],
                        bordercolor=COLORS["border_gold"],
                        arrowcolor=COLORS["gold"],
                        padding=(8, 6))
        style.map("TCombobox",
                   fieldbackground=[("readonly", COLORS["bg_input"])],
                   foreground=[("readonly", COLORS["text"])])

        # LabelFrame
        style.configure("Gold.TLabelframe",
                        background=COLORS["bg_card"],
                        foreground=COLORS["gold"],
                        bordercolor=COLORS["border_gold"])
        style.configure("Gold.TLabelframe.Label",
                        background=COLORS["bg_card"],
                        foreground=COLORS["gold"],
                        font=("Segoe UI", 9, "bold"))

    def _build_ui(self):
        # === Header Bar ===
        header = tk.Frame(self.root, bg=COLORS["bg_card"], padx=15, pady=10,
                          highlightbackground=COLORS["border_gold"], highlightthickness=0)
        header.pack(fill="x")

        # Gold top accent
        gold_accent = tk.Canvas(header, width=2000, height=2, bg=COLORS["bg_card"],
                                highlightthickness=0)
        gold_accent.create_line(0, 1, 2000, 1, fill=COLORS["gold"], width=2)
        gold_accent.pack(fill="x", pady=(0, 8))

        # User info row
        info_row = tk.Frame(header, bg=COLORS["bg_card"])
        info_row.pack(fill="x")

        # Left: user greeting
        left = tk.Frame(info_row, bg=COLORS["bg_card"])
        left.pack(side="left")

        tk.Label(
            left, text=f"🔍 {self.user.get('full_name', self.user['username'])}",
            font=("Segoe UI", 13, "bold"),
            bg=COLORS["bg_card"], fg=COLORS["text"]
        ).pack(side="left")

        # Center: credit + tier badges
        center = tk.Frame(info_row, bg=COLORS["bg_card"])
        center.pack(side="left", padx=20)

        # Credit badge
        credit_badge = tk.Frame(center, bg="#1a1510", padx=10, pady=3,
                                highlightbackground=COLORS["border_gold"], highlightthickness=1)
        credit_badge.pack(side="left", padx=(0, 8))
        tk.Label(
            credit_badge, text=f"💰 {self.user.get('credit_balance', 0):,}",
            font=("Segoe UI", 10, "bold"),
            bg="#1a1510", fg=COLORS["gold"]
        ).pack()
        self.lbl_credit = credit_badge.winfo_children()[0]

        # Tier badge
        tier = self.user.get('tier', 'bronze').title()
        tier_colors = {
            "Bronze": "#CD7F32", "Silver": "#C0C0C0",
            "Gold": COLORS["gold"], "Diamond": "#22d3ee"
        }
        tier_color = tier_colors.get(tier, "#CD7F32")

        tier_badge = tk.Frame(center, bg=COLORS["bg_card"], padx=8, pady=3,
                              highlightbackground=tier_color, highlightthickness=1)
        tier_badge.pack(side="left")
        tier_icons = {"Bronze": "🛡️", "Silver": "🏅", "Gold": "👑", "Diamond": "💎"}
        tk.Label(
            tier_badge, text=f"{tier_icons.get(tier, '🛡️')} {tier}",
            font=("Segoe UI", 9, "bold"),
            bg=COLORS["bg_card"], fg=tier_color
        ).pack()

        # Right: logout
        ttk.Button(
            info_row, text="Đăng xuất", command=self._logout,
            style="Ghost.TButton"
        ).pack(side="right")

        # === Status & Controls ===
        ctrl_frame = tk.Frame(self.root, bg=COLORS["bg"], padx=15, pady=10)
        ctrl_frame.pack(fill="x")

        # Status indicator
        self.lbl_status = tk.Label(
            ctrl_frame, text="⚪  Chưa kết nối",
            font=("Segoe UI", 10),
            bg=COLORS["bg"], fg=COLORS["text_muted"]
        )
        self.lbl_status.pack(side="left")

        # Task counter
        self.lbl_tasks = tk.Label(
            ctrl_frame, text="✅ 0  ❌ 0",
            font=("Segoe UI", 9),
            bg=COLORS["bg"], fg=COLORS["text_dim"]
        )
        self.lbl_tasks.pack(side="right")

        # Buttons row
        btn_frame = tk.Frame(self.root, bg=COLORS["bg"], padx=15)
        btn_frame.pack(fill="x", pady=(0, 5))

        self.btn_start = ttk.Button(
            btn_frame, text="▶  BẮT ĐẦU", command=self._start,
            style="Gold.TButton", width=15
        )
        self.btn_start.pack(side="left", padx=(0, 8))

        self.btn_stop = ttk.Button(
            btn_frame, text="⏹  DỪNG", command=self._stop,
            style="Stop.TButton", width=15
        )
        self.btn_stop.pack(side="left")
        self.btn_stop.config(state="disabled")

        # Settings (right side)
        settings_frame = tk.Frame(btn_frame, bg=COLORS["bg_card"], padx=10, pady=5,
                                  highlightbackground=COLORS["border_gold"], highlightthickness=1)
        settings_frame.pack(side="right")

        tk.Label(
            settings_frame, text="Trình duyệt:",
            font=("Segoe UI", 9),
            bg=COLORS["bg_card"], fg=COLORS["text_muted"]
        ).pack(side="left", padx=(0, 5))

        self._mode_labels = {
            "Ẩn hoàn toàn": "headless",
            "Chạy ẩn (khuyên dùng)": "headed_hidden",
            "Hiển thị": "headed",
        }
        self._mode_reverse = {v: k for k, v in self._mode_labels.items()}
        mode_display = list(self._mode_labels.keys())

        self.combo_mode = ttk.Combobox(
            settings_frame,
            values=mode_display,
            state="readonly",
            width=22,
        )
        self.combo_mode.set(self._mode_reverse.get(config.browser_mode, "Chạy ẩn (khuyên dùng)"))
        self.combo_mode.pack(side="left")
        self.combo_mode.bind("<<ComboboxSelected>>", self._on_mode_change)

        # === Ornament line ===
        ornament = tk.Canvas(self.root, width=2000, height=1, bg=COLORS["bg"],
                             highlightthickness=0)
        ornament.create_line(0, 0, 2000, 0, fill=COLORS["border_gold"], width=1)
        ornament.pack(fill="x", padx=15, pady=5)

        # === Log Viewer ===
        log_outer = tk.Frame(self.root, bg=COLORS["bg"], padx=15)
        log_outer.pack(fill="both", expand=True, pady=(0, 10))

        # Log header
        log_header = tk.Frame(log_outer, bg=COLORS["bg_card"], padx=10, pady=6,
                              highlightbackground=COLORS["border_gold"], highlightthickness=1)
        log_header.pack(fill="x")
        tk.Label(
            log_header, text="📋  NHẬT KÝ HOẠT ĐỘNG",
            font=("Segoe UI", 9, "bold"),
            bg=COLORS["bg_card"], fg=COLORS["gold"]
        ).pack(side="left")

        # Log text
        self.log_text = scrolledtext.ScrolledText(
            log_outer,
            wrap="word",
            font=("Consolas", 9),
            state="disabled",
            bg=COLORS["bg_log"],
            fg="#c8c8d4",
            insertbackground=COLORS["gold"],
            selectbackground=COLORS["gold_dark"],
            selectforeground=COLORS["text"],
            borderwidth=0,
            highlightbackground=COLORS["border_gold"],
            highlightthickness=1,
            padx=10,
            pady=8,
        )
        self.log_text.pack(fill="both", expand=True)

        # Log color tags
        self.log_text.tag_config("INFO", foreground=COLORS["cyan"])
        self.log_text.tag_config("WARNING", foreground=COLORS["orange"])
        self.log_text.tag_config("ERROR", foreground=COLORS["red"])
        self.log_text.tag_config("GOLD", foreground=COLORS["gold"])

        # Stats counters
        self.tasks_completed = 0
        self.tasks_failed = 0

    def _setup_callbacks(self):
        set_ui_callback(self._append_log)
        set_callbacks(
            on_task_assign=self._on_task_assign,
            on_credit_update=self._on_credit_update,
            on_broadcast=self._on_broadcast,
            on_status_change=self._on_status_change,
        )

    def _append_log(self, msg: str):
        """Thread-safe append log."""
        def _do():
            self.log_text.config(state="normal")
            tag = "INFO"
            if "WARNING" in msg or "WARN" in msg:
                tag = "WARNING"
            elif "ERROR" in msg:
                tag = "ERROR"
            elif "credit" in msg.lower() or "Credit" in msg:
                tag = "GOLD"
            self.log_text.insert("end", msg + "\n", tag)
            self.log_text.see("end")
            self.log_text.config(state="disabled")

        self.root.after(0, _do)

    def _on_status_change(self, status: str):
        def _do():
            if status == "connected":
                self.lbl_status.config(
                    text="🟢  Đã kết nối - Đang chờ task",
                    fg=COLORS["green"]
                )
            else:
                self.lbl_status.config(
                    text="🔴  Mất kết nối",
                    fg=COLORS["red"]
                )
        self.root.after(0, _do)

    def _on_credit_update(self, data: dict):
        def _do():
            balance = data.get('balance', 0)
            self.lbl_credit.config(text=f"💰 {balance:,}")
        self.root.after(0, _do)

    def _on_broadcast(self, data: dict):
        log.info(f"📢 {data.get('message', '')}")

    async def _on_task_assign(self, task_data: dict):
        """Nhận và thực thi task."""
        task_id = task_data["task_id"]
        job_type = task_data["job_type"]

        executor = self.executors.get(job_type)
        if not executor:
            await ws_client.send_task_failed(
                task_id, "UNSUPPORTED", f"Job type {job_type} không hỗ trợ"
            )
            return

        await ws_client.send_task_accepted(task_id)

        try:
            result = await executor.execute(task_data)
            await ws_client.send_task_completed(task_id, result)
            self.tasks_completed += 1
        except Exception as e:
            log.error(f"[Task #{task_id}] Lỗi: {e}")
            await ws_client.send_task_failed(task_id, "EXECUTION_ERROR", str(e))
            self.tasks_failed += 1

        self.root.after(0, lambda: self.lbl_tasks.config(
            text=f"✅ {self.tasks_completed}  ❌ {self.tasks_failed}"
        ))

    def _start(self):
        """Bắt đầu kết nối và nhận task."""
        if self.running:
            return

        self.running = True
        self.btn_start.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.lbl_status.config(text="🟡  Đang kết nối...", fg=COLORS["yellow"])

        log.info("Bắt đầu kết nối server...")

        self._ws_thread = threading.Thread(target=self._run_ws_loop, daemon=True)
        self._ws_thread.start()

    def _run_ws_loop(self):
        """Chạy WebSocket loop trong thread riêng."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(ws_client.connect())
        except Exception as e:
            log.error(f"WebSocket loop error: {e}")
        finally:
            self._loop.close()
            self._loop = None

    def _stop(self):
        """Dừng kết nối."""
        if not self.running:
            return

        self.running = False
        log.info("Đang dừng...")

        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_client.disconnect(), self._loop)

        self.btn_start.config(state="normal")
        self.btn_stop.config(state="disabled")
        self.lbl_status.config(text="⚪  Đã dừng", fg=COLORS["text_muted"])

    def _on_mode_change(self, event):
        display = self.combo_mode.get()
        mode = self._mode_labels.get(display, "headed_hidden")
        config.set("browser_mode", mode)
        log.info(f"Đổi chế độ trình duyệt: {display}")

    def _logout(self):
        self._stop()
        api.logout()
        self.root.destroy()
        # Restart login
        from src.ui.login_window import LoginWindow
        from src.main import on_login_success
        login = LoginWindow(on_login_success)
        login.run()

    def _on_close(self):
        self._stop()
        self.root.destroy()

    def run(self):
        log.info(f"RealSearch {get_version()} - Sẵn sàng")
        log.info(f"User: {self.user['username']} | Tier: {self.user.get('tier', 'bronze').title()}")

        if config.get("auto_start"):
            self.root.after(1000, self._start)

        self.root.mainloop()
