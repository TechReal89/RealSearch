"""
FastAPI BE mẫu cho seo.techreal.vn — nhận yêu cầu, đẩy job sang DeerFlow (async).

Chạy thử:
    pip install -r requirements.txt
    cp .env.example .env   # điền DEERFLOW_BASE_URL / DEERFLOW_TOKEN
    uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(worker.worker_loop())   # khởi động worker nền
    yield
    task.cancel()


app = FastAPI(title="seo.techreal.vn × DeerFlow", lifespan=lifespan)


# ===== Schemas =====
class ContentRequest(BaseModel):
    kind: str = Field("content_article", description="content_article | content_listing")
    target_url: str | None = None
    primary_keyword: str
    brief: dict = Field(default_factory=dict, description="thông số/ngữ cảnh cho skill")


class ResearchRequest(BaseModel):
    area: str = Field(..., description="khu vực/lĩnh vực, vd 'BĐS khu Đông TPHCM'")
    competitors: list[str] = Field(default_factory=list)


class ReportRequest(BaseModel):
    website: str
    period: str = Field(..., description="vd '2026-W26'")
    data: dict = Field(default_factory=dict, description="rank/traffic/index thô")


class JobCreated(BaseModel):
    job_id: str
    status: str


# ===== Endpoints =====
@app.post("/seo/content", response_model=JobCreated)
async def create_content(req: ContentRequest):
    if req.kind not in ("content_article", "content_listing"):
        raise HTTPException(400, "kind phải là content_article hoặc content_listing")
    payload = {"primary_keyword": req.primary_keyword, "target_url": req.target_url, **req.brief}
    job_id = worker.enqueue_job(req.kind, payload)
    return JobCreated(job_id=job_id, status="pending")


@app.post("/seo/research", response_model=JobCreated)
async def create_research(req: ResearchRequest):
    job_id = worker.enqueue_job("research_keyword", req.model_dump())
    return JobCreated(job_id=job_id, status="pending")


@app.post("/seo/report", response_model=JobCreated)
async def create_report(req: ReportRequest):
    job_id = worker.enqueue_job("report", req.model_dump())
    return JobCreated(job_id=job_id, status="pending")


@app.get("/seo/jobs/{job_id}")
async def get_job(job_id: str):
    job = worker.get_job(job_id)
    if not job:
        raise HTTPException(404, "job không tồn tại")
    return {"id": job["id"], "kind": job["kind"], "status": job["status"],
            "result": job["result"], "error": job["error"]}


@app.get("/health")
async def health():
    return {"ok": True}
