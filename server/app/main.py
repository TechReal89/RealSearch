import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.v1.router import api_router
from app.database import engine
from app.ws.handler import handle_websocket
from app.ws.job_dispatcher import dispatcher
from app.ws.manager import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connected")

    # Start job dispatcher background task
    dispatch_task = asyncio.create_task(dispatcher.start_dispatch_loop())
    logger.info("Job dispatcher started")

    yield

    # Shutdown
    dispatcher.stop()
    dispatch_task.cancel()
    try:
        await dispatch_task
    except asyncio.CancelledError:
        pass
    await engine.dispose()
    logger.info("Server shutdown complete")


app = FastAPI(
    title="RealSearch API",
    version="0.1.0",
    description="Traffic Exchange & SEO Automation API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket(websocket)


@app.get("/health")
async def health_check():
    ws_stats = manager.get_stats()
    return {
        "status": "ok",
        "websocket": ws_stats,
    }
