"""Server performance monitoring - CPU, RAM, Disk, Network."""
import logging
import time
from datetime import datetime, timezone

import psutil
from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/server", tags=["admin-server-monitor"])

# Store historical data in memory (last 60 data points = ~5 minutes at 5s interval)
_history: list[dict] = []
_MAX_HISTORY = 360  # 30 minutes at 5s interval


def _collect_metrics() -> dict:
    """Collect current server metrics."""
    now = datetime.now(timezone.utc)

    # CPU
    cpu_percent = psutil.cpu_percent(interval=0)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    load_avg = psutil.getloadavg()

    # Memory
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    # Disk
    disk = psutil.disk_usage("/")
    try:
        disk_io = psutil.disk_io_counters()
        disk_read_bytes = disk_io.read_bytes if disk_io else 0
        disk_write_bytes = disk_io.write_bytes if disk_io else 0
    except Exception:
        disk_read_bytes = 0
        disk_write_bytes = 0

    # Network
    try:
        net_io = psutil.net_io_counters()
        net_sent = net_io.bytes_sent
        net_recv = net_io.bytes_recv
        net_connections = len(psutil.net_connections(kind="tcp"))
    except Exception:
        net_sent = 0
        net_recv = 0
        net_connections = 0

    # Process info
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
        uptime_seconds = int(time.time() - psutil.boot_time())
    except Exception:
        boot_time = now
        uptime_seconds = 0

    return {
        "timestamp": now.isoformat(),
        "cpu": {
            "percent": cpu_percent,
            "count": cpu_count,
            "freq_mhz": round(cpu_freq.current, 0) if cpu_freq else 0,
            "load_1m": round(load_avg[0], 2),
            "load_5m": round(load_avg[1], 2),
            "load_15m": round(load_avg[2], 2),
        },
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "percent": mem.percent,
            "swap_total_gb": round(swap.total / (1024**3), 2),
            "swap_used_gb": round(swap.used / (1024**3), 2),
            "swap_percent": swap.percent,
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent,
            "read_bytes": disk_read_bytes,
            "write_bytes": disk_write_bytes,
        },
        "network": {
            "bytes_sent": net_sent,
            "bytes_recv": net_recv,
            "connections": net_connections,
        },
        "system": {
            "uptime_seconds": uptime_seconds,
            "boot_time": boot_time.isoformat(),
        },
    }


@router.get("/metrics")
async def get_server_metrics(
    admin: User = Depends(get_admin_user),
):
    """Get current server performance metrics."""
    metrics = _collect_metrics()

    # Store in history
    _history.append(metrics)
    if len(_history) > _MAX_HISTORY:
        _history.pop(0)

    # Calculate network speed from last 2 data points
    net_speed = {"sent_per_sec": 0, "recv_per_sec": 0}
    if len(_history) >= 2:
        prev = _history[-2]
        curr = _history[-1]
        try:
            from datetime import datetime as dt
            t1 = dt.fromisoformat(prev["timestamp"])
            t2 = dt.fromisoformat(curr["timestamp"])
            elapsed = max((t2 - t1).total_seconds(), 1)
            net_speed["sent_per_sec"] = int(
                (curr["network"]["bytes_sent"] - prev["network"]["bytes_sent"]) / elapsed
            )
            net_speed["recv_per_sec"] = int(
                (curr["network"]["bytes_recv"] - prev["network"]["bytes_recv"]) / elapsed
            )
        except Exception:
            pass

    metrics["network"]["speed"] = net_speed

    # Alerts
    alerts = []
    if metrics["cpu"]["percent"] > 90:
        alerts.append({"level": "error", "message": f"CPU cao: {metrics['cpu']['percent']}%"})
    elif metrics["cpu"]["percent"] > 70:
        alerts.append({"level": "warning", "message": f"CPU khá cao: {metrics['cpu']['percent']}%"})

    if metrics["memory"]["percent"] > 90:
        alerts.append({"level": "error", "message": f"RAM cao: {metrics['memory']['percent']}%"})
    elif metrics["memory"]["percent"] > 80:
        alerts.append({"level": "warning", "message": f"RAM khá cao: {metrics['memory']['percent']}%"})

    if metrics["disk"]["percent"] > 90:
        alerts.append({"level": "error", "message": f"Ổ đĩa gần đầy: {metrics['disk']['percent']}%"})
    elif metrics["disk"]["percent"] > 80:
        alerts.append({"level": "warning", "message": f"Ổ đĩa khá đầy: {metrics['disk']['percent']}%"})

    metrics["alerts"] = alerts

    return metrics


@router.get("/metrics/history")
async def get_metrics_history(
    minutes: int = 5,
    admin: User = Depends(get_admin_user),
):
    """Get historical server metrics for charts (default: last 5 minutes)."""
    # Each data point is ~5 seconds apart
    points_needed = min(minutes * 12, _MAX_HISTORY)
    data = _history[-points_needed:] if _history else []

    return {
        "data": data,
        "count": len(data),
        "minutes": minutes,
    }


@router.get("/processes")
async def get_top_processes(
    admin: User = Depends(get_admin_user),
):
    """Get top processes by CPU and memory usage."""
    processes = []
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "status"]):
        try:
            info = proc.info
            if info["cpu_percent"] > 0 or info["memory_percent"] > 0.5:
                processes.append({
                    "pid": info["pid"],
                    "name": info["name"],
                    "cpu_percent": round(info["cpu_percent"], 1),
                    "memory_percent": round(info["memory_percent"], 1),
                    "status": info["status"],
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort by CPU then memory
    processes.sort(key=lambda p: (p["cpu_percent"], p["memory_percent"]), reverse=True)

    return {"processes": processes[:20]}


@router.get("/docker")
async def get_docker_status(
    admin: User = Depends(get_admin_user),
):
    """Get Docker container status if available."""
    import subprocess

    try:
        result = subprocess.run(
            ["docker", "stats", "--no-stream", "--format",
             "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.PIDs}}"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode != 0:
            return {"available": False, "error": "Docker not available"}

        containers = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("\t")
            if len(parts) >= 6:
                containers.append({
                    "name": parts[0],
                    "cpu": parts[1],
                    "mem_usage": parts[2],
                    "mem_percent": parts[3],
                    "net_io": parts[4],
                    "pids": parts[5],
                })

        return {"available": True, "containers": containers}
    except Exception as e:
        return {"available": False, "error": str(e)}
