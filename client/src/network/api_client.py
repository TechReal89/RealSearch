"""REST API client."""
import httpx

from src.config import config
from src.utils.logger import log


class ApiClient:
    def __init__(self):
        self._access_token: str | None = None
        self._refresh_token: str | None = None

    @property
    def base_url(self) -> str:
        return f"{config.server_url}/api/v1"

    @property
    def is_logged_in(self) -> bool:
        return self._access_token is not None

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self._access_token:
            h["Authorization"] = f"Bearer {self._access_token}"
        return h

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.request(method, url, headers=self._headers(), **kwargs)

            if resp.status_code == 401 and self._refresh_token:
                # Try refresh
                refreshed = await self._do_refresh()
                if refreshed:
                    resp = await client.request(
                        method, url, headers=self._headers(), **kwargs
                    )

            if resp.status_code >= 400:
                detail = resp.json().get("detail", resp.text)
                raise Exception(f"{detail}")

            return resp.json()

    async def _do_refresh(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{self.base_url}/auth/refresh",
                    headers={"Content-Type": "application/json"},
                    json={"refresh_token": self._refresh_token},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    self._access_token = data["access_token"]
                    self._refresh_token = data["refresh_token"]
                    log.info("Token refreshed")
                    return True
        except Exception:
            pass
        return False

    async def login(self, username: str, password: str) -> dict:
        data = await self._request(
            "POST", "/auth/login", json={"username": username, "password": password}
        )
        self._access_token = data["access_token"]
        self._refresh_token = data["refresh_token"]
        log.info(f"Đăng nhập thành công: {username}")
        return data

    async def get_me(self) -> dict:
        data = await self._request("GET", "/auth/me")
        return data["user"]

    async def get_profile(self) -> dict:
        return await self._request("GET", "/users/profile")

    async def get_stats(self) -> dict:
        return await self._request("GET", "/users/stats")

    def logout(self):
        self._access_token = None
        self._refresh_token = None
        log.info("Đã đăng xuất")


api = ApiClient()
