"""Social Media executor - xem video, tương tác mạng xã hội."""
import random
import time

from src.browser.humanizer import human_delay, human_mouse_move, human_scroll, micro_movements
from src.browser.manager import create_context, create_page
from src.jobs.base import BaseJobExecutor
from src.jobs.youtube_helpers import (
    detect_platform,
    ensure_video_playing,
    get_video_state,
    skip_youtube_ad,
    wait_for_playback,
    youtube_viewer_interactions,
)
from src.utils.logger import log


class SocialMediaExecutor(BaseJobExecutor):
    job_type = "social_media"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})

        target_url = cfg.get("target_url", "")
        platform = cfg.get("platform", "")
        action = cfg.get("action", "view")
        min_watch = cfg.get("min_watch_time", 30)
        max_watch = cfg.get("max_watch_time", 120)

        if not target_url:
            raise ValueError("Không có target_url")

        # Auto-detect platform if not explicitly set
        detected = detect_platform(target_url)
        if not platform:
            platform = detected if detected != "unknown" else "youtube"

        watch_time = random.randint(min_watch, max_watch)

        log.info(
            f"[Task #{task_id}] Social: {platform}/{action} → {target_url} "
            f"(target {watch_time}s)"
        )

        proxy = self._get_proxy()
        context = await create_context(proxy=proxy)
        page = await create_page(context)
        start = time.time()

        try:
            if platform in ("youtube", "youtube_shorts") or detected in ("youtube", "youtube_shorts"):
                if detected == "youtube_shorts" or "/shorts/" in target_url:
                    result = await self._watch_youtube_shorts(
                        page, task_id, target_url, watch_time
                    )
                else:
                    result = await self._watch_youtube(
                        page, task_id, target_url, watch_time
                    )
            elif platform == "facebook" or detected in ("facebook", "facebook_reel"):
                result = await self._interact_facebook(
                    page, task_id, target_url, watch_time, action
                )
            elif platform == "tiktok" or detected == "tiktok":
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

    # ------------------------------------------------------------------
    # YouTube (regular video)
    # ------------------------------------------------------------------

    async def _watch_youtube(self, page, task_id, url, watch_time) -> dict:
        """Xem video YouTube với playback monitoring thực tế."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(2.0, 4.0)

        # Đồng ý cookies nếu có
        try:
            consent = page.locator(
                'button:has-text("Accept"), button:has-text("Agree"), '
                'button:has-text("Đồng ý")'
            )
            if await consent.count() > 0:
                await consent.first.click()
                await human_delay(1.0, 2.0)
        except Exception:
            pass

        # Check consent redirect
        if "consent.youtube.com" in (page.url or ""):
            log.warning(f"[Task #{task_id}] YouTube consent redirect, cannot proceed")
            return {
                "actual_url_visited": page.url,
                "watch_time": 0,
                "pages_visited": 0,
                "error": "consent_redirect",
            }

        # Đợi video player load
        try:
            await page.wait_for_selector("video, #movie_player", timeout=15000)
        except Exception:
            log.warning(f"[Task #{task_id}] Video player not found")
            return {
                "actual_url_visited": page.url,
                "watch_time": 0,
                "pages_visited": 0,
                "error": "video_not_found",
            }

        # Handle pre-roll ads
        await skip_youtube_ad(page)

        # Ensure video is playing
        await ensure_video_playing(page)

        # Monitor actual playback
        playback = await wait_for_playback(page, watch_time, task_id)

        actual_watched = playback.get("actual_seconds_watched", 0)
        video_title = playback.get("video_title", "")

        log.info(
            f"[Task #{task_id}] YouTube: watched {actual_watched}s"
            f" / {playback.get('video_duration', '?')}s"
            f" (ads skipped: {playback.get('ads_skipped', 0)})"
            f" - '{video_title[:50]}'"
        )

        return {
            "actual_url_visited": page.url,
            "video_title": video_title,
            "watch_time": int(actual_watched),
            "video_duration": playback.get("video_duration", 0),
            "ads_skipped": playback.get("ads_skipped", 0),
            "playback_verified": True,
            "pages_visited": 1,
            "scroll_depth": 0,
        }

    # ------------------------------------------------------------------
    # YouTube Shorts
    # ------------------------------------------------------------------

    async def _watch_youtube_shorts(self, page, task_id, url, watch_time) -> dict:
        """Xem YouTube Shorts (vertical video, auto-play)."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(2.0, 4.0)

        # Dismiss overlays
        try:
            consent = page.locator(
                'button:has-text("Accept"), button:has-text("Agree"), '
                'button:has-text("Đồng ý")'
            )
            if await consent.count() > 0:
                await consent.first.click()
                await human_delay(1.0, 2.0)
        except Exception:
            pass

        # Wait for video
        try:
            await page.wait_for_selector("video", timeout=15000)
        except Exception:
            log.warning(f"[Task #{task_id}] Shorts video not found")
            return {
                "actual_url_visited": page.url,
                "watch_time": 0,
                "pages_visited": 0,
                "error": "video_not_found",
            }

        await ensure_video_playing(page)
        await human_delay(1.0, 2.0)

        # Get video state to determine duration
        state = await get_video_state(page)
        if state is None:
            return {
                "actual_url_visited": page.url,
                "watch_time": 0,
                "pages_visited": 0,
                "error": "video_state_unavailable",
            }

        duration = state.get("duration", 60)
        initial_time = state.get("currentTime", 0)

        # Shorts are typically 15-60s, watch 50-100% of it
        target = min(watch_time, int(duration * random.uniform(0.5, 1.0)))
        target = max(target, 5)

        # Simple playback monitor (no ads on Shorts)
        stall_count = 0
        last_time = initial_time
        videos_watched = 1

        while True:
            await human_delay(3.0, 6.0)

            state = await get_video_state(page)
            if state is None:
                break

            current = state.get("currentTime", 0)

            if state.get("ended") or (current - initial_time) >= target:
                break

            # Stall detection
            if abs(current - last_time) < 0.5:
                stall_count += 1
                if stall_count >= 3:
                    break
            else:
                stall_count = 0
            last_time = current

            # Occasional micro movements
            if random.random() < 0.2:
                await micro_movements(page, random.uniform(1.0, 2.0))

        # Final measurement
        final_state = await get_video_state(page)
        final_time = final_state.get("currentTime", last_time) if final_state else last_time
        actual_first = max(0, final_time - initial_time)

        # 30% chance: swipe to next Short
        actual_extra = 0
        if random.random() < 0.3:
            try:
                # Scroll down to next Short
                await page.keyboard.press("ArrowDown")
                await human_delay(2.0, 4.0)
                videos_watched += 1

                # Watch the next Short for 10-20s
                next_state = await get_video_state(page)
                if next_state:
                    next_start = next_state.get("currentTime", 0)
                    extra_target = random.randint(10, 20)
                    await human_delay(extra_target, extra_target + 3)
                    next_final = await get_video_state(page)
                    if next_final:
                        actual_extra = max(0, next_final.get("currentTime", 0) - next_start)
            except Exception:
                pass

        total_watched = actual_first + actual_extra

        log.info(
            f"[Task #{task_id}] Shorts: watched {total_watched:.1f}s "
            f"({videos_watched} videos)"
        )

        return {
            "actual_url_visited": page.url,
            "watch_time": int(total_watched),
            "video_duration": round(duration, 1),
            "videos_watched": videos_watched,
            "playback_verified": True,
            "pages_visited": videos_watched,
            "scroll_depth": 0,
        }

    # ------------------------------------------------------------------
    # Facebook (unchanged for now - Phase 2)
    # ------------------------------------------------------------------

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

        log.info(f"[Task #{task_id}] Facebook: đã xem {watch_time}s")

        return {
            "actual_url_visited": page.url,
            "watch_time": watch_time,
            "pages_visited": 1,
            "scroll_depth": 0,
        }

    # ------------------------------------------------------------------
    # TikTok (unchanged for now - Phase 3)
    # ------------------------------------------------------------------

    async def _watch_tiktok(self, page, task_id, url, watch_time, action) -> dict:
        """Xem video TikTok."""
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(3.0, 5.0)

        # Đợi video load
        try:
            await page.wait_for_selector("video", timeout=10000)
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

    # ------------------------------------------------------------------
    # Generic fallback
    # ------------------------------------------------------------------

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
