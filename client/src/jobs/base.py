"""Abstract base class for job executors."""
from abc import ABC, abstractmethod

from src.config import config


class BaseJobExecutor(ABC):
    """Base executor cho tất cả job types."""

    job_type: str = ""

    @abstractmethod
    async def execute(self, task_data: dict) -> dict:
        """
        Thực thi task.

        Args:
            task_data: {
                "task_id": int,
                "job_type": str,
                "config": {
                    "target_url": str,
                    ...
                },
                "priority": float,
                "timeout": int,
            }

        Returns:
            result_data: {
                "actual_url_visited": str,
                "pages_visited": int,
                "time_on_each_page": list[int],
                "scroll_depth": float,
                ...
            }
        """
        pass

    def _get_proxy(self) -> dict | None:
        """Lấy proxy cho task hiện tại.

        Ưu tiên:
        1. Proxy pool rotation (nếu bật use_proxy_pool)
        2. Single proxy từ config (legacy)
        3. None (không dùng proxy)
        """
        if config.get("use_proxy_pool"):
            from src.browser.proxy_manager import proxy_manager
            proxy = proxy_manager.get_next()
            if proxy:
                return proxy.to_config()
        return config.get("proxy")
