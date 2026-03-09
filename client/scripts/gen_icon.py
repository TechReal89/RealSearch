"""Generate RealSearch app icon - matching SVG logo style.

Crown + magnifying glass with gold gradient on dark background.
Matches the web Logo component (logo.tsx) design.
"""
import os
from PIL import Image, ImageDraw


# Gold palette (matching globals.css)
GOLD = (212, 168, 75)
GOLD_DARK = (184, 134, 11)
GOLD_LIGHT = (240, 215, 140)
GOLD_BRIGHT = (255, 245, 212)
BG = (9, 9, 13)
BG_CARD = (17, 17, 24)


def lerp_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def create_icon(size: int) -> Image.Image:
    """Create icon matching the SVG logo.tsx design."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size  # shorthand
    cx, cy = s // 2, s // 2

    # === Background rounded square ===
    pad = max(1, s // 32)
    r_bg = s // 6  # corner radius
    draw.rounded_rectangle(
        [pad, pad, s - pad - 1, s - pad - 1],
        radius=r_bg, fill=BG, outline=GOLD_DARK,
        width=max(1, s // 32),
    )

    # === Crown (top area, matching SVG path) ===
    # SVG crown is at translate(12,2), path "M4 16 L8 6 L14 12 L20 4 L26 12 L32 6 L36 16"
    # Normalized to 0-64 viewport, crown spans x:16-48, y:2-20
    def sx(x):
        return int(x / 64 * s)

    def sy(y):
        return int(y / 64 * s)

    crown_pts = [
        (sx(16), sy(20)),   # bottom-left  (4+12, 16+2)
        (sx(20), sy(8)),    # left spike   (8+12, 6+2)
        (sx(26), sy(14)),   # left valley  (14+12, 12+2)
        (sx(32), sy(6)),    # center spike (20+12, 4+2)
        (sx(38), sy(14)),   # right valley (26+12, 12+2)
        (sx(44), sy(8)),    # right spike  (32+12, 6+2)
        (sx(48), sy(20)),   # bottom-right (36+12, 16+2)
    ]
    draw.polygon(crown_pts, fill=GOLD)

    # Crown band (rect x:16 y:16 w:32 h:4)
    draw.rectangle([sx(16), sy(16), sx(48), sy(20)], fill=GOLD)

    # Crown jewels
    if s >= 32:
        jr = max(1, s // 40)
        for jx, jy in [(sx(26), sy(13)), (sx(32), sy(9)), (sx(38), sy(13))]:
            draw.ellipse([jx - jr, jy - jr, jx + jr, jy + jr], fill=GOLD_BRIGHT)

    # === Magnifying Glass (matching SVG: cx=28, cy=34, r=14) ===
    glass_cx = sx(28)
    glass_cy = sy(34)
    glass_r = sx(14)
    lw = max(2, s // 16)  # stroke width ~4/64 of size

    # Outer circle (stroke)
    draw.ellipse(
        [glass_cx - glass_r, glass_cy - glass_r,
         glass_cx + glass_r, glass_cy + glass_r],
        fill=BG_CARD, outline=GOLD, width=lw,
    )

    # Inner subtle fill
    inner_r = glass_r - lw
    if inner_r > 2:
        draw.ellipse(
            [glass_cx - inner_r, glass_cy - inner_r,
             glass_cx + inner_r, glass_cy + inner_r],
            fill=(15, 15, 20),
        )

    # Glass shine arc (top-left area)
    if s >= 48:
        shine_r = glass_r // 2
        offset = glass_r // 3
        draw.arc(
            [glass_cx - shine_r - offset, glass_cy - shine_r - offset,
             glass_cx + shine_r - offset, glass_cy + shine_r - offset],
            200, 320, fill=GOLD_LIGHT, width=max(1, lw // 3),
        )

    # === Handle (matching SVG: x1=38,y1=44 to x2=52,y2=58) ===
    handle_w = max(3, s // 12)  # strokeWidth ~5/64
    draw.line(
        [sx(38), sy(44), sx(52), sy(58)],
        fill=GOLD, width=handle_w,
    )
    # Handle end cap
    cap_r = handle_w // 2 + 1
    draw.ellipse(
        [sx(52) - cap_r, sy(58) - cap_r,
         sx(52) + cap_r, sy(58) + cap_r],
        fill=GOLD,
    )
    # Handle highlight
    if s >= 32:
        draw.line(
            [sx(39), sy(43), sx(50), sy(55)],
            fill=GOLD_LIGHT, width=max(1, handle_w // 4),
        )

    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "assets")
    os.makedirs(out_dir, exist_ok=True)
    ico_path = os.path.join(out_dir, "icon.ico")

    # Tạo icon với các kích thước chuẩn Windows
    sizes = [256, 48, 32, 16]
    imgs = [create_icon(s) for s in sizes]

    # Lưu ICO với sizes parameter rõ ràng - tương thích tốt với Windows shortcut
    imgs[0].save(
        ico_path,
        format="ICO",
        append_images=imgs[1:],
        sizes=[(s, s) for s in sizes],
    )
    print(f"Icon saved: {ico_path} ({os.path.getsize(ico_path)} bytes)")


if __name__ == "__main__":
    main()
