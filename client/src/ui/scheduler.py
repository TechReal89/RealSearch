"""Schedule Manager - Hẹn giờ tự động chạy."""
import threading
from datetime import datetime, time as dt_time

from src.config import config
from src.utils.logger import log


class ScheduleManager:
    """Quản lý hẹn giờ tự động start/stop."""

    def __init__(self, on_start=None, on_stop=None):
        self.on_start = on_start
        self.on_stop = on_stop
        self._timer: threading.Timer | None = None
        self._running = False
        self._started_by_schedule = False

    @property
    def enabled(self) -> bool:
        return config.get("schedule_enabled", False)

    @property
    def schedule_time(self) -> str:
        return config.get("schedule_time", "22:00")

    @property
    def schedule_stop_time(self) -> str | None:
        return config.get("schedule_stop_time", None)

    @property
    def schedule_days(self) -> list[int]:
        """Ngày trong tuần (0=Mon..6=Sun). Mặc định tất cả."""
        return config.get("schedule_days", [0, 1, 2, 3, 4, 5, 6])

    def start_monitoring(self):
        """Bắt đầu theo dõi lịch hẹn."""
        if self._running:
            return
        self._running = True
        self._check_schedule()
        log.info(f"Hẹn giờ: {'BẬT' if self.enabled else 'TẮT'} - {self.schedule_time}")

    def stop_monitoring(self):
        """Dừng theo dõi."""
        self._running = False
        if self._timer:
            self._timer.cancel()
            self._timer = None

    def _check_schedule(self):
        """Kiểm tra xem đã đến giờ hẹn chưa (mỗi 30s)."""
        if not self._running:
            return

        if self.enabled:
            now = datetime.now()
            weekday = now.weekday()  # 0=Mon..6=Sun

            if weekday in self.schedule_days:
                # Kiểm tra giờ bắt đầu
                start_h, start_m = map(int, self.schedule_time.split(":"))
                if now.hour == start_h and now.minute == start_m and not self._started_by_schedule:
                    log.info(f"⏰ Đến giờ hẹn {self.schedule_time} - Tự động bắt đầu!")
                    self._started_by_schedule = True
                    if self.on_start:
                        self.on_start()

                # Kiểm tra giờ dừng (nếu có)
                if self.schedule_stop_time and self._started_by_schedule:
                    stop_h, stop_m = map(int, self.schedule_stop_time.split(":"))
                    if now.hour == stop_h and now.minute == stop_m:
                        log.info(f"⏰ Đến giờ dừng {self.schedule_stop_time} - Tự động dừng!")
                        self._started_by_schedule = False
                        if self.on_stop:
                            self.on_stop()

                # Reset flag khi qua phút tiếp theo
                if self._started_by_schedule:
                    if now.hour != start_h or now.minute != start_m:
                        pass  # Giữ flag cho đến khi stop hoặc ngày mới

            # Reset flag khi sang ngày mới (0:00)
            if now.hour == 0 and now.minute == 0:
                self._started_by_schedule = False

        # Lặp lại sau 30 giây
        self._timer = threading.Timer(30.0, self._check_schedule)
        self._timer.daemon = True
        self._timer.start()

    def update_config(self, enabled: bool, schedule_time: str,
                      stop_time: str | None = None,
                      days: list[int] | None = None):
        """Cập nhật cấu hình hẹn giờ."""
        config.set("schedule_enabled", enabled)
        config.set("schedule_time", schedule_time)
        config.set("schedule_stop_time", stop_time)
        if days is not None:
            config.set("schedule_days", days)
        self._started_by_schedule = False
        log.info(
            f"Cập nhật hẹn giờ: {'BẬT' if enabled else 'TẮT'} "
            f"- Bắt đầu: {schedule_time}"
            f"{f' - Dừng: {stop_time}' if stop_time else ''}"
        )
