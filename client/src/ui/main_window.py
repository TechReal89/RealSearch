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
from src.ui.tray_icon import TrayIcon
from src.ui.scheduler import ScheduleManager
from src.utils.autostart import is_autostart_enabled, enable_autostart, disable_autostart
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

DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]


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
        self.root.geometry("750x600")
        self.root.minsize(650, 500)
        self.root.configure(bg=COLORS["bg"])
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        # Set window icon
        icon_path = get_icon_path()
        if icon_path:
            try:
                self.root.iconbitmap(icon_path)
            except Exception:
                pass

        # System Tray
        self.tray = TrayIcon(self.root, icon_path, on_quit=self._on_quit)
        self.tray.setup()

        # Schedule Manager
        self.scheduler = ScheduleManager(
            on_start=lambda: self.root.after(0, self._start),
            on_stop=lambda: self.root.after(0, self._stop),
        )

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

        style.configure("Small.TButton",
                        background=COLORS["border"],
                        foreground=COLORS["text_muted"],
                        borderwidth=0,
                        font=("Segoe UI", 8),
                        padding=(6, 4))
        style.map("Small.TButton",
                   background=[("active", "#2a2a3a")])

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

        # Checkbutton
        style.configure("TCheckbutton",
                        background=COLORS["bg_card"],
                        foreground=COLORS["text_muted"],
                        font=("Segoe UI", 9))
        style.map("TCheckbutton",
                   background=[("active", COLORS["bg_card"])])

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

        # === Schedule & Autostart Settings ===
        self._build_schedule_panel()

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
        self._active_tasks: set[int] = set()

    def _build_schedule_panel(self):
        """Xây dựng panel cài đặt hẹn giờ & autostart."""
        panel = tk.Frame(self.root, bg=COLORS["bg_card"], padx=12, pady=8,
                         highlightbackground=COLORS["border_gold"], highlightthickness=1)
        panel.pack(fill="x", padx=15, pady=(5, 0))

        # Row 1: Header
        header_row = tk.Frame(panel, bg=COLORS["bg_card"])
        header_row.pack(fill="x")
        tk.Label(
            header_row, text="⚙️  CÀI ĐẶT TỰ ĐỘNG",
            font=("Segoe UI", 9, "bold"),
            bg=COLORS["bg_card"], fg=COLORS["gold"]
        ).pack(side="left")

        # Toggle expand/collapse
        self._settings_expanded = True
        self._settings_content = tk.Frame(panel, bg=COLORS["bg_card"])
        self._settings_content.pack(fill="x", pady=(5, 0))

        # Row 2: Schedule controls
        sched_row = tk.Frame(self._settings_content, bg=COLORS["bg_card"])
        sched_row.pack(fill="x", pady=(0, 5))

        # Schedule enable checkbox
        self._schedule_var = tk.BooleanVar(value=config.get("schedule_enabled", False))
        ttk.Checkbutton(
            sched_row, text="Hẹn giờ chạy:",
            variable=self._schedule_var,
            command=self._on_schedule_toggle,
            style="TCheckbutton"
        ).pack(side="left")

        # Start time
        tk.Label(sched_row, text="Bắt đầu:", font=("Segoe UI", 9),
                 bg=COLORS["bg_card"], fg=COLORS["text_muted"]).pack(side="left", padx=(10, 3))

        self._start_hour = ttk.Combobox(sched_row, values=[f"{h:02d}" for h in range(24)],
                                        width=3, state="readonly")
        start_time = config.get("schedule_time", "22:00")
        self._start_hour.set(start_time.split(":")[0])
        self._start_hour.pack(side="left")

        tk.Label(sched_row, text=":", bg=COLORS["bg_card"], fg=COLORS["text_muted"]).pack(side="left")

        self._start_min = ttk.Combobox(sched_row, values=[f"{m:02d}" for m in range(0, 60, 5)],
                                       width=3, state="readonly")
        self._start_min.set(start_time.split(":")[1])
        self._start_min.pack(side="left")

        # Stop time
        tk.Label(sched_row, text="  Dừng:", font=("Segoe UI", 9),
                 bg=COLORS["bg_card"], fg=COLORS["text_muted"]).pack(side="left", padx=(10, 3))

        self._stop_hour = ttk.Combobox(sched_row, values=["--"] + [f"{h:02d}" for h in range(24)],
                                       width=3, state="readonly")
        self._stop_min = ttk.Combobox(sched_row, values=["--"] + [f"{m:02d}" for m in range(0, 60, 5)],
                                      width=3, state="readonly")

        stop_time = config.get("schedule_stop_time")
        if stop_time:
            self._stop_hour.set(stop_time.split(":")[0])
            self._stop_min.set(stop_time.split(":")[1])
        else:
            self._stop_hour.set("--")
            self._stop_min.set("--")

        self._stop_hour.pack(side="left")
        tk.Label(sched_row, text=":", bg=COLORS["bg_card"], fg=COLORS["text_muted"]).pack(side="left")
        self._stop_min.pack(side="left")

        # Save schedule button
        ttk.Button(sched_row, text="Lưu", command=self._save_schedule,
                   style="Small.TButton", width=5).pack(side="left", padx=(10, 0))

        # Row 3: Day selector
        day_row = tk.Frame(self._settings_content, bg=COLORS["bg_card"])
        day_row.pack(fill="x", pady=(0, 5))

        tk.Label(day_row, text="Ngày chạy:", font=("Segoe UI", 9),
                 bg=COLORS["bg_card"], fg=COLORS["text_muted"]).pack(side="left", padx=(0, 8))

        saved_days = config.get("schedule_days", [0, 1, 2, 3, 4, 5, 6])
        self._day_vars = []
        for i, name in enumerate(DAY_NAMES):
            var = tk.BooleanVar(value=(i in saved_days))
            self._day_vars.append(var)
            ttk.Checkbutton(
                day_row, text=name, variable=var,
                style="TCheckbutton"
            ).pack(side="left", padx=2)

        # Row 4: Autostart + Tray
        auto_row = tk.Frame(self._settings_content, bg=COLORS["bg_card"])
        auto_row.pack(fill="x")

        # Autostart Windows
        self._autostart_var = tk.BooleanVar(value=is_autostart_enabled())
        ttk.Checkbutton(
            auto_row, text="Khởi động cùng Windows",
            variable=self._autostart_var,
            command=self._on_autostart_toggle,
            style="TCheckbutton"
        ).pack(side="left")

        # Minimize to tray
        self._tray_var = tk.BooleanVar(value=config.get("minimize_to_tray", True))
        ttk.Checkbutton(
            auto_row, text="Thu nhỏ xuống khay khi đóng",
            variable=self._tray_var,
            command=self._on_tray_toggle,
            style="TCheckbutton"
        ).pack(side="left", padx=(20, 0))

        # Schedule status label
        self._sched_status = tk.Label(
            auto_row, text="",
            font=("Segoe UI", 8),
            bg=COLORS["bg_card"], fg=COLORS["text_dim"]
        )
        self._sched_status.pack(side="right")
        self._update_schedule_status()

    def _update_schedule_status(self):
        """Cập nhật label hiển thị trạng thái hẹn giờ."""
        if config.get("schedule_enabled"):
            t = config.get("schedule_time", "22:00")
            stop = config.get("schedule_stop_time")
            days = config.get("schedule_days", [0, 1, 2, 3, 4, 5, 6])
            day_str = ", ".join(DAY_NAMES[d] for d in days if d < 7)
            text = f"⏰ {t}"
            if stop:
                text += f" → {stop}"
            text += f" | {day_str}"
            self._sched_status.config(text=text, fg=COLORS["green"])
        else:
            self._sched_status.config(text="Hẹn giờ: TẮT", fg=COLORS["text_dim"])

    def _on_schedule_toggle(self):
        """Toggle hẹn giờ bật/tắt."""
        enabled = self._schedule_var.get()
        if enabled:
            self._save_schedule()
        else:
            config.set("schedule_enabled", False)
            log.info("Đã tắt hẹn giờ")
        self._update_schedule_status()

    def _save_schedule(self):
        """Lưu cấu hình hẹn giờ."""
        start_time = f"{self._start_hour.get()}:{self._start_min.get()}"

        stop_h = self._stop_hour.get()
        stop_m = self._stop_min.get()
        stop_time = None
        if stop_h != "--" and stop_m != "--":
            stop_time = f"{stop_h}:{stop_m}"

        days = [i for i, var in enumerate(self._day_vars) if var.get()]
        if not days:
            days = [0, 1, 2, 3, 4, 5, 6]

        enabled = self._schedule_var.get()
        self.scheduler.update_config(enabled, start_time, stop_time, days)
        self._update_schedule_status()
        log.info(f"Đã lưu hẹn giờ: {start_time}" + (f" → {stop_time}" if stop_time else ""))

    def _on_autostart_toggle(self):
        """Toggle khởi động cùng Windows."""
        if self._autostart_var.get():
            if enable_autostart():
                config.set("autostart_windows", True)
                log.info("Đã bật khởi động cùng Windows")
            else:
                self._autostart_var.set(False)
        else:
            disable_autostart()
            config.set("autostart_windows", False)
            log.info("Đã tắt khởi động cùng Windows")

    def _on_tray_toggle(self):
        """Toggle minimize to tray."""
        config.set("minimize_to_tray", self._tray_var.get())
        state = "BẬT" if self._tray_var.get() else "TẮT"
        log.info(f"Thu nhỏ xuống khay: {state}")

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
                # Update tray status
                self.root._main_window_running = True
            else:
                self.lbl_status.config(
                    text="🔴  Mất kết nối",
                    fg=COLORS["red"]
                )
                self.root._main_window_running = False
        self.root.after(0, _do)

    def _on_credit_update(self, data: dict):
        def _do():
            balance = data.get('balance', 0)
            self.lbl_credit.config(text=f"💰 {balance:,}")
        self.root.after(0, _do)

    def _on_broadcast(self, data: dict):
        log.info(f"📢 {data.get('message', '')}")

    async def _on_task_assign(self, task_data: dict):
        """Nhận và thực thi task (hỗ trợ multi-task song song)."""
        task_id = task_data["task_id"]
        job_type = task_data["job_type"]

        # Reject nếu đã đạt max_concurrent
        if len(self._active_tasks) >= config.max_concurrent:
            await ws_client.send("task_rejected", {
                "task_id": task_id,
                "reason": "browser_busy",
            })
            log.info(f"[Task #{task_id}] Từ chối - đang chạy {len(self._active_tasks)} task")
            return

        executor = self.executors.get(job_type)
        if not executor:
            await ws_client.send_task_failed(
                task_id, "UNSUPPORTED", f"Job type {job_type} không hỗ trợ"
            )
            return

        await ws_client.send_task_accepted(task_id)
        self._active_tasks.add(task_id)

        # Chạy task trong asyncio.Task riêng để không block WS loop
        asyncio.create_task(self._execute_task(task_id, executor, task_data))

    async def _execute_task(self, task_id: int, executor, task_data: dict):
        """Thực thi task trong background."""
        try:
            result = await executor.execute(task_data)
            await ws_client.send_task_completed(task_id, result)
            self.tasks_completed += 1
        except Exception as e:
            log.error(f"[Task #{task_id}] Lỗi: {e}")
            await ws_client.send_task_failed(task_id, "EXECUTION_ERROR", str(e))
            self.tasks_failed += 1
        finally:
            self._active_tasks.discard(task_id)

        self.root.after(0, lambda: self.lbl_tasks.config(
            text=f"✅ {self.tasks_completed}  ❌ {self.tasks_failed}"
        ))

    def _start(self):
        """Bắt đầu kết nối và nhận task."""
        if self.running:
            return

        self.running = True
        self.root._main_window_running = True
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
        self.root._main_window_running = False
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
        self._cleanup()
        api.logout()
        self.root.destroy()
        # Restart login
        from src.ui.login_window import LoginWindow
        from src.main import on_login_success
        login = LoginWindow(on_login_success)
        login.run()

    def _on_close(self):
        """Xử lý khi ấn nút X."""
        # Nếu bật minimize to tray và tray khả dụng -> ẩn xuống tray
        if config.get("minimize_to_tray", True) and self.tray.available:
            if self.tray.hide_to_tray():
                return
        # Nếu không có tray -> thoát hoàn toàn
        self._on_quit()

    def _on_quit(self):
        """Thoát hoàn toàn ứng dụng."""
        self._cleanup()
        self.root.destroy()

    def _cleanup(self):
        """Dọn dẹp trước khi thoát."""
        self._stop()
        self.scheduler.stop_monitoring()
        self.tray.destroy()

    def run(self):
        log.info(f"RealSearch {get_version()} - Sẵn sàng")
        log.info(f"User: {self.user['username']} | Tier: {self.user.get('tier', 'bronze').title()}")

        # Start schedule monitoring
        self.scheduler.start_monitoring()

        if config.get("auto_start"):
            self.root.after(1000, self._start)

        self.root.mainloop()
