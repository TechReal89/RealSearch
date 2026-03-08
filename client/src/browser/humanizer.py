"""Human-like behavior simulation."""
import asyncio
import random


async def human_delay(min_s=0.5, max_s=2.0):
    """Delay ngẫu nhiên giống người thật."""
    await asyncio.sleep(random.uniform(min_s, max_s))


async def human_scroll(page, scroll_behavior="natural"):
    """Cuộn trang giống người thật."""
    if scroll_behavior == "none":
        return

    viewport_height = await page.evaluate("window.innerHeight")
    total_height = await page.evaluate("document.body.scrollHeight")

    if total_height <= viewport_height:
        return

    if scroll_behavior == "full":
        max_scroll = total_height
    else:
        # Natural: cuộn 40-80% trang
        max_scroll = int(total_height * random.uniform(0.4, 0.8))

    current = 0
    while current < max_scroll:
        step = random.randint(100, 400)
        current += step
        await page.evaluate(f"window.scrollTo({{top: {current}, behavior: 'smooth'}})")
        await asyncio.sleep(random.uniform(0.3, 1.5))

        # Đôi khi cuộn ngược lên một chút
        if random.random() < 0.15:
            back = random.randint(50, 150)
            current -= back
            await page.evaluate(
                f"window.scrollTo({{top: {max(0, current)}, behavior: 'smooth'}})"
            )
            await asyncio.sleep(random.uniform(0.5, 1.0))


async def human_mouse_move(page):
    """Di chuyển chuột ngẫu nhiên."""
    try:
        viewport = await page.evaluate(
            "({w: window.innerWidth, h: window.innerHeight})"
        )
        x = random.randint(100, viewport["w"] - 100)
        y = random.randint(100, viewport["h"] - 100)
        await page.mouse.move(x, y)
        await human_delay(0.2, 0.5)
    except Exception:
        pass


async def click_internal_links(page, max_clicks=3):
    """Click các link nội bộ trên trang."""
    clicked = 0
    try:
        links = await page.evaluate("""
            () => {
                const origin = window.location.origin;
                return Array.from(document.querySelectorAll('a[href]'))
                    .filter(a => a.href.startsWith(origin) && a.offsetParent !== null)
                    .map(a => a.href)
                    .slice(0, 10);
            }
        """)

        random.shuffle(links)

        for link in links[:max_clicks]:
            if clicked >= max_clicks:
                break
            try:
                await human_delay(1.0, 3.0)
                await page.goto(link, wait_until="domcontentloaded", timeout=15000)
                await human_delay(2.0, 5.0)
                await human_scroll(page, "natural")
                clicked += 1
            except Exception:
                continue

    except Exception:
        pass

    return clicked
