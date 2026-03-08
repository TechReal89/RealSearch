"""Cửa sổ chính sau khi đăng nhập."""
import asyncio
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext

from src.config import config, get_version
from src.jobs.viewlink import ViewLinkExecutor
from src.network.api_client import api
from src.network.ws_client import ws_client, set_callbacks
from src.utils.logger import log, set_ui_callback


class MainWindow:
    def __init__(self, user_data: dict):
        self.user = user_data
        self.running = False
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ws_thread: threading.Thread | None = None

        # Job executors
        self.executors = {
            "viewlink": ViewLinkExecutor(),
        }

        self.root = tk.Tk()
        self.root.title(f"RealSearch Client v{get_version()}")
        self.root.geometry("700x500")
        self.root.minsize(600, 400)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._build_ui()
        self._setup_callbacks()

    def _build_ui(self):
        # === Top bar: User info ===
        top = ttk.Frame(self.root, padding=10)
        top.pack(fill="x")

        ttk.Label(
            top, text=f"Xin chào, {self.user.get('full_name', self.user['username'])}",
            font=("Segoe UI", 12, "bold"),
        ).pack(side="left")

        self.lbl_credit = ttk.Label(
            top, text=f"Credit: {self.user.get('credit_balance', 0)}",
            font=("Segoe UI", 11),
        )
        self.lbl_credit.pack(side="left", padx=20)

        ttk.Label(
            top, text=f"Cấp: {self.user.get('tier', 'bronze').title()}",
            font=("Segoe UI", 10),
        ).pack(side="left")

        self.btn_logout = ttk.Button(top, text="Đăng xuất", command=self._logout)
        self.btn_logout.pack(side="right")

        # === Status bar ===
        status_frame = ttk.Frame(self.root, padding=(10, 5))
        status_frame.pack(fill="x")

        self.lbl_status = ttk.Label(
            status_frame, text="⚪ Chưa kết nối", font=("Segoe UI", 10)
        )
        self.lbl_status.pack(side="left")

        self.lbl_tasks = ttk.Label(
            status_frame, text="Tasks: 0 hoàn thành | 0 lỗi",
            font=("Segoe UI", 9),
        )
        self.lbl_tasks.pack(side="right")

        # === Control buttons ===
        ctrl = ttk.Frame(self.root, padding=(10, 5))
        ctrl.pack(fill="x")

        self.btn_start = ttk.Button(
            ctrl, text="▶ Bắt đầu", command=self._start, width=15
        )
        self.btn_start.pack(side="left", padx=(0, 5))

        self.btn_stop = ttk.Button(
            ctrl, text="⏹ Dừng", command=self._stop, width=15, state="disabled"
        )
        self.btn_stop.pack(side="left")

        # Settings
        settings_frame = ttk.LabelFrame(ctrl, text="Cài đặt", padding=5)
        settings_frame.pack(side="right")

        ttk.Label(settings_frame, text="Trình duyệt:").pack(side="left")

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
        self.combo_mode.pack(side="left", padx=5)
        self.combo_mode.bind("<<ComboboxSelected>>", self._on_mode_change)

        # === Log viewer ===
        log_frame = ttk.LabelFrame(self.root, text="Nhật ký hoạt động", padding=5)
        log_frame.pack(fill="both", expand=True, padx=10, pady=(5, 10))

        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            wrap="word",
            font=("Consolas", 9),
            state="disabled",
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="white",
        )
        self.log_text.pack(fill="both", expand=True)

        # Log tags
        self.log_text.tag_config("INFO", foreground="#4ec9b0")
        self.log_text.tag_config("WARNING", foreground="#ce9178")
        self.log_text.tag_config("ERROR", foreground="#f44747")

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
            self.log_text.insert("end", msg + "\n", tag)
            self.log_text.see("end")
            self.log_text.config(state="disabled")

        self.root.after(0, _do)

    def _on_status_change(self, status: str):
        def _do():
            if status == "connected":
                self.lbl_status.config(text="🟢 Đã kết nối - Đang chờ task")
            else:
                self.lbl_status.config(text="🔴 Mất kết nối")
        self.root.after(0, _do)

    def _on_credit_update(self, data: dict):
        def _do():
            self.lbl_credit.config(text=f"Credit: {data.get('balance', 0)}")
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
            text=f"Tasks: {self.tasks_completed} hoàn thành | {self.tasks_failed} lỗi"
        ))

    def _start(self):
        """Bắt đầu kết nối và nhận task."""
        if self.running:
            return

        self.running = True
        self.btn_start.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.lbl_status.config(text="🟡 Đang kết nối...")

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
        self.lbl_status.config(text="⚪ Đã dừng")

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
        log.info(f"RealSearch Client {get_version()} - Sẵn sàng")
        log.info(f"User: {self.user['username']} | Tier: {self.user.get('tier', 'bronze')}")

        if config.get("auto_start"):
            self.root.after(1000, self._start)

        self.root.mainloop()
