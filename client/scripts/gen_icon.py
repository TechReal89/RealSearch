"""Generate RealSearch app icon (magnifying glass + crown)."""
import os
from PIL import Image, ImageDraw


def create_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    r = size // 2 - 2
    gold = (212, 168, 75, 255)
    gold_light = (240, 215, 140, 255)
    dark = (15, 15, 22, 255)
    bg = (9, 9, 13, 255)

    # Background circle
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg, outline=gold, width=max(1, size // 20))

    # Crown
    cw = int(r * 0.45)
    ch = int(r * 0.25)
    ctop = cy - int(r * 0.6)
    draw.polygon([
        (cx - cw, ctop + ch),
        (cx - cw, ctop + ch // 3),
        (cx - cw // 2, ctop + ch * 2 // 3),
        (cx, ctop),
        (cx + cw // 2, ctop + ch * 2 // 3),
        (cx + cw, ctop + ch // 3),
        (cx + cw, ctop + ch),
    ], fill=gold)

    if size >= 32:
        gr = max(1, size // 50)
        for off in [-cw // 2, 0, cw // 2]:
            draw.ellipse([cx + off - gr, ctop + ch * 2 // 3 - gr,
                          cx + off + gr, ctop + ch * 2 // 3 + gr], fill=gold_light)

    # Magnifying glass
    gcx = cx - int(r * 0.08)
    gcy = cy + int(r * 0.05)
    gr = int(r * 0.32)
    lw = max(2, size // 14)
    draw.ellipse([gcx - gr, gcy - gr, gcx + gr, gcy + gr], fill=dark, outline=gold, width=lw)

    # Handle
    hx1 = gcx + int(gr * 0.65)
    hy1 = gcy + int(gr * 0.65)
    hx2 = cx + int(r * 0.6)
    hy2 = cy + int(r * 0.6)
    draw.line([hx1, hy1, hx2, hy2], fill=gold, width=lw + max(1, size // 20))

    return img


def main():
    out = os.path.join(os.path.dirname(__file__), "..", "assets", "icon.ico")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    sizes = [256, 48, 32, 16]
    imgs = [create_icon(s) for s in sizes]
    imgs[0].save(out, format="ICO", append_images=imgs[1:])
    print(f"Icon generated: {out} ({os.path.getsize(out)} bytes)")


if __name__ == "__main__":
    main()
