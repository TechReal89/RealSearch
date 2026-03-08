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
