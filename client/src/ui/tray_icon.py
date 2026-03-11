"""System Tray Icon - Thu nhỏ xuống khay hệ thống."""
import sys
import threading

from src.utils.logger import log

# pystray chỉ hoạt động trên Windows
_HAS_TRAY = False
try:
    import pystray
    from PIL import Image
    _HAS_TRAY = True
except ImportError:
    pass


class TrayIcon:
    """Quản lý system tray icon cho ứng dụng."""

    def __init__(self, root, icon_path: str | None = None, on_quit=None):
        self.root = root
        self.icon_path = icon_path
        self.on_quit = on_quit
        self._tray: "pystray.Icon | None" = None
        self._tray_thread: threading.Thread | None = None
        self._visible = True  # cửa sổ đang hiển thị

    @property
    def available(self) -> bool:
        return _HAS_TRAY and sys.platform == "win32"

    def setup(self):
        """Khởi tạo tray icon (gọi sau khi tạo root window)."""
        if not self.available:
            return

        image = self._load_icon()
        menu = pystray.Menu(
            pystray.MenuItem("Mở RealSearch", self._show_window, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                lambda item: "Đang chạy" if self._get_status() else "Đã dừng",
                None,
                enabled=False,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Thoát", self._quit),
        )

        self._tray = pystray.Icon("RealSearch", image, "RealSearch", menu)
        self._tray_thread = threading.Thread(target=self._tray.run, daemon=True)
        self._tray_thread.start()
        log.info("System tray đã sẵn sàng")

    def _load_icon(self) -> "Image.Image":
        """Load icon từ file hoặc tạo icon mặc định."""
        try:
            if self.icon_path:
                return Image.open(self.icon_path)
        except Exception:
            pass
        # Tạo icon mặc định (hình vuông gold)
        img = Image.new("RGB", (64, 64), color=(212, 168, 75))
        return img

    def _get_status(self) -> bool:
        """Lấy trạng thái running từ MainWindow."""
        try:
            return getattr(self.root, "_main_window_running", False)
        except Exception:
            return False

    def hide_to_tray(self):
        """Ẩn cửa sổ, thu nhỏ xuống tray."""
        if not self.available or not self._tray:
            return False
        self.root.withdraw()
        self._visible = False
        self._tray.notify("RealSearch đang chạy ẩn", "RealSearch")
        log.info("Thu nhỏ xuống khay hệ thống")
        return True

    def _show_window(self, icon=None, item=None):
        """Hiện lại cửa sổ từ tray."""
        self.root.after(0, self._do_show)

    def _do_show(self):
        """Thread-safe show window."""
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self._visible = True
        log.info("Mở lại cửa sổ từ khay hệ thống")

    def _quit(self, icon=None, item=None):
        """Thoát hoàn toàn ứng dụng."""
        log.info("Thoát ứng dụng từ tray")
        if self._tray:
            self._tray.stop()
        if self.on_quit:
            self.root.after(0, self.on_quit)
        else:
            self.root.after(0, self.root.destroy)

    def destroy(self):
        """Dọn dẹp tray icon."""
        if self._tray:
            try:
                self._tray.stop()
            except Exception:
                pass
            self._tray = None

    @property
    def is_visible(self) -> bool:
        return self._visible
