"""Backlink executor - truy cập bài viết chứa backlink, tìm anchor text, click vào link đích."""
import random
import time

from src.browser.humanizer import (
    human_delay,
    human_mouse_move,
    human_scroll,
    micro_movements,
)
from src.browser.manager import create_context, create_page
from src.jobs.base import BaseJobExecutor
from src.utils.logger import log


class BacklinkExecutor(BaseJobExecutor):
    job_type = "backlink"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})

        # article_url: bài viết chứa backlink
        # target_url: URL đích mà backlink trỏ tới (job.target_url)
        # anchor_texts: danh sách anchor text cần tìm và click
        article_urls = cfg.get("article_urls", [])
        target_url = cfg.get("target_url", "")
        anchor_texts = cfg.get("anchor_texts", [])
        min_time = cfg.get("min_time_on_site", 20)
        max_time = cfg.get("max_time_on_site", 60)
        min_time_target = cfg.get("min_time_on_target", 30)
        max_time_target = cfg.get("max_time_on_target", 120)
        scroll_behavior = cfg.get("scroll_behavior", "natural")

        if not article_urls:
            raise ValueError("Không có article_urls (URL bài viết chứa backlink)")
        if not target_url:
            raise ValueError("Không có target_url (URL đích)")

        # Chọn ngẫu nhiên 1 bài viết
        article_url = random.choice(article_urls)
        stay_time = random.randint(min_time, max_time)
        target_stay = random.randint(min_time_target, max_time_target)

        log.info(
            f"[Task #{task_id}] Backlink: đọc {article_url} → "
            f"tìm anchor → click → {target_url}"
        )

        proxy = self._get_proxy()
        context = await create_context(proxy=proxy)
        page = await create_page(context)
        start = time.time()

        try:
            # --- BƯỚC 1: Mở bài viết chứa backlink ---
            try:
                await page.goto(
                    article_url, wait_until="domcontentloaded", timeout=30000
                )
            except Exception as e:
                log.warning(f"[Task #{task_id}] Không mở được {article_url}: {e}")
                return {
                    "actual_url_visited": article_url,
                    "backlink_clicked": False,
                    "target_url": target_url,
                    "article_url": article_url,
                    "pages_visited": 0,
                    "scroll_depth": 0,
                    "total_time": int(time.time() - start),
                    "error": str(e),
                }

            # --- BƯỚC 2: Đọc bài viết tự nhiên ---
            await human_delay(1.5, 3.0)
            await human_mouse_move(page)
            await human_scroll(page, scroll_behavior)

            # Micro movements giả lập đọc
            if random.random() < 0.5:
                await micro_movements(page, random.uniform(3.0, 6.0))

            # Ở trên bài viết
            article_stay = random.randint(stay_time // 2, stay_time)
            await human_delay(article_stay, article_stay + 5)

            # Tính scroll depth trên bài viết
            article_scroll = await page.evaluate("""
                () => {
                    const st = window.pageYOffset || document.documentElement.scrollTop;
                    const sh = document.documentElement.scrollHeight;
                    const ch = document.documentElement.clientHeight;
                    if (sh <= ch) return 1.0;
                    return Math.min(1.0, (st + ch) / sh);
                }
            """)

            # --- BƯỚC 3: Tìm và click anchor text/link đích ---
            backlink_clicked = False
            click_method = "none"

            # Thử tìm link theo anchor text trước
            if anchor_texts:
                for anchor in anchor_texts:
                    if not anchor.strip():
                        continue
                    # Tìm link <a> chứa text giống anchor
                    link = page.locator(f'a:has-text("{anchor.strip()}")')
                    count = await link.count()
                    if count > 0:
                        # Cuộn đến link
                        try:
                            await link.first.scroll_into_view_if_needed()
                            await human_delay(0.5, 1.5)
                            await human_mouse_move(page)
                            await human_delay(0.3, 0.8)
                            await link.first.click()
                            backlink_clicked = True
                            click_method = f"anchor:{anchor.strip()}"
                            log.info(
                                f"[Task #{task_id}] Click anchor '{anchor}' thành công"
                            )
                            break
                        except Exception as e:
                            log.warning(
                                f"[Task #{task_id}] Click anchor '{anchor}' lỗi: {e}"
                            )

            # Nếu không tìm được theo anchor, tìm theo href chứa target_url
            if not backlink_clicked:
                from urllib.parse import urlparse

                target_domain = urlparse(target_url).netloc
                # Tìm tất cả link chứa target domain
                links = page.locator(f'a[href*="{target_domain}"]')
                count = await links.count()
                if count > 0:
                    idx = random.randint(0, count - 1)
                    try:
                        await links.nth(idx).scroll_into_view_if_needed()
                        await human_delay(0.5, 1.5)
                        await human_mouse_move(page)
                        await human_delay(0.3, 0.8)
                        await links.nth(idx).click()
                        backlink_clicked = True
                        click_method = f"href:{target_domain}"
                        log.info(
                            f"[Task #{task_id}] Click link href chứa {target_domain}"
                        )
                    except Exception as e:
                        log.warning(
                            f"[Task #{task_id}] Click link href lỗi: {e}"
                        )

            if not backlink_clicked:
                log.warning(
                    f"[Task #{task_id}] Không tìm thấy backlink trên {article_url}"
                )
                return {
                    "actual_url_visited": article_url,
                    "backlink_clicked": False,
                    "target_url": target_url,
                    "article_url": article_url,
                    "pages_visited": 1,
                    "scroll_depth": round(article_scroll, 2),
                    "total_time": int(time.time() - start),
                    "click_method": "not_found",
                }

            # --- BƯỚC 4: Duyệt trang đích sau khi click ---
            await human_delay(2.0, 4.0)  # Đợi trang load

            # Kiểm tra đã chuyển trang chưa
            current_url = page.url
            log.info(f"[Task #{task_id}] Đang ở trang đích: {current_url}")

            # Hành vi tự nhiên trên trang đích
            await human_mouse_move(page)
            await human_scroll(page, scroll_behavior)

            if random.random() < 0.4:
                await micro_movements(page, random.uniform(2.0, 5.0))

            # Ở trên trang đích
            target_actual_stay = random.randint(
                target_stay // 2, target_stay
            )
            await human_delay(target_actual_stay, target_actual_stay + 5)

            # Cuộn thêm
            if random.random() < 0.6:
                await human_scroll(page, "natural")

            # Tính scroll depth trên trang đích
            target_scroll = await page.evaluate("""
                () => {
                    const st = window.pageYOffset || document.documentElement.scrollTop;
                    const sh = document.documentElement.scrollHeight;
                    const ch = document.documentElement.clientHeight;
                    if (sh <= ch) return 1.0;
                    return Math.min(1.0, (st + ch) / sh);
                }
            """)

            total_time = int(time.time() - start)

            log.info(
                f"[Task #{task_id}] Backlink hoàn thành: {article_url} → "
                f"{current_url}, {total_time}s"
            )

            return {
                "actual_url_visited": current_url,
                "backlink_clicked": True,
                "target_url": target_url,
                "article_url": article_url,
                "click_method": click_method,
                "pages_visited": 2,
                "article_scroll_depth": round(article_scroll, 2),
                "scroll_depth": round(target_scroll, 2),
                "total_time": total_time,
            }

        finally:
            await page.close()
            await context.close()
