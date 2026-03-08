"""Abstract base class for job executors."""
from abc import ABC, abstractmethod


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
