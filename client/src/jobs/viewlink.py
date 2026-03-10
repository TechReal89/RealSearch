"""ViewLink job executor - truy cập URL và tương tác tự nhiên."""
import random
import time

from src.browser.humanizer import (
    click_internal_links,
    human_delay,
    human_mouse_move,
    human_scroll,
    micro_movements,
)
from src.browser.manager import create_context, create_page
from src.config import config
from src.jobs.base import BaseJobExecutor
from src.utils.logger import log


class ViewLinkExecutor(BaseJobExecutor):
    job_type = "viewlink"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})
        target_url = cfg["target_url"]
        min_time = cfg.get("min_time_on_site", 30)
        max_time = cfg.get("max_time_on_site", 120)
        do_click = cfg.get("click_internal_links", False)
        max_clicks = cfg.get("max_internal_clicks", 3)
        scroll_behavior = cfg.get("scroll_behavior", "natural")

        stay_time = random.randint(min_time, max_time)

        log.info(f"[Task #{task_id}] Mở {target_url} (ở lại {stay_time}s)")

        # Proxy from client config
        proxy = config.get("proxy")
        context = await create_context(proxy=proxy)
        page = await create_page(context)
        pages_visited = 1
        internal_clicks = []
        time_on_pages = []
        start = time.time()

        try:
            # Referer spoofing + truy cập trang
            await self._simulate_referer(page, target_url)
            page_start = time.time()

            # Đợi trang load
            await human_delay(1.0, 3.0)

            # Di chuyển chuột (Bezier)
            await human_mouse_move(page)

            # Cuộn trang
            await human_scroll(page, scroll_behavior)

            # Micro movements - giả lập đọc nội dung
            if random.random() < 0.4:
                await micro_movements(page, random.uniform(2.0, 5.0))

            # Đợi trên trang chính
            main_stay = random.randint(min_time // 2, min_time)
            await human_delay(main_stay, main_stay + 5)
            time_on_pages.append(int(time.time() - page_start))

            # Click link nội bộ
            if do_click and max_clicks > 0:
                clicked = await click_internal_links(page, max_clicks)
                pages_visited += clicked

            # Đợi thêm nếu chưa đủ thời gian
            elapsed = time.time() - start
            remaining = stay_time - elapsed
            if remaining > 0:
                await human_delay(remaining * 0.8, remaining)

            # Tính scroll depth
            scroll_depth = await page.evaluate("""
                () => {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollHeight = document.documentElement.scrollHeight;
                    const clientHeight = document.documentElement.clientHeight;
                    if (scrollHeight <= clientHeight) return 1.0;
                    return Math.min(1.0, (scrollTop + clientHeight) / scrollHeight);
                }
            """)

            total_time = int(time.time() - start)
            actual_url = page.url

            log.info(
                f"[Task #{task_id}] Hoàn thành: {pages_visited} trang, "
                f"{total_time}s, scroll {scroll_depth:.0%}"
            )

            return {
                "actual_url_visited": actual_url,
                "pages_visited": pages_visited,
                "internal_clicks": internal_clicks,
                "time_on_each_page": time_on_pages,
                "total_time": total_time,
                "scroll_depth": round(scroll_depth, 2),
            }

        finally:
            await page.close()
            await context.close()

    async def _simulate_referer(self, page, target_url: str):
        """Mô phỏng nguồn truy cập (referer) tự nhiên."""
        roll = random.random()

        if roll < 0.35:
            # 35%: Từ Google - visit google trước để có referer tự nhiên
            try:
                await page.goto("https://www.google.com", wait_until="domcontentloaded", timeout=10000)
                await human_delay(1.0, 2.0)
                await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            except Exception:
                await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        elif roll < 0.55:
            # 20%: Direct - truy cập trực tiếp
            await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        else:
            # 45%: Set referer header từ các nguồn phổ biến
            referers = [
                "https://www.facebook.com/",
                "https://t.co/",
                "https://www.youtube.com/",
                "https://news.zing.vn/",
                "https://vnexpress.net/",
            ]
            referer = random.choice(referers)
            await page.set_extra_http_headers({"Referer": referer})
            await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
