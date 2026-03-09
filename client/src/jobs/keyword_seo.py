"""Keyword SEO executor - tìm kiếm Google và click vào target URL."""
import random
import time

from src.browser.humanizer import (
    click_internal_links,
    human_delay,
    human_mouse_move,
    human_scroll,
)
from src.browser.manager import create_context, create_page
from src.jobs.base import BaseJobExecutor
from src.utils.logger import log


async def human_type(page, selector: str, text: str):
    """Gõ từng ký tự như người thật."""
    element = page.locator(selector)
    await element.click()
    await human_delay(0.3, 0.8)

    for i, char in enumerate(text):
        # Đôi khi gõ sai rồi xoá
        if random.random() < 0.03 and char.isalpha():
            wrong = random.choice("abcdefghijklmnopqrstuvwxyz")
            await element.press(wrong)
            await human_delay(0.1, 0.3)
            await element.press("Backspace")
            await human_delay(0.1, 0.2)

        await element.press(char)

        # Delay giữa ký tự
        if char == " ":
            await human_delay(0.1, 0.4)
        else:
            await human_delay(0.05, 0.2)

    await human_delay(0.5, 1.5)


class KeywordSEOExecutor(BaseJobExecutor):
    job_type = "keyword_seo"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})

        target_url = cfg.get("target_url", "")
        keywords = cfg.get("keywords", [])
        search_engine = cfg.get("search_engine", "google.com")
        target_domain = cfg.get("target_domain", "")
        max_search_page = cfg.get("max_search_page", 5)
        min_time = cfg.get("min_time_on_site", 30)
        max_time = cfg.get("max_time_on_site", 90)
        do_click_internal = cfg.get("click_internal_links", False)
        max_internal = cfg.get("max_internal_clicks", 3)

        # Nếu không có target_domain, trích từ target_url
        if not target_domain and target_url:
            from urllib.parse import urlparse
            target_domain = urlparse(target_url).netloc

        # Chọn keyword ngẫu nhiên nếu có nhiều
        if isinstance(keywords, list) and keywords:
            keyword = random.choice(keywords)
        elif isinstance(keywords, str):
            keyword = keywords
        else:
            raise ValueError("Không có keyword nào được cấu hình")

        log.info(
            f"[Task #{task_id}] Keyword SEO: '{keyword}' → tìm {target_domain} "
            f"(tối đa {max_search_page} trang)"
        )

        context = await create_context()
        page = await create_page(context)
        start = time.time()

        try:
            result = await self._search_and_click(
                page=page,
                task_id=task_id,
                keyword=keyword,
                target_domain=target_domain,
                search_engine=search_engine,
                max_search_page=max_search_page,
                min_time=min_time,
                max_time=max_time,
                do_click_internal=do_click_internal,
                max_internal=max_internal,
            )
            result["total_time"] = int(time.time() - start)
            return result

        finally:
            await page.close()
            await context.close()

    async def _search_and_click(
        self, page, task_id, keyword, target_domain, search_engine,
        max_search_page, min_time, max_time, do_click_internal, max_internal
    ) -> dict:
        # Mở Google
        google_url = f"https://www.{search_engine}"
        await page.goto(google_url, wait_until="domcontentloaded", timeout=30000)
        await human_delay(1.0, 3.0)

        # Xử lý consent popup (Google EU)
        try:
            consent = page.locator('button:has-text("Accept all"), button:has-text("Chấp nhận")')
            if await consent.count() > 0:
                await consent.first.click()
                await human_delay(1.0, 2.0)
        except Exception:
            pass

        # Gõ keyword vào ô tìm kiếm
        search_selector = 'textarea[name="q"], input[name="q"]'
        await human_type(page, search_selector, keyword)

        # Nhấn Enter
        await page.keyboard.press("Enter")
        await page.wait_for_load_state("domcontentloaded", timeout=15000)
        await human_delay(2.0, 4.0)

        # Tìm trên từng trang kết quả
        found = False
        clicked_url = ""
        search_result_rank = 0
        search_page_found = 0
        pages_scrolled = 0

        for page_num in range(1, max_search_page + 1):
            pages_scrolled = page_num
            log.info(f"[Task #{task_id}] Đang tìm trên trang {page_num}...")

            # Cuộn tự nhiên qua kết quả
            await human_scroll(page, "natural")
            await human_delay(1.0, 3.0)

            # Tìm link chứa target_domain
            result_links = await page.evaluate("""
                (targetDomain) => {
                    const results = [];
                    const items = document.querySelectorAll('#search a[href], #rso a[href]');
                    items.forEach((a, index) => {
                        const href = a.href;
                        if (href && href.includes(targetDomain) &&
                            !href.includes('google.') &&
                            a.offsetParent !== null) {
                            // Lấy bounding rect để scroll tới
                            const rect = a.getBoundingClientRect();
                            results.push({
                                href: href,
                                index: index,
                                top: rect.top + window.scrollY,
                                text: a.textContent?.substring(0, 100) || ''
                            });
                        }
                    });
                    return results;
                }
            """, target_domain)

            if result_links:
                # Tìm thấy! Click vào kết quả đầu tiên
                target_link = result_links[0]
                clicked_url = target_link["href"]
                search_result_rank = (page_num - 1) * 10 + target_link["index"] + 1
                search_page_found = page_num

                log.info(
                    f"[Task #{task_id}] Tìm thấy '{target_domain}' ở vị trí ~{search_result_rank} "
                    f"(trang {page_num})"
                )

                # Cuộn đến kết quả
                await page.evaluate(
                    f"window.scrollTo({{top: {target_link['top'] - 200}, behavior: 'smooth'}})"
                )
                await human_delay(1.0, 3.0)

                # Di chuột và click
                await human_mouse_move(page)

                # Click bằng cách tìm lại element
                try:
                    link_el = page.locator(f'a[href="{clicked_url}"]').first
                    await link_el.click(timeout=10000)
                except Exception:
                    # Fallback: navigate trực tiếp
                    await page.goto(clicked_url, wait_until="domcontentloaded", timeout=30000)

                found = True
                break

            # Không tìm thấy trên trang này, sang trang tiếp
            if page_num < max_search_page:
                next_clicked = await self._click_next_page(page)
                if not next_clicked:
                    log.info(f"[Task #{task_id}] Không tìm thấy nút 'Trang tiếp theo'")
                    break
                await human_delay(2.0, 5.0)

        if found:
            # Đã click vào target - tương tác tự nhiên trên trang
            await page.wait_for_load_state("domcontentloaded", timeout=30000)
            await human_delay(1.0, 3.0)

            actual_url = page.url
            pages_visited = 1
            time_on_pages = []
            page_start = time.time()

            # Tương tác trên trang target
            await human_mouse_move(page)
            await human_scroll(page, "natural")

            stay_time = random.randint(min_time, max_time)
            main_stay = random.randint(min_time // 2, min_time)
            await human_delay(main_stay, main_stay + 5)
            time_on_pages.append(int(time.time() - page_start))

            # Click link nội bộ
            internal_clicks = []
            if do_click_internal and max_internal > 0:
                clicked_count = await click_internal_links(page, max_internal)
                pages_visited += clicked_count

            # Đợi thêm cho đủ thời gian
            elapsed_on_site = time.time() - page_start
            remaining = stay_time - elapsed_on_site
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

            total_time_on_site = int(time.time() - page_start)

            log.info(
                f"[Task #{task_id}] Hoàn thành: keyword='{keyword}', "
                f"tìm thấy trang {search_page_found}, {pages_visited} trang, "
                f"{total_time_on_site}s trên site"
            )

            return {
                "actual_url_visited": actual_url,
                "keyword": keyword,
                "clicked": True,
                "search_result_rank": search_result_rank,
                "search_page_found": search_page_found,
                "pages_visited": pages_visited,
                "internal_clicks": internal_clicks,
                "time_on_each_page": time_on_pages,
                "time_on_site": total_time_on_site,
                "scroll_depth": round(scroll_depth, 2),
                "pages_searched": pages_scrolled,
            }

        else:
            # Không tìm thấy target
            log.info(
                f"[Task #{task_id}] Không tìm thấy '{target_domain}' "
                f"cho keyword '{keyword}' (đã tìm {pages_scrolled} trang)"
            )

            return {
                "actual_url_visited": "",
                "keyword": keyword,
                "clicked": False,
                "search_result_rank": 0,
                "search_page_found": 0,
                "pages_visited": 0,
                "internal_clicks": [],
                "time_on_each_page": [],
                "time_on_site": 0,
                "scroll_depth": 0,
                "pages_searched": pages_scrolled,
            }

    async def _click_next_page(self, page) -> bool:
        """Click nút 'Trang tiếp theo' trên Google."""
        try:
            # Google "Next" button
            next_btn = page.locator('a#pnnext, a[aria-label="Next"], a:has-text("Trang tiếp theo"), a:has-text("Next")')
            if await next_btn.count() > 0:
                await next_btn.first.click()
                await page.wait_for_load_state("domcontentloaded", timeout=15000)
                return True
        except Exception:
            pass
        return False
