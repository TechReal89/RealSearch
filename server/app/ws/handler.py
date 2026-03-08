"""WebSocket message handler - routes incoming messages from clients."""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.database import async_session
from app.models.session import ClientSession
from app.models.user import User
from app.ws.job_dispatcher import dispatcher
from app.ws.manager import ClientConnection, manager

logger = logging.getLogger(__name__)


async def _authenticate(data: dict, websocket: WebSocket) -> tuple[User, dict] | None:
    """Authenticate client from auth message or query param."""
    token = data.get("token")
    if not token:
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    async with async_session() as db:
        user = await db.get(User, int(user_id))
        if not user or not user.is_active:
            return None
        # Detach from session
        user_data = {
            "id": user.id,
            "username": user.username,
            "tier": user.tier.value,
            "credit_balance": user.credit_balance,
        }

    return user, user_data


async def _create_session(client: ClientConnection, ip_address: str | None):
    """Persist client session to database."""
    async with async_session() as db:
        session = ClientSession(
            id=client.session_id,
            user_id=client.user_id,
            machine_id=client.machine_id,
            os_info=client.os_info,
            ip_address=ip_address,
            is_online=True,
            client_version=client.client_version,
            browser_mode=client.browser_mode,
            enabled_job_types=client.enabled_job_types,
            max_concurrent=client.max_concurrent,
        )
        db.add(session)
        await db.commit()


async def _update_session_offline(session_id: str):
    """Mark session as offline in database."""
    async with async_session() as db:
        session = await db.get(ClientSession, session_id)
        if session:
            client = manager.get_client(session_id)
            session.is_online = False
            session.disconnected_at = datetime.now(timezone.utc)
            if client:
                session.tasks_completed = client.tasks_completed
                session.tasks_failed = client.tasks_failed
                session.credits_earned = client.credits_earned
            await db.commit()


async def _update_heartbeat_db(session_id: str):
    """Update heartbeat timestamp in database."""
    async with async_session() as db:
        session = await db.get(ClientSession, session_id)
        if session:
            session.last_heartbeat = datetime.now(timezone.utc)
            await db.commit()


async def handle_websocket(websocket: WebSocket):
    """Main WebSocket handler for client connections."""
    await websocket.accept()

    client: ClientConnection | None = None
    authenticated = False

    try:
        # Wait for auth message (timeout 30s)
        auth_msg = await websocket.receive_json()

        if auth_msg.get("type") != "auth":
            await websocket.send_json({
                "type": "error",
                "data": {"code": "AUTH_REQUIRED", "message": "First message must be auth"},
            })
            await websocket.close(1008)
            return

        auth_data = auth_msg.get("data", {})
        result = await _authenticate(auth_data, websocket)

        if not result:
            await websocket.send_json({
                "type": "auth_result",
                "data": {"success": False, "error": "Invalid token"},
            })
            await websocket.close(1008)
            return

        user, user_data = result
        session_id = str(uuid.uuid4())

        # Check max clients per user
        existing_sessions = manager.get_user_sessions(user_data["id"])
        max_clients = 3  # TODO: get from tier config
        if len(existing_sessions) >= max_clients:
            await websocket.send_json({
                "type": "auth_result",
                "data": {
                    "success": False,
                    "error": f"Max {max_clients} clients per user",
                },
            })
            await websocket.close(1008)
            return

        # Create client connection
        client = ClientConnection(
            websocket=websocket,
            user_id=user_data["id"],
            session_id=session_id,
            machine_id=auth_data.get("machine_id"),
            os_info=auth_data.get("os_info"),
            browser_mode=auth_data.get("browser_mode", "headed_hidden"),
            enabled_job_types=auth_data.get("enabled_job_types", ["viewlink"]),
            max_concurrent=auth_data.get("max_concurrent", 1),
            client_version=auth_data.get("client_version"),
        )

        await manager.connect(client)
        authenticated = True

        # Persist session to DB
        ip = websocket.client.host if websocket.client else None
        await _create_session(client, ip)

        # Send auth success
        await websocket.send_json({
            "type": "auth_result",
            "data": {
                "success": True,
                "session_id": session_id,
                "user": user_data,
                "server_config": {
                    "heartbeat_interval": 30,
                    "task_timeout": 300,
                    "max_concurrent": client.max_concurrent,
                },
            },
        })

        logger.info(f"Client authenticated: user={user_data['username']} session={session_id}")

        # Main message loop
        while True:
            message = await websocket.receive_json()
            msg_type = message.get("type")
            msg_data = message.get("data", {})

            if msg_type == "heartbeat":
                manager.update_heartbeat(
                    session_id,
                    msg_data.get("cpu_usage", 0),
                    msg_data.get("memory_usage", 0),
                )
                await _update_heartbeat_db(session_id)

            elif msg_type == "task_accepted":
                task_id = msg_data.get("task_id")
                if task_id:
                    logger.info(f"Task #{task_id} accepted by {session_id}")

            elif msg_type == "task_completed":
                task_id = msg_data.get("task_id")
                result = msg_data.get("result", {})
                if task_id:
                    await dispatcher.handle_task_completed(session_id, task_id, result)

            elif msg_type == "task_failed":
                task_id = msg_data.get("task_id")
                if task_id:
                    await dispatcher.handle_task_failed(
                        session_id,
                        task_id,
                        msg_data.get("error_code", "UNKNOWN"),
                        msg_data.get("error_message", ""),
                    )

            elif msg_type == "task_rejected":
                task_id = msg_data.get("task_id")
                if task_id:
                    await dispatcher.handle_task_rejected(
                        session_id,
                        task_id,
                        msg_data.get("reason", "unknown"),
                    )

            elif msg_type == "task_progress":
                # Log progress, could update DB if needed
                pass

            else:
                logger.warning(f"Unknown message type from {session_id}: {msg_type}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client.session_id if client else 'unknown'}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if client and authenticated:
            await _update_session_offline(client.session_id)
            await manager.disconnect(client.session_id)
