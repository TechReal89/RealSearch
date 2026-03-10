"""Hardware/OS fingerprint."""
import hashlib
import platform
import uuid


def get_machine_id() -> str:
    """Tạo machine ID từ hardware info."""
    raw = f"{platform.node()}-{uuid.getnode()}-{platform.machine()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def get_os_info() -> str:
    return f"{platform.system()} {platform.release()} ({platform.machine()})"


def get_resource_usage() -> dict:
    """Lấy CPU và RAM usage hiện tại."""
    try:
        import psutil
        return {
            "cpu_usage": round(psutil.cpu_percent(interval=0.1), 1),
            "memory_usage": round(psutil.virtual_memory().percent, 1),
        }
    except ImportError:
        return {"cpu_usage": 0, "memory_usage": 0}
