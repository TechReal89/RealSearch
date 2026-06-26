"""
Client gọi DeerFlow Gateway API từ backend seo.techreal.vn.

LƯU Ý: đường dẫn endpoint Gateway ('/api/runs'...) là GIẢ ĐỊNH theo mô hình run-based.
Hãy đối chiếu với tài liệu Gateway DeerFlow thật (repo bytedance/deer-flow) và chỉnh
trong phần CONSTANTS bên dưới — chỉ sửa 1 chỗ này.
"""
from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any

import httpx

# ===== CONSTANTS — đối chiếu API Gateway thật rồi chỉnh ở đây =====
DEERFLOW_BASE_URL = os.getenv("DEERFLOW_BASE_URL", "http://10.10.0.2:8443")
DEERFLOW_TOKEN = os.getenv("DEERFLOW_TOKEN", "")
CREATE_RUN_PATH = "/api/runs"            # POST tạo run
GET_RUN_PATH = "/api/runs/{run_id}"      # GET trạng thái + kết quả
POLL_INTERVAL_S = 5
RUN_TIMEOUT_S = 3600                      # task SEO có thể chạy lâu


@dataclass
class RunResult:
    run_id: str
    status: str            # "completed" | "failed" | "running" | ...
    output: Any = None     # JSON do skill trả về
    error: str | None = None


class DeerFlowError(RuntimeError):
    pass


class DeerFlowClient:
    def __init__(self, base_url: str = DEERFLOW_BASE_URL, token: str = DEERFLOW_TOKEN):
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"} if token else {}

    async def create_run(self, skill: str, payload: dict, mode: str = "standard") -> str:
        """Tạo 1 run trên DeerFlow, trả run_id. `skill` = tên skill đã nạp (vd 'seo-article')."""
        body = {"skill": skill, "input": payload, "mode": mode}
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(self._base_url + CREATE_RUN_PATH, json=body, headers=self._headers)
            if r.status_code >= 400:
                raise DeerFlowError(f"create_run {r.status_code}: {r.text}")
            data = r.json()
        run_id = data.get("run_id") or data.get("id")
        if not run_id:
            raise DeerFlowError(f"Không tìm thấy run_id trong response: {data}")
        return run_id

    async def get_run(self, run_id: str) -> RunResult:
        url = self._base_url + GET_RUN_PATH.format(run_id=run_id)
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, headers=self._headers)
            if r.status_code >= 400:
                raise DeerFlowError(f"get_run {r.status_code}: {r.text}")
            data = r.json()
        return RunResult(
            run_id=run_id,
            status=data.get("status", "unknown"),
            output=data.get("output") or data.get("result"),
            error=data.get("error"),
        )

    async def run_and_wait(self, skill: str, payload: dict, mode: str = "standard") -> RunResult:
        """Tạo run rồi poll tới khi xong (hoặc timeout). Dùng trong worker async."""
        run_id = await self.create_run(skill, payload, mode)
        waited = 0
        while waited < RUN_TIMEOUT_S:
            res = await self.get_run(run_id)
            if res.status in ("completed", "succeeded"):
                return res
            if res.status in ("failed", "error", "cancelled"):
                raise DeerFlowError(f"Run {run_id} thất bại: {res.error}")
            await asyncio.sleep(POLL_INTERVAL_S)
            waited += POLL_INTERVAL_S
        raise DeerFlowError(f"Run {run_id} timeout sau {RUN_TIMEOUT_S}s")
