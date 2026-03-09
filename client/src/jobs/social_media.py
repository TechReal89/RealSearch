"""Social Media executor - xem video, tương tác mạng xã hội."""
import random
import time

from src.browser.humanizer import human_delay, human_mouse_move, human_scroll
from src.browser.manager import create_context, create_page
from src.jobs.base import BaseJobExecutor
from src.utils.logger import log


class SocialMediaExecutor(BaseJobExecutor):
    job_type = "social_media"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})

        target_url = cfg.get("target_url", "")
        platform = cfg.get("platform", "youtube")
        action = cfg.get("action", "view")
        min_watch = cfg.get("min_watch_time", 30)
        max_watch = cfg.get("max_watch_time", 120)

        if not target_url:
            raise ValueError("Không có target_url")

        watch_time = random.randint(min_watch, max_watch)

        log.info(
            f"[Task #{task_id}] Social: {platform}/{action} → {target_url} "
            f"(xem {watch_time}s)"
        )

        context = await create_context()
        page = await create_page(context)
        start = time.time()

        try:
            if platform == "youtube":
                result = await self._watch_youtube(
                    page, task_id, target_url, watch_time, action
                )
            elif platform == "facebook":
                result = await self._interact_facebook(
                    page, task_id, target_url, watch_time, action
                )
            elif platform == "tiktok":
                result = await self._watch_tiktok(
                    page, task_id, target_url, watch_time, action
                )
            else:
                result = await self._generic_view(
                    page, task_id, target_url, watch_time
                )

            result["total_time"] = int(time.time() - start)
            result["platform"] = platform
            result["action"] = action
            return result

        finally:
            await page.close()
            await context.close()

    async def _watch_youtube(self, page, task_id, url, watch_time, action) -> dict:
        """Xem video YouTube."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(2.0, 4.0)

        # Đồng ý cookies nếu có
        try:
            consent = page.locator('button:has-text("Accept"), button:has-text("Agree")')
            if await consent.count() > 0:
                await consent.first.click()
                await human_delay(1.0, 2.0)
        except Exception:
            pass

        # Đợi video player load
        try:
            await page.wait_for_selector(
                'video, #movie_player', timeout=10000
            )
        except Exception:
            pass

        # Click play nếu video chưa chạy
        try:
            play_btn = page.locator(
                'button.ytp-play-button, button[aria-label*="Play"]'
            )
            if await play_btn.count() > 0:
                await play_btn.first.click()
                await human_delay(1.0, 2.0)
        except Exception:
            pass

        # Xem video
        page_start = time.time()
        watched = 0
        while watched < watch_time:
            remaining = watch_time - watched
            chunk = min(random.randint(5, 15), remaining)
            await human_delay(chunk, chunk + 1)
            watched += chunk

            # Đôi khi tương tác
            action_roll = random.random()
            if action_roll < 0.2:
                await human_mouse_move(page)
            elif action_roll < 0.3:
                await human_scroll(page, "natural")

        actual_watch_time = int(time.time() - page_start)

        # Lấy thông tin video
        video_title = await page.evaluate(
            "document.querySelector('h1.ytd-video-primary-info-renderer, "
            "h1 yt-formatted-string')?.textContent?.trim() || "
            "document.title || ''"
        )

        log.info(
            f"[Task #{task_id}] YouTube: đã xem {actual_watch_time}s - "
            f"'{video_title[:50]}'"
        )

        return {
            "actual_url_visited": page.url,
            "video_title": video_title[:200],
            "watch_time": actual_watch_time,
            "pages_visited": 1,
            "scroll_depth": 0,
        }

    async def _interact_facebook(self, page, task_id, url, watch_time, action) -> dict:
        """Tương tác bài viết Facebook."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(3.0, 6.0)

        # Cuộn và đọc
        await human_scroll(page, "natural")
        await human_delay(watch_time * 0.6, watch_time * 0.8)

        # Tương tác thêm
        await human_mouse_move(page)
        await human_delay(watch_time * 0.2, watch_time * 0.3)

        actual_time = int(time.time())

        log.info(f"[Task #{task_id}] Facebook: đã xem {watch_time}s")

        return {
            "actual_url_visited": page.url,
            "watch_time": watch_time,
            "pages_visited": 1,
            "scroll_depth": 0,
        }

    async def _watch_tiktok(self, page, task_id, url, watch_time, action) -> dict:
        """Xem video TikTok."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(3.0, 5.0)

        # Đợi video load
        try:
            await page.wait_for_selector('video', timeout=10000)
        except Exception:
            pass

        # Xem video
        await human_delay(watch_time, watch_time + 5)

        log.info(f"[Task #{task_id}] TikTok: đã xem {watch_time}s")

        return {
            "actual_url_visited": page.url,
            "watch_time": watch_time,
            "pages_visited": 1,
            "scroll_depth": 0,
        }

    async def _generic_view(self, page, task_id, url, watch_time) -> dict:
        """Xem trang bất kỳ."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(2.0, 4.0)

        await human_mouse_move(page)
        await human_scroll(page, "natural")
        await human_delay(watch_time * 0.7, watch_time)

        scroll_depth = await page.evaluate("""
            () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                if (scrollHeight <= clientHeight) return 1.0;
                return Math.min(1.0, (scrollTop + clientHeight) / scrollHeight);
            }
        """)

        log.info(f"[Task #{task_id}] Social view: đã xem {watch_time}s")

        return {
            "actual_url_visited": page.url,
            "watch_time": watch_time,
            "pages_visited": 1,
            "scroll_depth": round(scroll_depth, 2),
        }
