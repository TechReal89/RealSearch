"""Backlink executor - tạo backlink trên các trang web mục tiêu."""
import random
import time

from src.browser.humanizer import human_delay, human_mouse_move, human_scroll
from src.browser.manager import create_context, create_page
from src.jobs.base import BaseJobExecutor
from src.jobs.keyword_seo import human_type
from src.utils.logger import log


class BacklinkExecutor(BaseJobExecutor):
    job_type = "backlink"

    async def execute(self, task_data: dict) -> dict:
        task_id = task_data["task_id"]
        cfg = task_data.get("config", {})

        target_url = cfg.get("target_url", "")
        anchor_texts = cfg.get("anchor_texts", [])
        target_sites = cfg.get("target_sites", [])
        backlink_type = cfg.get("backlink_type", "directory")

        if not target_url:
            raise ValueError("Không có target_url")

        # Chọn anchor text ngẫu nhiên
        anchor_text = random.choice(anchor_texts) if anchor_texts else target_url

        # Chọn site mục tiêu ngẫu nhiên
        if not target_sites:
            raise ValueError("Không có target_sites để tạo backlink")
        site = random.choice(target_sites)

        log.info(
            f"[Task #{task_id}] Backlink: tạo link '{anchor_text}' → {target_url} "
            f"trên {site} (type={backlink_type})"
        )

        context = await create_context()
        page = await create_page(context)
        start = time.time()

        try:
            result = await self._create_backlink(
                page=page,
                task_id=task_id,
                target_url=target_url,
                anchor_text=anchor_text,
                site=site,
                backlink_type=backlink_type,
            )
            result["total_time"] = int(time.time() - start)
            return result
        finally:
            await page.close()
            await context.close()

    async def _create_backlink(
        self, page, task_id, target_url, anchor_text, site, backlink_type
    ) -> dict:
        # Truy cập trang tạo backlink
        try:
            await page.goto(site, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            log.warning(f"[Task #{task_id}] Không mở được {site}: {e}")
            return {
                "actual_url_visited": site,
                "backlink_created": False,
                "target_url": target_url,
                "anchor_text": anchor_text,
                "site": site,
                "backlink_type": backlink_type,
                "error": str(e),
                "pages_visited": 1,
                "scroll_depth": 0,
            }

        await human_delay(2.0, 4.0)
        await human_mouse_move(page)
        await human_scroll(page, "natural")

        # Tìm form submit (phụ thuộc vào loại site)
        form_found = False
        if backlink_type == "directory":
            form_found = await self._fill_directory_form(
                page, task_id, target_url, anchor_text
            )
        elif backlink_type == "comment":
            form_found = await self._fill_comment_form(
                page, task_id, target_url, anchor_text
            )
        elif backlink_type == "forum":
            form_found = await self._fill_forum_form(
                page, task_id, target_url, anchor_text
            )

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

        log.info(
            f"[Task #{task_id}] Backlink {'thành công' if form_found else 'thất bại'}: "
            f"{site}"
        )

        return {
            "actual_url_visited": page.url,
            "backlink_created": form_found,
            "target_url": target_url,
            "anchor_text": anchor_text,
            "site": site,
            "backlink_type": backlink_type,
            "pages_visited": 1,
            "scroll_depth": round(scroll_depth, 2),
        }

    async def _fill_directory_form(self, page, task_id, url, anchor) -> bool:
        """Tìm và điền form submit website trên directory."""
        try:
            # Tìm input URL
            url_input = page.locator(
                'input[name*="url" i], input[name*="link" i], '
                'input[name*="website" i], input[placeholder*="URL" i], '
                'input[type="url"]'
            )
            if await url_input.count() > 0:
                await url_input.first.click()
                await human_delay(0.3, 0.8)
                await url_input.first.fill(url)
                await human_delay(0.5, 1.0)

            # Tìm input title/name
            title_input = page.locator(
                'input[name*="title" i], input[name*="name" i], '
                'input[name*="site" i], input[placeholder*="title" i]'
            )
            if await title_input.count() > 0:
                await title_input.first.click()
                await human_delay(0.3, 0.8)
                await title_input.first.fill(anchor)
                await human_delay(0.5, 1.0)

            # Tìm textarea description
            desc_input = page.locator(
                'textarea[name*="desc" i], textarea[name*="content" i], textarea'
            )
            if await desc_input.count() > 0:
                await desc_input.first.click()
                await human_delay(0.3, 0.8)
                await desc_input.first.fill(
                    f"{anchor} - Trang web hữu ích với nhiều thông tin chất lượng."
                )
                await human_delay(0.5, 1.0)

            # Tìm và click submit
            submit_btn = page.locator(
                'button[type="submit"], input[type="submit"], '
                'button:has-text("Submit"), button:has-text("Add"), '
                'button:has-text("Gửi")'
            )
            if await submit_btn.count() > 0:
                await human_delay(1.0, 2.0)
                await submit_btn.first.click()
                await human_delay(2.0, 4.0)
                return True

        except Exception as e:
            log.warning(f"[Task #{task_id}] Lỗi điền form directory: {e}")

        return False

    async def _fill_comment_form(self, page, task_id, url, anchor) -> bool:
        """Tìm và điền comment form."""
        try:
            # Comment textarea
            comment = page.locator(
                'textarea[name*="comment" i], textarea#comment, '
                'textarea[placeholder*="comment" i], textarea'
            )
            if await comment.count() == 0:
                return False

            await comment.first.click()
            await human_delay(0.5, 1.0)
            await comment.first.fill(
                f"Bài viết rất hữu ích! Tham khảo thêm tại {url}"
            )
            await human_delay(0.5, 1.0)

            # URL field
            url_field = page.locator(
                'input[name*="url" i], input[name*="website" i], input[type="url"]'
            )
            if await url_field.count() > 0:
                await url_field.first.fill(url)
                await human_delay(0.3, 0.8)

            # Name field
            name_field = page.locator('input[name*="author" i], input[name*="name" i]')
            if await name_field.count() > 0:
                await name_field.first.fill(anchor)
                await human_delay(0.3, 0.8)

            # Submit
            submit_btn = page.locator(
                'button[type="submit"], input[type="submit"], '
                'button:has-text("Post"), button:has-text("Gửi")'
            )
            if await submit_btn.count() > 0:
                await human_delay(1.0, 2.0)
                await submit_btn.first.click()
                await human_delay(2.0, 4.0)
                return True

        except Exception as e:
            log.warning(f"[Task #{task_id}] Lỗi điền comment form: {e}")

        return False

    async def _fill_forum_form(self, page, task_id, url, anchor) -> bool:
        """Tìm và điền forum reply form."""
        try:
            # Reply textarea
            reply = page.locator(
                'textarea[name*="message" i], textarea[name*="body" i], '
                'textarea[name*="reply" i], textarea'
            )
            if await reply.count() == 0:
                return False

            await reply.first.click()
            await human_delay(0.5, 1.0)
            await reply.first.fill(
                f"Cảm ơn bạn đã chia sẻ! Mình cũng tìm thấy trang này rất hữu ích: {url}"
            )
            await human_delay(0.5, 1.0)

            # Submit
            submit_btn = page.locator(
                'button[type="submit"], input[type="submit"], '
                'button:has-text("Post"), button:has-text("Reply"), '
                'button:has-text("Gửi")'
            )
            if await submit_btn.count() > 0:
                await human_delay(1.0, 2.0)
                await submit_btn.first.click()
                await human_delay(2.0, 4.0)
                return True

        except Exception as e:
            log.warning(f"[Task #{task_id}] Lỗi điền forum form: {e}")

        return False
