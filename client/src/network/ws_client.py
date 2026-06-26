"""WebSocket persistent connection to server."""
import asyncio
import json
import time

import websockets

from src.config import config, get_version
from src.network.api_client import api
from src.utils.logger import log
from src.utils.system_info import get_machine_id, get_os_info, get_resource_usage

# Callbacks
_on_task_assign = None
_on_credit_update = None
_on_broadcast = None
_on_status_change = None
_on_status_update = None


def set_callbacks(
    on_task_assign=None,
    on_credit_update=None,
    on_broadcast=None,
    on_status_change=None,
    on_status_update=None,
):
    global _on_task_assign, _on_credit_update, _on_broadcast, _on_status_change, _on_status_update
    _on_task_assign = on_task_assign
    _on_credit_update = on_credit_update
    _on_broadcast = on_broadcast
    _on_status_change = on_status_change
    _on_status_update = on_status_update


class WSClient:
    def __init__(self):
        self._ws = None
        self._session_id: str | None = None
        self._server_config: dict = {}
        self._running = False
        self._connected = False
        self._heartbeat_task: asyncio.Task | None = None
        self._reconnect_delay = 5
        self._max_concurrent: int = config.max_concurrent
        self._active_tasks_count: int = 0

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def session_id(self) -> str | None:
        return self._session_id

    @property
    def max_concurrent(self) -> int:
        return self._max_concurrent

    async def connect(self):
        """Kết nối và xác thực WebSocket."""
        if not api.is_logged_in:
            raise Exception("Chưa đăng nhập")

        self._running = True

        while self._running:
            try:
                await self._do_connect()
            except Exception as e:
                if self._running:
                    log.warning(f"WebSocket lỗi: {e}")

            if not self._running:
                break

            self._connected = False
            if _on_status_change:
                _on_status_change("disconnected")

            log.info(f"Kết nối lại sau {int(self._reconnect_delay)}s...")
            await asyncio.sleep(self._reconnect_delay)
            self._reconnect_delay = min(self._reconnect_delay * 1.5, 60)

    async def _do_connect(self):
        # Refresh token trước khi kết nối
        if api._refresh_token:
            try:
                await api._do_refresh()
            except Exception as e:
                log.warning(f"Token refresh thất bại: {e}")

        log.info(f"Đang kết nối {config.ws_url}...")

        async with websockets.connect(
            config.ws_url,
            ping_interval=20,
            ping_timeout=30,  # Increased from 10 to avoid false disconnects
            max_size=1024 * 1024,
        ) as ws:
            self._ws = ws

            # Gửi auth message
            auth_msg = {
                "type": "auth",
                "data": {
                    "token": api._access_token,
                    "machine_id": get_machine_id(),
                    "os_info": get_os_info(),
                    "browser_mode": config.browser_mode,
                    "enabled_job_types": config.enabled_job_types,
                    "max_concurrent": config.max_concurrent,
                    "client_version": get_version(),
                },
            }
            await ws.send(json.dumps(auth_msg))

            # Đọc auth result
            resp = json.loads(await ws.recv())
            if resp.get("type") != "auth_result" or not resp["data"].get("success"):
                error = resp.get("data", {}).get("error", "Unknown")
                raise Exception(f"Xác thực thất bại: {error}")

            self._session_id = resp["data"]["session_id"]
            self._server_config = resp["data"].get("server_config", {})
            self._connected = True
            self._reconnect_delay = 5

            # Apply server-controlled max_concurrent (tier-based)
            server_max = self._server_config.get("max_concurrent")
            if server_max and server_max > 0:
                self._max_concurrent = server_max
                log.info(f"Server max_concurrent: {server_max}")
            else:
                self._max_concurrent = config.max_concurrent

            log.info(f"Đã kết nối! Session: {self._session_id[:8]}...")

            if _on_status_change:
                _on_status_change("connected")

            # Start heartbeat
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

            # Message loop
            try:
                async for raw in ws:
                    msg = json.loads(raw)
                    await self._handle_message(msg)
            finally:
                if self._heartbeat_task:
                    self._heartbeat_task.cancel()

    async def _handle_message(self, msg: dict):
        msg_type = msg.get("type")
        data = msg.get("data", {})

        if msg_type == "task_assign":
            log.info(f"Nhận task #{data.get('task_id')} - {data.get('job_type')}")
            if _on_task_assign:
                await _on_task_assign(data)

        elif msg_type == "credit_update":
            log.info(f"Credit +{data.get('earned', 0)} → {data.get('balance', 0):,}")
            if _on_credit_update:
                _on_credit_update(data)

        elif msg_type == "broadcast":
            log.info(f"[Broadcast] {data.get('message', '')}")
            if _on_broadcast:
                _on_broadcast(data)

        elif msg_type == "status_update":
            # Server notifies about job availability
            if _on_status_update:
                _on_status_update(data)

        elif msg_type == "error":
            log.error(f"Server error: {data.get('message', '')}")

    async def _heartbeat_loop(self):
        interval = self._server_config.get("heartbeat_interval", 30)
        while self._connected and self._ws:
            try:
                await asyncio.sleep(interval)
                usage = get_resource_usage()
                await self.send("heartbeat", {
                    "cpu_usage": usage["cpu_usage"],
                    "memory_usage": usage["memory_usage"],
                    "active_tasks": self._active_tasks_count,
                    "timestamp": time.time(),
                })
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.warning(f"Heartbeat lỗi: {e}")
                break

    async def send(self, msg_type: str, data: dict):
        if self._ws and self._connected:
            try:
                await self._ws.send(json.dumps({"type": msg_type, "data": data}))
            except Exception as e:
                log.warning(f"Send lỗi: {e}")
                raise

    async def send_task_completed(self, task_id: int, result: dict):
        await self.send("task_completed", {"task_id": task_id, "result": result})

    async def send_task_failed(self, task_id: int, error_code: str, error_msg: str):
        await self.send("task_failed", {
            "task_id": task_id,
            "error_code": error_code,
            "error_message": error_msg,
        })

    async def send_task_accepted(self, task_id: int):
        await self.send("task_accepted", {"task_id": task_id})

    async def disconnect(self):
        self._running = False
        self._connected = False
        if self._ws:
            await self._ws.close()
            self._ws = None
        if self._heartbeat_task:
            self._heartbeat_task.cancel()

        if _on_status_change:
            _on_status_change("disconnected")

        log.info("Đã ngắt kết nối WebSocket")


ws_client = WSClient()
