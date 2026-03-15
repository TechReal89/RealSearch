"""Proxy Manager - quản lý proxy pool, xoay vòng, kiểm tra health."""
import asyncio
import json
import random
import time
from pathlib import Path

from src.config import APP_DIR
from src.utils.logger import log

PROXY_FILE = APP_DIR / "proxies.json"


class ProxyInfo:
    """Thông tin một proxy."""

    __slots__ = (
        "host", "port", "username", "password", "protocol",
        "label", "enabled", "success", "fail", "last_used", "last_check",
        "avg_ms",
    )

    def __init__(
        self,
        host: str,
        port: int,
        username: str = "",
        password: str = "",
        protocol: str = "http",
        label: str = "",
        enabled: bool = True,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.protocol = protocol
        self.label = label or f"{host}:{port}"
        self.enabled = enabled
        self.success = 0
        self.fail = 0
        self.last_used: float = 0
        self.last_check: float = 0
        self.avg_ms: int = 0

    @property
    def success_rate(self) -> float:
        total = self.success + self.fail
        return (self.success / total * 100) if total > 0 else 100.0

    def to_playwright(self) -> dict:
        """Chuyển thành dict proxy cho Playwright browser context."""
        server = f"{self.protocol}://{self.host}:{self.port}"
        result = {"server": server}
        if self.username:
            result["username"] = self.username
            result["password"] = self.password or ""
        return result

    def to_config(self) -> dict:
        """Chuyển thành dict cho create_context(proxy=...)."""
        return {
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "password": self.password,
            "protocol": self.protocol,
        }

    def to_dict(self) -> dict:
        """Serialize để lưu file."""
        return {
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "password": self.password,
            "protocol": self.protocol,
            "label": self.label,
            "enabled": self.enabled,
            "success": self.success,
            "fail": self.fail,
            "avg_ms": self.avg_ms,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ProxyInfo":
        p = cls(
            host=d["host"],
            port=d["port"],
            username=d.get("username", ""),
            password=d.get("password", ""),
            protocol=d.get("protocol", "http"),
            label=d.get("label", ""),
            enabled=d.get("enabled", True),
        )
        p.success = d.get("success", 0)
        p.fail = d.get("fail", 0)
        p.avg_ms = d.get("avg_ms", 0)
        return p

    @classmethod
    def parse(cls, proxy_string: str) -> "ProxyInfo":
        """Parse proxy string format: protocol://user:pass@host:port hoặc host:port:user:pass."""
        s = proxy_string.strip()
        protocol = "http"
        username = ""
        password = ""

        # Format: protocol://user:pass@host:port
        if "://" in s:
            protocol, rest = s.split("://", 1)
            if "@" in rest:
                auth, hostport = rest.rsplit("@", 1)
                if ":" in auth:
                    username, password = auth.split(":", 1)
            else:
                hostport = rest
            host, port_str = hostport.rsplit(":", 1)
            return cls(host, int(port_str), username, password, protocol)

        # Format: host:port:user:pass
        parts = s.split(":")
        if len(parts) == 2:
            return cls(parts[0], int(parts[1]))
        elif len(parts) == 4:
            return cls(parts[0], int(parts[1]), parts[2], parts[3])
        elif len(parts) == 5:
            # protocol:host:port:user:pass
            return cls(parts[1], int(parts[2]), parts[3], parts[4], parts[0])

        raise ValueError(f"Không thể parse proxy: {s}")

    def __str__(self):
        auth = f"{self.username}:***@" if self.username else ""
        return f"{self.protocol}://{auth}{self.host}:{self.port}"


class ProxyManager:
    """Quản lý proxy pool - thêm/xóa/xoay vòng/kiểm tra."""

    def __init__(self):
        self._proxies: list[ProxyInfo] = []
        self._lock = asyncio.Lock() if asyncio.get_event_loop().is_running() else None
        self.load()

    def load(self):
        """Load proxy list từ file."""
        if PROXY_FILE.exists():
            try:
                data = json.loads(PROXY_FILE.read_text(encoding="utf-8"))
                self._proxies = [ProxyInfo.from_dict(d) for d in data]
                log.info(f"Loaded {len(self._proxies)} proxy từ {PROXY_FILE.name}")
            except Exception as e:
                log.error(f"Lỗi load proxy file: {e}")
                self._proxies = []
        else:
            self._proxies = []

    def save(self):
        """Lưu proxy list ra file."""
        data = [p.to_dict() for p in self._proxies]
        PROXY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    @property
    def count(self) -> int:
        return len(self._proxies)

    @property
    def active_count(self) -> int:
        return sum(1 for p in self._proxies if p.enabled)

    @property
    def proxies(self) -> list[ProxyInfo]:
        return list(self._proxies)

    def add(self, proxy: ProxyInfo) -> bool:
        """Thêm proxy vào pool. Trả về False nếu đã tồn tại."""
        for existing in self._proxies:
            if existing.host == proxy.host and existing.port == proxy.port:
                return False
        self._proxies.append(proxy)
        self.save()
        log.info(f"Thêm proxy: {proxy}")
        return True

    def add_bulk(self, proxy_strings: list[str]) -> int:
        """Thêm nhiều proxy từ danh sách string. Trả về số lượng thêm thành công."""
        added = 0
        for s in proxy_strings:
            s = s.strip()
            if not s or s.startswith("#"):
                continue
            try:
                proxy = ProxyInfo.parse(s)
                if self.add(proxy):
                    added += 1
            except Exception as e:
                log.warning(f"Bỏ qua proxy không hợp lệ '{s}': {e}")
        return added

    def remove(self, index: int) -> bool:
        """Xóa proxy theo index."""
        if 0 <= index < len(self._proxies):
            removed = self._proxies.pop(index)
            self.save()
            log.info(f"Xóa proxy: {removed}")
            return True
        return False

    def clear(self):
        """Xóa tất cả proxy."""
        self._proxies.clear()
        self.save()

    def toggle(self, index: int) -> bool:
        """Bật/tắt proxy theo index."""
        if 0 <= index < len(self._proxies):
            self._proxies[index].enabled = not self._proxies[index].enabled
            self.save()
            return True
        return False

    def get_next(self) -> ProxyInfo | None:
        """Lấy proxy tiếp theo (round-robin, ưu tiên ít dùng gần đây nhất).

        Chiến lược:
        - Chỉ chọn proxy enabled
        - Ưu tiên proxy chưa dùng lâu nhất (least recently used)
        - Ưu tiên proxy có success rate cao
        """
        enabled = [p for p in self._proxies if p.enabled]
        if not enabled:
            return None

        # Sắp xếp: ít dùng gần đây nhất + success rate cao
        enabled.sort(key=lambda p: (p.last_used, -p.success_rate))

        # Chọn từ top 3 (random để không quá predictable)
        candidates = enabled[:min(3, len(enabled))]
        chosen = random.choice(candidates)
        chosen.last_used = time.time()
        return chosen

    def record_success(self, proxy: ProxyInfo, response_ms: int = 0):
        """Ghi nhận proxy thành công."""
        proxy.success += 1
        if response_ms > 0:
            if proxy.avg_ms == 0:
                proxy.avg_ms = response_ms
            else:
                proxy.avg_ms = int(proxy.avg_ms * 0.7 + response_ms * 0.3)
        self.save()

    def record_failure(self, proxy: ProxyInfo):
        """Ghi nhận proxy thất bại. Tự động disable nếu fail quá nhiều."""
        proxy.fail += 1
        # Auto-disable nếu success rate < 30% và đã dùng >= 5 lần
        total = proxy.success + proxy.fail
        if total >= 5 and proxy.success_rate < 30:
            proxy.enabled = False
            log.warning(f"Auto-disable proxy {proxy} (success rate: {proxy.success_rate:.0f}%)")
        self.save()

    async def check_proxy(self, proxy: ProxyInfo) -> tuple[bool, int]:
        """Kiểm tra proxy hoạt động bằng Playwright.

        Returns: (is_working, response_ms)
        """
        from src.browser.manager import create_context, create_page

        start_ms = int(time.time() * 1000)
        try:
            ctx = await create_context(proxy=proxy.to_config())
            page = await create_page(ctx)

            await page.goto("https://httpbin.org/ip", timeout=15000)
            content = await page.content()

            await page.close()
            await ctx.close()

            elapsed = int(time.time() * 1000) - start_ms
            proxy.last_check = time.time()

            if "origin" in content:
                self.record_success(proxy, elapsed)
                log.info(f"Proxy {proxy} OK ({elapsed}ms)")
                return True, elapsed
            else:
                self.record_failure(proxy)
                return False, elapsed

        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            proxy.last_check = time.time()
            self.record_failure(proxy)
            log.warning(f"Proxy {proxy} FAIL: {e} ({elapsed}ms)")
            return False, elapsed

    async def check_all(self) -> dict:
        """Kiểm tra tất cả proxy. Trả về {total, ok, fail}."""
        results = {"total": len(self._proxies), "ok": 0, "fail": 0}
        for proxy in self._proxies:
            if not proxy.enabled:
                continue
            ok, _ = await self.check_proxy(proxy)
            if ok:
                results["ok"] += 1
            else:
                results["fail"] += 1
        return results

    def get_summary(self) -> str:
        """Tóm tắt trạng thái proxy pool."""
        total = len(self._proxies)
        active = sum(1 for p in self._proxies if p.enabled)
        if total == 0:
            return "Chưa có proxy"
        return f"{active}/{total} proxy hoạt động"


# Singleton
proxy_manager = ProxyManager()
