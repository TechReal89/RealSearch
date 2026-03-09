"""Security monitoring - proxies to host security agent."""
import logging

import httpx
from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/security", tags=["admin-security"])

# Security agent runs on host, accessible via Docker host gateway
AGENT_URL = "http://host.docker.internal:9999"
AGENT_KEY = "rs_security_agent_2024_internal"


async def _agent_get(path: str) -> dict:
    """GET request to security agent on host."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{AGENT_URL}{path}",
                headers={"X-Api-Key": AGENT_KEY},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"Security agent request failed: {e}")
        # Return empty but valid structure
        return {
            "timestamp": "",
            "ssh": {"failed_attempts": 0, "top_attacking_ips": []},
            "firewall": {"active": False, "rules": [], "raw": f"Agent unreachable: {e}"},
            "fail2ban": {"active": False, "jails": [], "total_banned": 0, "banned_ips": []},
            "open_ports": [],
            "connections": {"total": 0, "by_port": {}},
            "nginx": {"error_count": 0, "status_4xx": 0, "status_5xx": 0, "recent_errors": []},
            "recent_events": [],
        }


async def _agent_post(path: str, data: dict) -> dict:
    """POST request to security agent on host."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{AGENT_URL}{path}",
                json=data,
                headers={"X-Api-Key": AGENT_KEY},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        logger.error(f"Security agent POST failed: {e}")
        return {"success": False, "error": str(e)}


@router.get("/overview")
async def get_security_overview(admin: User = Depends(get_admin_user)):
    """Get comprehensive security overview from host agent."""
    return await _agent_get("/overview")


@router.post("/ban-ip")
async def ban_ip(data: dict, admin: User = Depends(get_admin_user)):
    """Ban an IP address via host agent."""
    result = await _agent_post("/ban-ip", data)
    if result.get("success"):
        logger.info(f"Admin {admin.username} banned IP: {data.get('ip')}")
    return result


@router.post("/unban-ip")
async def unban_ip(data: dict, admin: User = Depends(get_admin_user)):
    """Unban an IP address via host agent."""
    result = await _agent_post("/unban-ip", data)
    logger.info(f"Admin {admin.username} unbanned IP: {data.get('ip')}")
    return result
