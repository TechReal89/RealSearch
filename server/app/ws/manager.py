"""WebSocket Connection Manager - manages 500+ concurrent clients."""
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ClientConnection:
    """Represents a single connected client."""

    def __init__(
        self,
        websocket: WebSocket,
        user_id: int,
        session_id: str,
        machine_id: str | None = None,
        os_info: str | None = None,
        browser_mode: str = "headed_hidden",
        enabled_job_types: list[str] | None = None,
        max_concurrent: int = 1,
        client_version: str | None = None,
    ):
        self.websocket = websocket
        self.user_id = user_id
        self.session_id = session_id
        self.machine_id = machine_id
        self.os_info = os_info
        self.browser_mode = browser_mode
        self.enabled_job_types = enabled_job_types or ["viewlink"]
        self.max_concurrent = max_concurrent
        self.client_version = client_version

        self.connected_at = datetime.now(timezone.utc)
        self.last_heartbeat = datetime.now(timezone.utc)
        self.active_tasks: set[int] = set()
        self.tasks_completed = 0
        self.tasks_failed = 0
        self.credits_earned = 0
        self.cpu_usage: float = 0
        self.memory_usage: float = 0

    @property
    def is_available(self) -> bool:
        return len(self.active_tasks) < self.max_concurrent

    @property
    def active_task_count(self) -> int:
        return len(self.active_tasks)

    async def send(self, message: dict):
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            logger.warning(f"Failed to send to session {self.session_id}: {e}")
            raise


class ConnectionManager:
    """Manages all WebSocket connections."""

    def __init__(self):
        # session_id -> ClientConnection
        self._connections: dict[str, ClientConnection] = {}
        # user_id -> set of session_ids
        self._user_sessions: dict[int, set[str]] = {}
        self._lock = asyncio.Lock()

    @property
    def online_count(self) -> int:
        return len(self._connections)

    async def connect(self, client: ClientConnection):
        async with self._lock:
            self._connections[client.session_id] = client
            if client.user_id not in self._user_sessions:
                self._user_sessions[client.user_id] = set()
            self._user_sessions[client.user_id].add(client.session_id)

        logger.info(
            f"Client connected: session={client.session_id} "
            f"user={client.user_id} (total={self.online_count})"
        )

    async def disconnect(self, session_id: str):
        async with self._lock:
            client = self._connections.pop(session_id, None)
            if client:
                user_sessions = self._user_sessions.get(client.user_id)
                if user_sessions:
                    user_sessions.discard(session_id)
                    if not user_sessions:
                        del self._user_sessions[client.user_id]

                logger.info(
                    f"Client disconnected: session={session_id} "
                    f"user={client.user_id} (total={self.online_count})"
                )
                return client
        return None

    def get_client(self, session_id: str) -> ClientConnection | None:
        return self._connections.get(session_id)

    def get_user_sessions(self, user_id: int) -> list[ClientConnection]:
        session_ids = self._user_sessions.get(user_id, set())
        return [self._connections[sid] for sid in session_ids if sid in self._connections]

    def get_available_clients(self, job_type: str | None = None) -> list[ClientConnection]:
        """Get clients that can accept new tasks."""
        available = []
        for client in self._connections.values():
            if not client.is_available:
                continue
            if job_type and job_type not in client.enabled_job_types:
                continue
            available.append(client)
        return available

    def get_all_clients(self) -> list[ClientConnection]:
        return list(self._connections.values())

    async def send_to_session(self, session_id: str, message: dict) -> bool:
        client = self._connections.get(session_id)
        if client:
            try:
                await client.send(message)
                return True
            except Exception:
                await self.disconnect(session_id)
        return False

    async def send_to_user(self, user_id: int, message: dict):
        sessions = self._user_sessions.get(user_id, set()).copy()
        for session_id in sessions:
            await self.send_to_session(session_id, message)

    async def broadcast(self, message: dict, exclude: str | None = None):
        disconnected = []
        for session_id, client in list(self._connections.items()):
            if session_id == exclude:
                continue
            try:
                await client.send(message)
            except Exception:
                disconnected.append(session_id)

        for session_id in disconnected:
            await self.disconnect(session_id)

    def update_heartbeat(self, session_id: str, cpu_usage: float = 0, memory_usage: float = 0):
        client = self._connections.get(session_id)
        if client:
            client.last_heartbeat = datetime.now(timezone.utc)
            client.cpu_usage = cpu_usage
            client.memory_usage = memory_usage

    def get_stats(self) -> dict:
        total = self.online_count
        available = len([c for c in self._connections.values() if c.is_available])
        busy = total - available
        active_tasks = sum(c.active_task_count for c in self._connections.values())

        return {
            "total_online": total,
            "available": available,
            "busy": busy,
            "active_tasks": active_tasks,
            "unique_users": len(self._user_sessions),
        }


# Singleton instance
manager = ConnectionManager()
