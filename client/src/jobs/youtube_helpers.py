"""YouTube-specific helpers: platform detection, playback monitoring, ad handling."""
import asyncio
import random
from urllib.parse import urlparse

from src.browser.humanizer import (
    human_delay,
    human_mouse_move,
    human_scroll,
    micro_movements,
)
from src.utils.logger import log


# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

def detect_platform(url: str) -> str:
    """Detect platform from URL. Returns one of:
    youtube, youtube_shorts, facebook, facebook_reel, tiktok, unknown
    """
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        path = parsed.path or ""
    except Exception:
        return "unknown"

    # YouTube
    if "youtube.com" in host or "youtu.be" in host:
        if "/shorts/" in path:
            return "youtube_shorts"
        return "youtube"

    # Facebook
    if "facebook.com" in host or "fb.com" in host or "fb.watch" in host:
        if "/reel" in path:
            return "facebook_reel"
        return "facebook"

    # TikTok
    if "tiktok.com" in host:
        return "tiktok"

    return "unknown"


# ---------------------------------------------------------------------------
# Video state via JS evaluation
# ---------------------------------------------------------------------------

_JS_VIDEO_STATE = """
() => {
    const v = document.querySelector('video');
    if (!v) return null;
    return {
        currentTime: v.currentTime,
        duration: v.duration || 0,
        paused: v.paused,
        ended: v.ended,
        readyState: v.readyState,
    };
}
"""

_JS_AD_STATE = """
() => {
    const player = document.querySelector('#movie_player');
    if (!player) return {adPlaying: false, skipAvailable: false};
    const adPlaying = player.classList.contains('ad-showing')
                   || player.classList.contains('ad-interrupting');
    if (!adPlaying) return {adPlaying: false, skipAvailable: false};
    const skipBtn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, '
        + '.ytp-skip-ad-button, button.ytp-ad-skip-button-slot, '
        + '[class*="skip-button"]'
    );
    return {
        adPlaying: true,
        skipAvailable: !!(skipBtn && skipBtn.offsetParent !== null),
    };
}
"""

_JS_VIDEO_TITLE = """
() => {
    return document.querySelector('h1 yt-formatted-string')?.textContent?.trim()
        || document.querySelector('#title h1')?.textContent?.trim()
        || document.title.replace(' - YouTube', '').trim()
        || '';
}
"""


async def get_video_state(page) -> dict | None:
    """Get current video element state via JS evaluation."""
    try:
        return await page.evaluate(_JS_VIDEO_STATE)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Ad handling
# ---------------------------------------------------------------------------

_AD_SKIP_SELECTORS = (
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    "button.ytp-ad-skip-button-slot",
)


async def skip_youtube_ad(page) -> bool:
    """Check for YouTube ad and skip if possible. Returns True if ad was skipped."""
    try:
        ad_state = await page.evaluate(_JS_AD_STATE)
        if not ad_state or not ad_state.get("adPlaying"):
            return False

        log.debug("YouTube ad detected")

        # Wait a human-like delay before attempting skip (don't skip instantly)
        await human_delay(2.0, 4.0)

        # Try to find and click skip button (up to 3 attempts)
        for attempt in range(3):
            ad_state = await page.evaluate(_JS_AD_STATE)
            if not ad_state or not ad_state.get("adPlaying"):
                return True  # Ad ended on its own

            if ad_state.get("skipAvailable"):
                for selector in _AD_SKIP_SELECTORS:
                    try:
                        btn = page.locator(selector)
                        if await btn.count() > 0 and await btn.first.is_visible():
                            await btn.first.click()
                            await human_delay(0.5, 1.0)
                            log.debug("YouTube ad skipped")
                            return True
                    except Exception:
                        continue

            # Skip not available yet, wait and retry
            await human_delay(1.5, 2.5)

        # Couldn't skip - let the ad play out (non-skippable)
        log.debug("Non-skippable ad, waiting for it to end")
        return False

    except Exception:
        return False


# ---------------------------------------------------------------------------
# Playback control
# ---------------------------------------------------------------------------

async def ensure_video_playing(page) -> bool:
    """Ensure the video is playing. Click play if paused. Returns True if playing."""
    state = await get_video_state(page)
    if state is None:
        return False

    if not state.get("paused") and not state.get("ended"):
        return True  # Already playing

    if state.get("ended"):
        return False  # Video finished

    # Try clicking play button
    try:
        play_btn = page.locator(
            'button.ytp-play-button, button[aria-label*="Play"], '
            'button[data-title-no-tooltip="Play"]'
        )
        if await play_btn.count() > 0:
            await play_btn.first.click()
            await human_delay(0.5, 1.0)
            state = await get_video_state(page)
            if state and not state.get("paused"):
                return True
    except Exception:
        pass

    # Fallback: click the video element itself
    try:
        video_el = page.locator("video")
        if await video_el.count() > 0:
            await video_el.first.click()
            await human_delay(0.5, 1.0)
            state = await get_video_state(page)
            return state is not None and not state.get("paused")
    except Exception:
        pass

    return False


# ---------------------------------------------------------------------------
# Playback monitoring loop
# ---------------------------------------------------------------------------

async def wait_for_playback(page, target_seconds: int, task_id: int) -> dict:
    """Monitor actual video playback via video.currentTime.

    Returns dict with actual_seconds_watched, video_duration, ads_skipped, video_title.
    """
    ads_skipped = 0
    max_ad_skips = 5
    stall_count = 0
    max_stalls = 3

    # Get initial state
    state = await get_video_state(page)
    if state is None:
        return {
            "actual_seconds_watched": 0,
            "video_duration": 0,
            "ads_skipped": 0,
            "video_title": "",
            "error": "video_not_found",
        }

    initial_time = state.get("currentTime", 0)
    video_duration = state.get("duration", 0)
    last_time = initial_time

    # Cap target at 70% of video duration if known and shorter
    if video_duration > 0 and target_seconds > video_duration * 0.7:
        target_seconds = int(video_duration * 0.7)
        target_seconds = max(target_seconds, 10)  # At least 10s

    iteration = 0

    while True:
        # Random check interval 3-8 seconds
        await asyncio.sleep(random.uniform(3.0, 8.0))
        iteration += 1

        # Check for ads
        if ads_skipped < max_ad_skips:
            skipped = await skip_youtube_ad(page)
            if skipped:
                ads_skipped += 1

        # Get current video state
        state = await get_video_state(page)
        if state is None:
            break  # Video element gone (page navigated away?)

        current_time = state.get("currentTime", 0)

        # Video ended
        if state.get("ended"):
            log.debug(f"[Task #{task_id}] Video ended at {current_time:.1f}s")
            break

        # Video paused - try to resume
        if state.get("paused"):
            await ensure_video_playing(page)

        # Check if playback is stuck (currentTime not advancing)
        if abs(current_time - last_time) < 0.5:
            stall_count += 1
            if stall_count >= max_stalls:
                log.warning(
                    f"[Task #{task_id}] Playback stuck at {current_time:.1f}s "
                    f"after {stall_count} checks"
                )
                break
        else:
            stall_count = 0

        last_time = current_time

        # Check if we've watched enough
        watched = current_time - initial_time
        if watched >= target_seconds:
            log.debug(
                f"[Task #{task_id}] Target reached: {watched:.1f}s / {target_seconds}s"
            )
            break

        # Random viewer interactions (30% chance every iteration)
        if random.random() < 0.3:
            await youtube_viewer_interactions(page)

    # Final state
    final_state = await get_video_state(page)
    final_time = final_state.get("currentTime", last_time) if final_state else last_time
    actual_watched = max(0, final_time - initial_time)

    # Get video title
    try:
        video_title = await page.evaluate(_JS_VIDEO_TITLE)
    except Exception:
        video_title = ""

    return {
        "actual_seconds_watched": round(actual_watched, 1),
        "video_duration": round(video_duration, 1),
        "ads_skipped": ads_skipped,
        "video_title": (video_title or "")[:200],
    }


# ---------------------------------------------------------------------------
# Natural viewer interactions
# ---------------------------------------------------------------------------

async def youtube_viewer_interactions(page):
    """Simulate natural YouTube viewer behavior (weighted random)."""
    try:
        roll = random.random()

        if roll < 0.25:
            # Hover progress bar area (bottom of player)
            await _hover_progress_bar(page)

        elif roll < 0.45:
            # Scroll to comments, pause, scroll back
            await _peek_comments(page)

        elif roll < 0.60:
            # Click "Show more" in description
            await _expand_description(page)

        elif roll < 0.75:
            # Micro movements near player
            await micro_movements(page, duration=random.uniform(1.0, 3.0))

        # else: do nothing (25%) - just watching

    except Exception:
        pass


async def _hover_progress_bar(page):
    """Hover over the YouTube progress bar area."""
    try:
        player = page.locator("#movie_player")
        if await player.count() == 0:
            return
        box = await player.first.bounding_box()
        if not box:
            return

        # Progress bar is near the bottom of the player
        target_x = box["x"] + random.uniform(0.2, 0.8) * box["width"]
        target_y = box["y"] + box["height"] - random.uniform(5, 30)

        await human_mouse_move(page, int(target_x), int(target_y))
        await human_delay(0.5, 1.5)

        # Move away
        away_x = box["x"] + random.uniform(0.3, 0.7) * box["width"]
        away_y = box["y"] + random.uniform(0.3, 0.6) * box["height"]
        await human_mouse_move(page, int(away_x), int(away_y))
    except Exception:
        pass


async def _peek_comments(page):
    """Scroll down to comments section briefly, then scroll back."""
    try:
        # Save current scroll position
        scroll_pos = await page.evaluate("window.pageYOffset")

        # Scroll to comments
        comments = page.locator("#comments")
        if await comments.count() > 0:
            await comments.first.scroll_into_view_if_needed()
            await human_delay(2.0, 5.0)

            # Scroll back to player
            await page.evaluate(
                f"window.scrollTo({{top: {scroll_pos}, behavior: 'smooth'}})"
            )
            await human_delay(0.5, 1.0)
    except Exception:
        pass


async def _expand_description(page):
    """Click 'Show more' / expand description."""
    try:
        expand_btn = page.locator(
            'tp-yt-paper-button#expand, '
            '#expand.button, '
            '#description-inline-expander #expand'
        )
        if await expand_btn.count() > 0 and await expand_btn.first.is_visible():
            await expand_btn.first.click()
            await human_delay(2.0, 4.0)
    except Exception:
        pass
