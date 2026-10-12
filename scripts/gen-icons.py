"""Gera os ícones da extensão: um cravo vermelho estilizado sobre fundo escuro."""
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

BG = (24, 20, 22, 255)
RED = (214, 40, 40, 255)
DARK_RED = (150, 20, 30, 255)
GREEN = (46, 160, 67, 255)


def draw(size: int) -> Image.Image:
    s = size * 4  # supersampling
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s // 5, fill=BG)
    cx, cy = s / 2, s * 0.42
    # caule e folha
    d.line([(cx, cy), (cx, s * 0.9)], fill=GREEN, width=max(2, s // 16))
    d.ellipse([cx, s * 0.62, cx + s * 0.22, s * 0.72], fill=GREEN)
    # pétalas
    for i in range(8):
        a = i * math.pi / 4
        px, py = cx + math.cos(a) * s * 0.17, cy + math.sin(a) * s * 0.17
        r = s * 0.14
        d.ellipse([px - r, py - r, px + r, py + r], fill=RED if i % 2 else DARK_RED)
    r = s * 0.12
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=RED)
    return img.resize((size, size), Image.LANCZOS)


for size in (16, 32, 48, 128):
    draw(size).save(OUT / f"icon-{size}.png")
print("ícones gerados em", OUT)
