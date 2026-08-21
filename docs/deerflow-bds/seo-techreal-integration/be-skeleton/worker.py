"""
Worker async xử lý job SEO bằng DeerFlow.

Skeleton dùng asyncio.Queue + dict trong RAM cho dễ chạy thử. PRODUCTION:
- Thay JOBS dict bằng bảng trong PostgreSQL.
- Thay hàng đợi trong RAM bằng Redis + arq/Celery (chịu được restart, nhiều worker).
"""
from __future__ import annotations

import asyncio
import uuid
from enum import Enum
from typing import Any

from deerflow_client import DeerFlowClient, DeerFlowError

# Map "loại job" -> tên skill đã nạp trong DeerFlow
SKILL_BY_KIND = {
    "content_listing": "listing-description",
    "content_article": "seo-article",
    "research_keyword": "keyword-competitor-research",
    "report": "seo-report",
}


class JobStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


# ===== Lưu trữ tạm (thay bằng DB ở production) =====
JOBS: dict[str, dict[str, Any]] = {}
_queue: "asyncio.Queue[str]" = asyncio.Queue()
_client = DeerFlowClient()


def enqueue_job(kind: str, payload: dict) -> str:
    if kind not in SKILL_BY_KIND:
        raise ValueError(f"kind không hợp lệ: {kind}")
    job_id = uuid.uuid4().hex
    JOBS[job_id] = {"id": job_id, "kind": kind, "status": JobStatus.pending,
                    "payload": payload, "result": None, "error": None}
    _queue.put_nowait(job_id)
    return job_id


def get_job(job_id: str) -> dict | None:
    return JOBS.get(job_id)


async def _process(job_id: str) -> None:
    job = JOBS[job_id]
    job["status"] = JobStatus.running
    skill = SKILL_BY_KIND[job["kind"]]
    try:
        res = await _client.run_and_wait(skill, job["payload"])
        job["result"] = res.output
        job["status"] = JobStatus.completed
        # TODO: ghi res.output vào DB; nếu là keyword/report -> map sang RealSearch POST /jobs
    except (DeerFlowError, Exception) as e:  # noqa: BLE001
        job["status"] = JobStatus.failed
        job["error"] = str(e)


async def worker_loop() -> None:
    """Vòng lặp worker — gọi từ startup của FastAPI (asyncio.create_task)."""
    while True:
        job_id = await _queue.get()
        try:
            await _process(job_id)
        finally:
            _queue.task_done()
