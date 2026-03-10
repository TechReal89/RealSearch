"""Redis-based rate limiting middleware for FastAPI."""
import logging
import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """Simple in-memory rate limiter using sliding window."""

    def __init__(self):
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        cutoff = now - window_seconds

        # Clean old entries
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

        if len(self._requests[key]) >= max_requests:
            return False

        self._requests[key].append(now)
        return True

    def cleanup(self):
        """Remove stale keys to prevent memory leak."""
        now = time.time()
        stale_keys = [
            k for k, v in self._requests.items()
            if not v or v[-1] < now - 3600
        ]
        for k in stale_keys:
            del self._requests[k]


_limiter = InMemoryRateLimiter()

# Rate limit configs: (max_requests, window_seconds)
RATE_LIMITS = {
    "/api/v1/auth/login": (5, 60),        # 5 req/min
    "/api/v1/auth/register": (3, 60),      # 3 req/min
    "/api/v1/payments/create": (10, 60),   # 10 req/min
}

# Default: 60 req/min for all other API endpoints
DEFAULT_RATE_LIMIT = (60, 60)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for non-API paths, health checks, docs
        path = request.url.path
        if not path.startswith("/api/") or path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)

        # Get client IP
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else "unknown"

        # Check specific rate limits first
        max_requests, window = DEFAULT_RATE_LIMIT
        for route_prefix, limits in RATE_LIMITS.items():
            if path.startswith(route_prefix):
                max_requests, window = limits
                break

        key = f"{client_ip}:{path}"

        if not _limiter.is_allowed(key, max_requests, window):
            logger.warning("Rate limit exceeded: %s %s", client_ip, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
