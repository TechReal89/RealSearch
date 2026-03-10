"""Human-like behavior simulation."""
import asyncio
import math
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


def _bezier_point(t: float, p0: float, p1: float, p2: float) -> float:
    """Calculate point on quadratic Bezier curve at parameter t."""
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2


async def human_mouse_move(page, target_x: int | None = None, target_y: int | None = None):
    """Di chuyển chuột theo đường cong Bezier (tự nhiên hơn linear)."""
    try:
        viewport = await page.evaluate(
            "({w: window.innerWidth, h: window.innerHeight})"
        )

        # Starting position (roughly center-ish with randomness)
        start_x = random.randint(100, viewport["w"] // 2)
        start_y = random.randint(100, viewport["h"] // 2)

        # Target position
        if target_x is None:
            target_x = random.randint(100, viewport["w"] - 100)
        if target_y is None:
            target_y = random.randint(100, viewport["h"] - 100)

        # Control point for Bezier curve (random offset for natural curve)
        ctrl_x = (start_x + target_x) / 2 + random.randint(-150, 150)
        ctrl_y = (start_y + target_y) / 2 + random.randint(-150, 150)

        # Number of steps based on distance
        dist = math.sqrt((target_x - start_x) ** 2 + (target_y - start_y) ** 2)
        steps = max(10, min(25, int(dist / 30)))

        for i in range(steps + 1):
            t = i / steps
            # Ease-in-out timing
            t_eased = t * t * (3 - 2 * t)
            x = _bezier_point(t_eased, start_x, ctrl_x, target_x)
            y = _bezier_point(t_eased, start_y, ctrl_y, target_y)
            await page.mouse.move(x, y)
            await asyncio.sleep(random.uniform(0.01, 0.03))

        # 15% chance of overshoot then correct
        if random.random() < 0.15:
            overshoot_x = target_x + random.randint(-20, 20)
            overshoot_y = target_y + random.randint(-20, 20)
            await page.mouse.move(overshoot_x, overshoot_y)
            await asyncio.sleep(random.uniform(0.05, 0.15))
            await page.mouse.move(target_x, target_y)

        await human_delay(0.1, 0.3)
    except Exception:
        pass


async def micro_movements(page, duration: float = 2.0):
    """Micro jitter khi 'đọc' nội dung - di chuột nhẹ 1-3px."""
    try:
        viewport = await page.evaluate(
            "({w: window.innerWidth, h: window.innerHeight})"
        )
        base_x = random.randint(200, viewport["w"] - 200)
        base_y = random.randint(200, viewport["h"] - 200)

        elapsed = 0
        while elapsed < duration:
            jitter_x = base_x + random.randint(-3, 3)
            jitter_y = base_y + random.randint(-3, 3)
            await page.mouse.move(jitter_x, jitter_y)
            wait = random.uniform(0.3, 0.8)
            await asyncio.sleep(wait)
            elapsed += wait
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
