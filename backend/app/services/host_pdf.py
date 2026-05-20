"""PDF generation for host blanks (Contest 1, Contest 4)."""

import io
import math
import random
from pathlib import Path
from typing import List

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Contest1Trait, Contest1VoteTally
from app.services.contests import (
    contest1_overview,
    contest3_all_promises_for_pdf,
    contest4_all_zodiacs_for_pdf,
    contest4_traits_for_pdf,
)


_BASE = Path(__file__).resolve().parent.parent
_FONT_DIR = _BASE / "fonts"
# Photos shipped inside the backend container; mirrors frontend/public/contests/contest1
# so the same files are available both for the projector UI and for PDF rendering.
_PHOTO_DIR = _BASE / "contests" / "contest1"
_FONT_REGULAR = "Comfortaa"
_FONT_BOLD = "Comfortaa-Bold"  # imitated via fill+stroke render mode
_fonts_registered = False

# Site palette (mirrors frontend tailwind.config.ts).
COLOR_CREAM_50 = HexColor("#fdfaf5")
COLOR_CREAM_200 = HexColor("#f4e8d4")
COLOR_CREAM_300 = HexColor("#ecdac0")
COLOR_BLUSH_200 = HexColor("#f5d8cb")
COLOR_BLUSH_300 = HexColor("#ecc1b0")
COLOR_BLUSH_500 = HexColor("#c4897a")
COLOR_BLUSH_600 = HexColor("#a86f60")
COLOR_MOCHA_400 = HexColor("#a08e80")
COLOR_MOCHA_500 = HexColor("#7d6c5f")
COLOR_MOCHA_700 = HexColor("#574a40")
COLOR_MOCHA_900 = HexColor("#3b322c")


def _ensure_fonts() -> None:
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont(_FONT_REGULAR, str(_FONT_DIR / "Comfortaa.ttf")))
    # Same TTF — "bold" is drawn via setTextRenderMode(2) (fill + stroke).
    pdfmetrics.registerFont(TTFont(_FONT_BOLD, str(_FONT_DIR / "Comfortaa.ttf")))
    _fonts_registered = True


def _set_regular(c: canvas.Canvas, size: float, color=COLOR_MOCHA_900) -> None:
    c.setFont(_FONT_REGULAR, size)
    c.setFillColor(color)
    c.setStrokeColor(color)


def _draw_bold(c: canvas.Canvas, x: float, y: float, text: str, size: float, color=COLOR_MOCHA_900) -> None:
    """Imitate bold by overlaying the glyph with a tiny offset."""
    c.setFont(_FONT_REGULAR, size)
    c.setFillColor(color)
    c.drawString(x, y, text)
    c.drawString(x + 0.25, y, text)
    c.drawString(x, y + 0.15, text)


def _draw_bold_centred(c: canvas.Canvas, x: float, y: float, text: str, size: float, color=COLOR_MOCHA_900) -> None:
    c.setFont(_FONT_REGULAR, size)
    c.setFillColor(color)
    c.drawCentredString(x, y, text)
    c.drawCentredString(x + 0.25, y, text)
    c.drawCentredString(x, y + 0.15, text)


# -------- Little decorative motifs in site palette --------


def _draw_heart(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Plump little heart (bottom-pointing) centered at (cx, cy)."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    r = size / 2.4
    c.circle(cx - r * 0.7, cy + r * 0.4, r, stroke=0, fill=1)
    c.circle(cx + r * 0.7, cy + r * 0.4, r, stroke=0, fill=1)
    p = c.beginPath()
    p.moveTo(cx - r * 1.65, cy + r * 0.55)
    p.lineTo(cx + r * 1.65, cy + r * 0.55)
    p.lineTo(cx, cy - r * 1.8)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def _draw_bow(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Ribbon bow — two angled loops meeting at a round knot, with curly tails."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    s = size

    # Left loop: ellipse rotated outward by 20°, inner edge at the knot.
    c.saveState()
    c.translate(cx - s * 0.55, cy)
    c.rotate(20)
    c.ellipse(-s * 0.55, -s * 0.4, s * 0.55, s * 0.4, stroke=0, fill=1)
    c.restoreState()

    # Right loop: mirrored.
    c.saveState()
    c.translate(cx + s * 0.55, cy)
    c.rotate(-20)
    c.ellipse(-s * 0.55, -s * 0.4, s * 0.55, s * 0.4, stroke=0, fill=1)
    c.restoreState()

    # Centre knot — small circle on top of the meeting point.
    c.circle(cx, cy, s * 0.24, stroke=0, fill=1)

    # Curly tails dropping from below the knot.
    c.setLineWidth(0.9)
    c.line(cx - s * 0.12, cy - s * 0.20, cx - s * 0.32, cy - s * 1.05)
    c.line(cx + s * 0.12, cy - s * 0.20, cx + s * 0.32, cy - s * 1.05)


def _draw_balloon(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Little balloon — circle body with a tiny string."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    # Body (slightly oval, taller than wide)
    c.ellipse(cx - size * 0.55, cy - size * 0.5, cx + size * 0.55, cy + size * 0.65, stroke=0, fill=1)
    # String
    c.setLineWidth(0.6)
    c.line(cx, cy - size * 0.5, cx + size * 0.15, cy - size * 1.4)


def _draw_dot(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Plain little ball / dot."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    c.circle(cx, cy, size * 0.5, stroke=0, fill=1)


def _draw_cloud(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Three overlapping circles forming a fluffy cloud."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    r1 = size * 0.42
    r2 = size * 0.55
    r3 = size * 0.40
    c.circle(cx - size * 0.55, cy, r1, stroke=0, fill=1)
    c.circle(cx, cy + size * 0.10, r2, stroke=0, fill=1)
    c.circle(cx + size * 0.55, cy, r3, stroke=0, fill=1)


def _draw_star5(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """5-point star."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    p = c.beginPath()
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = size if i % 2 == 0 else size * 0.42
        px = cx + r * math.cos(angle)
        py = cy + r * math.sin(angle)
        if i == 0:
            p.moveTo(px, py)
        else:
            p.lineTo(px, py)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def _draw_flower(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """5-petal flower: five circles around a central dot."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    petal_r = size * 0.38
    ring_r = size * 0.45
    for i in range(5):
        angle = math.pi / 2 + i * 2 * math.pi / 5
        px = cx + ring_r * math.cos(angle)
        py = cy + ring_r * math.sin(angle)
        c.circle(px, py, petal_r, stroke=0, fill=1)
    # Centre
    c.circle(cx, cy, size * 0.22, stroke=0, fill=1)


def _draw_crown(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """Tiny three-peak crown."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    s = size
    p = c.beginPath()
    p.moveTo(cx - s * 0.9, cy - s * 0.45)
    p.lineTo(cx - s * 0.9, cy)
    p.lineTo(cx - s * 0.55, cy + s * 0.55)
    p.lineTo(cx - s * 0.25, cy + s * 0.15)
    p.lineTo(cx, cy + s * 0.7)
    p.lineTo(cx + s * 0.25, cy + s * 0.15)
    p.lineTo(cx + s * 0.55, cy + s * 0.55)
    p.lineTo(cx + s * 0.9, cy)
    p.lineTo(cx + s * 0.9, cy - s * 0.45)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    # Three peak gems
    c.circle(cx - s * 0.55, cy + s * 0.55, s * 0.12, stroke=0, fill=1)
    c.circle(cx, cy + s * 0.7, s * 0.14, stroke=0, fill=1)
    c.circle(cx + s * 0.55, cy + s * 0.55, s * 0.12, stroke=0, fill=1)


def _draw_sparkle(c: canvas.Canvas, cx: float, cy: float, size: float, color) -> None:
    """4-point star ✦ made of two crossed thin ellipses."""
    c.setFillColor(color)
    c.setStrokeColor(color)
    thin = size * 0.18
    c.ellipse(cx - thin, cy - size, cx + thin, cy + size, stroke=0, fill=1)
    c.ellipse(cx - size, cy - thin, cx + size, cy + thin, stroke=0, fill=1)


def _draw_angel(c: canvas.Canvas, cx: float, cy: float, size: float, color, halo_color) -> None:
    """Tiny cherub: round head, two wing arcs, halo dot."""
    head_r = size * 0.35
    c.setFillColor(color)
    c.setStrokeColor(color)
    # Head
    c.circle(cx, cy, head_r, stroke=0, fill=1)
    # Wings — two ellipses on the sides, slightly tilted
    wing_w = size * 0.55
    wing_h = size * 0.32
    c.saveState()
    c.translate(cx - head_r * 0.6, cy)
    c.rotate(15)
    c.ellipse(-wing_w, -wing_h, 0, wing_h, stroke=0, fill=1)
    c.restoreState()
    c.saveState()
    c.translate(cx + head_r * 0.6, cy)
    c.rotate(-15)
    c.ellipse(0, -wing_h, wing_w, wing_h, stroke=0, fill=1)
    c.restoreState()
    # Halo
    c.setStrokeColor(halo_color)
    c.setFillColor(HexColor("#ffffff"))
    c.setLineWidth(0.7)
    c.ellipse(
        cx - head_r * 0.7,
        cy + head_r * 0.9,
        cx + head_r * 0.7,
        cy + head_r * 1.25,
        stroke=1,
        fill=0,
    )


_MOTIF_KINDS = [
    ("heart", 3.0 * mm, COLOR_BLUSH_200),
    ("heart", 3.4 * mm, COLOR_BLUSH_200),
    ("bow", 3.6 * mm, COLOR_BLUSH_200),
    ("balloon", 3.4 * mm, COLOR_BLUSH_200),
    ("cloud", 4.0 * mm, COLOR_CREAM_200),
    ("cloud", 4.6 * mm, COLOR_CREAM_200),
    ("flower", 2.8 * mm, COLOR_BLUSH_200),
    ("star5", 2.4 * mm, COLOR_BLUSH_300),
    ("star5", 2.0 * mm, COLOR_BLUSH_200),
    ("crown", 2.6 * mm, COLOR_BLUSH_300),
    ("sparkle", 1.8 * mm, COLOR_BLUSH_300),
]


def _draw_one_motif(c, kind, size, color):
    if kind == "heart":
        _draw_heart(c, 0, 0, size, color)
    elif kind == "bow":
        _draw_bow(c, 0, 0, size, color)
    elif kind == "balloon":
        _draw_balloon(c, 0, 0, size, color)
    elif kind == "cloud":
        _draw_cloud(c, 0, 0, size, color)
    elif kind == "flower":
        _draw_flower(c, 0, 0, size, color)
    elif kind == "star5":
        _draw_star5(c, 0, 0, size, color)
    elif kind == "crown":
        _draw_crown(c, 0, 0, size, color)
    elif kind == "dot":
        _draw_dot(c, 0, 0, size, color)
    else:
        _draw_sparkle(c, 0, 0, size, color)


def _scatter_confetti(
    c: canvas.Canvas,
    x0: float,
    y0: float,
    w: float,
    h: float,
    seed: int = 99,
) -> None:
    """Thin layer of tiny dots — confetti — on top of the main scatter.
    Roughly one dot per 200 mm²."""
    rng = random.Random(seed)
    count = max(20, int((w / mm) * (h / mm) / 200))
    c.saveState()
    c.setFillAlpha(0.22)
    c.setStrokeAlpha(0)
    palette = [COLOR_BLUSH_200, COLOR_BLUSH_300, COLOR_CREAM_300]
    for _ in range(count):
        cx = x0 + rng.random() * w
        cy = y0 + rng.random() * h
        r = rng.uniform(0.4, 0.9) * mm
        c.setFillColor(rng.choice(palette))
        c.circle(cx, cy, r, stroke=0, fill=1)
    c.restoreState()


def _scatter_motifs_in(
    c: canvas.Canvas,
    x0: float,
    y0: float,
    w: float,
    h: float,
    target_count: int,
    seed: int = 17,
) -> None:
    """Even, organic scatter via a jittered grid: split the area into
    roughly target_count cells, drop one motif per cell at a small random
    offset from the cell centre. Mixes kinds + rotations from a shuffled
    bag so the result is varied but balanced."""
    rng = random.Random(seed)
    aspect = w / h if h > 0 else 1
    cols = max(1, int(round(math.sqrt(target_count * aspect))))
    rows = max(1, int(round(target_count / cols)))
    cell_w = w / cols
    cell_h = h / rows
    margin = 3 * mm

    # Pre-shuffle a bag of motif slots so adjacent cells aren't identical.
    bag = []
    while len(bag) < cols * rows:
        bag.extend(_MOTIF_KINDS)
    rng.shuffle(bag)

    c.saveState()
    c.setFillAlpha(0.22)
    c.setStrokeAlpha(0.22)

    for r in range(rows):
        for col in range(cols):
            i = r * cols + col
            # Position inside the cell with mild jitter (centred around 0.5).
            jitter_x = (rng.random() - 0.5) * 0.5
            jitter_y = (rng.random() - 0.5) * 0.5
            cx = x0 + (col + 0.5 + jitter_x) * cell_w
            cy = y0 + (r + 0.5 + jitter_y) * cell_h
            # Clamp inside the inner margin
            cx = min(max(cx, x0 + margin), x0 + w - margin)
            cy = min(max(cy, y0 + margin), y0 + h - margin)

            kind, size, color = bag[i]
            angle = rng.uniform(-25, 25)
            c.saveState()
            c.translate(cx, cy)
            c.rotate(angle)
            _draw_one_motif(c, kind, size, color)
            c.restoreState()

    c.restoreState()


def _scatter_motifs(c: canvas.Canvas, width: float, height: float) -> None:
    """Page-wide soft baby-girl pattern: confetti dots + scattered motifs."""
    area_mm2 = (width / mm) * (height / mm)
    _scatter_confetti(c, 0, 0, width, height)
    count = max(16, int(area_mm2 / 700))
    _scatter_motifs_in(c, 0, 0, width, height, target_count=count)


def _draw_photo(
    c: canvas.Canvas,
    filename: str,
    cx: float,
    cy: float,
    w: float,
    h: float,
    caption: str,
    angle: float = 0,
) -> None:
    """Draw one photo with caption underneath, rotated around its center (cx, cy).
    Image is enclosed in a soft rounded frame."""
    path = _PHOTO_DIR / filename
    c.saveState()
    c.translate(cx, cy)
    c.rotate(angle)
    radius = 4 * mm
    # Soft cream backdrop (a touch larger than the image for a "polaroid" feel)
    pad = 2 * mm
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(COLOR_CREAM_300)
    c.setLineWidth(0.6)
    c.roundRect(
        -w / 2 - pad,
        -h / 2 - pad - 5 * mm,
        w + 2 * pad,
        h + 2 * pad + 5 * mm,
        radius,
        stroke=1,
        fill=1,
    )
    if path.exists():
        try:
            img = ImageReader(str(path))
            iw, ih = img.getSize()
            ratio = min(w / iw, h / ih)
            dw, dh = iw * ratio, ih * ratio
            c.drawImage(
                img,
                -dw / 2,
                -dh / 2,
                dw,
                dh,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            c.rect(-w / 2, -h / 2, w, h, stroke=1, fill=0)
    else:
        c.rect(-w / 2, -h / 2, w, h, stroke=1, fill=0)
    _set_regular(c, 8, COLOR_MOCHA_500)
    c.drawCentredString(0, -h / 2 - 3.5 * mm, caption)
    c.restoreState()


async def build_contest1_pdf(session: AsyncSession) -> bytes:
    """One A4 page: title, photo collage, then 16 traits × 4 checkboxes."""
    _ensure_fonts()

    traits = (
        await session.execute(
            select(Contest1Trait).order_by(Contest1Trait.order_index)
        )
    ).scalars().all()

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # Background — cream wash like the site
    c.setFillColor(COLOR_CREAM_50)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    _scatter_motifs(c, width, height)

    # Title — blush accent on the second word, like the H1s on site
    _draw_bold(c, 20 * mm, height - 20 * mm, "На кого похожа ", 22, COLOR_MOCHA_900)
    title_w = c.stringWidth("На кого похожа ", _FONT_REGULAR, 22)
    _draw_bold(c, 20 * mm + title_w, height - 20 * mm, "Амалия?", 22, COLOR_BLUSH_600)

    _set_regular(c, 10, COLOR_MOCHA_500)
    c.drawString(
        20 * mm,
        height - 28 * mm,
        "Отметьте по каждой черте — на кого больше похожа малышка.",
    )

    # Photo collage: mom-young | Amalia (center) | dad-young — large, tilted.
    # Then parents-now centered below.
    row_y = height - 60 * mm
    side_w, side_h = 38 * mm, 48 * mm
    center_w, center_h = 44 * mm, 54 * mm
    gap = 8 * mm
    center_x = width / 2
    _draw_photo(
        c,
        "mom-young.jpg",
        center_x - (center_w / 2 + gap + side_w / 2),
        row_y,
        side_w,
        side_h,
        "мама в детстве",
        angle=8,
    )
    _draw_photo(
        c,
        "amalia.jpg",
        center_x,
        row_y,
        center_w,
        center_h,
        "Амалия",
        angle=0,
    )
    _draw_photo(
        c,
        "dad-young.jpg",
        center_x + (center_w / 2 + gap + side_w / 2),
        row_y,
        side_w,
        side_h,
        "папа в детстве",
        angle=-8,
    )
    parents_y = row_y - center_h / 2 - 22 * mm
    _draw_photo(
        c,
        "parents-now.jpg",
        center_x,
        parents_y,
        52 * mm,
        30 * mm,
        "мама и папа сейчас",
        angle=-3,
    )

    # Guest-name line below the collage
    name_y = parents_y - 25 * mm
    _set_regular(c, 10, COLOR_MOCHA_500)
    c.drawString(20 * mm, name_y, "Имя гостя:")
    c.setStrokeColor(COLOR_CREAM_300)
    c.setLineWidth(0.6)
    c.line(
        20 * mm + 22 * mm,
        name_y - 1 * mm,
        20 * mm + 92 * mm,
        name_y - 1 * mm,
    )

    # Table card — rounded background like cards on the site
    table_x = 18 * mm
    table_w = width - 36 * mm
    table_top = name_y - 10 * mm
    table_bottom = 22 * mm
    table_h = table_top - table_bottom
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.6)
    c.roundRect(table_x, table_bottom, table_w, table_h, 6 * mm, stroke=1, fill=1)

    # Column headers
    col_x = [95 * mm, 115 * mm, 135 * mm, 165 * mm]
    headers = ["мама", "папа", "родственник", "уникально"]
    y = table_top - 8 * mm
    _set_regular(c, 8, COLOR_MOCHA_400)  # uppercase tracker-style header
    c.drawString(24 * mm, y, "ЧЕРТА")
    for i, h in enumerate(headers):
        c.drawString(col_x[i], y, h.upper())
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.6)
    c.line(table_x + 6 * mm, y - 3 * mm, table_x + table_w - 6 * mm, y - 3 * mm)

    # Rows
    box = 4.2 * mm
    row_h = 7 * mm
    start_y = y - 9 * mm
    for i, t in enumerate(traits):
        ry = start_y - i * row_h
        # alternating row tint
        if i % 2 == 0:
            c.setFillColor(COLOR_CREAM_50)
            c.setStrokeColor(COLOR_CREAM_50)
            c.roundRect(
                table_x + 4 * mm,
                ry - 2.5 * mm,
                table_w - 8 * mm,
                row_h - 1 * mm,
                2 * mm,
                stroke=0,
                fill=1,
            )
        _set_regular(c, 10, COLOR_MOCHA_900)
        c.drawString(24 * mm, ry, f"{t.order_index}.  {t.name}")
        c.setStrokeColor(COLOR_MOCHA_400)
        c.setFillColor(HexColor("#ffffff"))
        c.setLineWidth(0.7)
        for x in col_x:
            c.roundRect(x, ry - 1 * mm, box, box, 1 * mm, stroke=1, fill=1)
        # Underline for "родственник" name
        c.setStrokeColor(COLOR_CREAM_300)
        c.setLineWidth(0.5)
        c.line(
            col_x[2] + box + 1.5 * mm,
            ry - 1 * mm,
            col_x[3] - 2 * mm,
            ry - 1 * mm,
        )

    # Footer
    _set_regular(c, 9, COLOR_MOCHA_500)
    c.drawCentredString(width / 2, 13 * mm, "Спасибо! Передайте бланк ведущему.")

    c.showPage()
    c.save()
    return buf.getvalue()


async def build_contest1_results_pdf(session: AsyncSession) -> bytes:
    """Results summary blank — for paper confirmation after counting.

    If counts are already entered in the system, prints the actual numbers
    next to each trait. If counts are zero (counting in progress / not yet
    started), prints empty fields the host can fill in by hand."""
    _ensure_fonts()

    data = await contest1_overview(session)
    traits = data["traits"]
    summary = data["summary"]
    any_data = any(
        t["votes_mom"] + t["votes_dad"] + t["votes_unique"] + sum(r["count"] for r in t["votes_relatives"])
        for t in traits
    )

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # Background
    c.setFillColor(COLOR_CREAM_50)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    _scatter_motifs(c, width, height)

    # Title
    _draw_bold(c, 20 * mm, height - 20 * mm, "Итоги конкурса ", 22, COLOR_MOCHA_900)
    title_w = c.stringWidth("Итоги конкурса ", _FONT_REGULAR, 22)
    _draw_bold(c, 20 * mm + title_w, height - 20 * mm, "«На кого похожа»", 22, COLOR_BLUSH_600)
    _set_regular(c, 10, COLOR_MOCHA_500)
    subtitle = (
        "Сводка для бумажного подтверждения."
        if any_data
        else "Распечатайте, посчитайте по бумажным бланкам и впишите цифры."
    )
    c.drawString(20 * mm, height - 28 * mm, subtitle)

    # Compact photo strip centered under the title
    photo_y = height - 55 * mm
    side_w, side_h = 24 * mm, 30 * mm
    center_w, center_h = 28 * mm, 34 * mm
    gap = 6 * mm
    cx = width / 2
    _draw_photo(
        c,
        "mom-young.jpg",
        cx - (center_w / 2 + gap + side_w / 2),
        photo_y,
        side_w,
        side_h,
        "мама",
        angle=6,
    )
    _draw_photo(c, "amalia.jpg", cx, photo_y, center_w, center_h, "Амалия", angle=0)
    _draw_photo(
        c,
        "dad-young.jpg",
        cx + (center_w / 2 + gap + side_w / 2),
        photo_y,
        side_w,
        side_h,
        "папа",
        angle=-6,
    )

    # Results table card
    table_x = 18 * mm
    table_w = width - 36 * mm
    table_top = photo_y - center_h / 2 - 14 * mm
    table_bottom = 60 * mm
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.6)
    c.roundRect(
        table_x,
        table_bottom,
        table_w,
        table_top - table_bottom,
        6 * mm,
        stroke=1,
        fill=1,
    )

    # Column positions (numbers fit in narrow columns)
    col_mom_x = 95 * mm
    col_dad_x = 113 * mm
    col_rel_x = 131 * mm
    col_uniq_x = 168 * mm
    y = table_top - 8 * mm
    _set_regular(c, 8, COLOR_MOCHA_400)
    c.drawString(24 * mm, y, "ЧЕРТА")
    c.drawString(col_mom_x, y, "МАМА")
    c.drawString(col_dad_x, y, "ПАПА")
    c.drawString(col_rel_x, y, "РОДСТВЕННИКИ")
    c.drawString(col_uniq_x, y, "УНИКАЛЬНО")
    c.setStrokeColor(COLOR_CREAM_200)
    c.line(table_x + 6 * mm, y - 3 * mm, table_x + table_w - 6 * mm, y - 3 * mm)

    row_h = 7 * mm
    start_y = y - 9 * mm
    for i, t in enumerate(traits):
        ry = start_y - i * row_h
        if i % 2 == 0:
            c.setFillColor(COLOR_CREAM_50)
            c.roundRect(
                table_x + 4 * mm,
                ry - 2.5 * mm,
                table_w - 8 * mm,
                row_h - 1 * mm,
                2 * mm,
                stroke=0,
                fill=1,
            )
        _set_regular(c, 10, COLOR_MOCHA_900)
        c.drawString(24 * mm, ry, f"{t['order_index']}.  {t['name']}")

        # Numbers (or empty boxes if data not entered yet)
        for cx, value in (
            (col_mom_x, t["votes_mom"]),
            (col_dad_x, t["votes_dad"]),
            (col_uniq_x, t["votes_unique"]),
        ):
            if any_data:
                _set_regular(c, 11, COLOR_MOCHA_900)
                c.drawString(cx + 1 * mm, ry, str(value))
            else:
                c.setStrokeColor(COLOR_CREAM_300)
                c.setLineWidth(0.5)
                c.line(cx, ry - 1 * mm, cx + 10 * mm, ry - 1 * mm)

        # Relatives — list of "name × count"
        rel_text = (
            ", ".join(f"{r['name']} ({r['count']})" for r in t["votes_relatives"])
            if t["votes_relatives"]
            else ("—" if any_data else "")
        )
        if rel_text:
            _set_regular(c, 9, COLOR_MOCHA_700 if any_data else COLOR_MOCHA_400)
            c.drawString(col_rel_x, ry, rel_text[:30])
        else:
            c.setStrokeColor(COLOR_CREAM_300)
            c.setLineWidth(0.5)
            c.line(col_rel_x, ry - 1 * mm, col_rel_x + 32 * mm, ry - 1 * mm)

    # Verdict card at the bottom
    verdict_top = 52 * mm
    c.setFillColor(HexColor("#fbe8e0"))  # blush-100
    c.setStrokeColor(COLOR_BLUSH_500)
    c.setLineWidth(0.8)
    c.roundRect(18 * mm, 18 * mm, width - 36 * mm, verdict_top - 18 * mm, 6 * mm, stroke=1, fill=1)

    _set_regular(c, 9, COLOR_BLUSH_600)
    c.drawString(26 * mm, verdict_top - 8 * mm, "ИТОГ КОНКУРСА")

    if any_data and summary["verdict"]:
        _draw_bold(c, 26 * mm, verdict_top - 18 * mm, summary["verdict"], 18, COLOR_BLUSH_600)
        totals = summary["totals"]
        breakdown = (
            f"мама: {totals['mom']}   ·   папа: {totals['dad']}   ·   "
            f"родственники: {totals['relatives']}   ·   уникально: {totals['unique']}"
        )
        _set_regular(c, 9, COLOR_MOCHA_500)
        c.drawString(26 * mm, verdict_top - 26 * mm, breakdown)
    else:
        _draw_bold(
            c, 26 * mm, verdict_top - 18 * mm, "____________________________", 14, COLOR_BLUSH_600
        )
        _set_regular(c, 8, COLOR_MOCHA_400)
        c.drawString(
            26 * mm,
            verdict_top - 24 * mm,
            "Заполните после подсчёта одним из вариантов:",
        )
        c.drawString(
            26 * mm,
            verdict_top - 28 * mm,
            "«Мама фейс»   ·   «Папа фейс»   ·   «Сама уникальность»   ·   «В кого-то из родни — имя».",
        )

    # Signature area
    _set_regular(c, 8, COLOR_MOCHA_400)
    c.drawString(20 * mm, 12 * mm, "Подпись ведущего: ________________________")
    c.drawString(width - 80 * mm, 12 * mm, "Дата: ________________")

    c.showPage()
    c.save()
    return buf.getvalue()


def _wrap_lines_by_width(
    c: canvas.Canvas,
    text: str,
    font: str,
    size: float,
    max_width: float,
) -> List[str]:
    """Word-wrap measured against the real font metrics."""
    words = text.split()
    lines: List[str] = []
    cur = ""
    for w in words:
        candidate = w if not cur else cur + " " + w
        if c.stringWidth(candidate, font, size) <= max_width:
            cur = candidate
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


async def build_contest3_cards_pdf(session: AsyncSession) -> bytes:
    """All 50 promises laid out as 5×2 cards per A4 page with dashed cut
    lines. Designed for paper cutting + manual handout if the host prefers
    the analog variant over the digital random assignment."""
    _ensure_fonts()
    promises = await contest3_all_promises_for_pdf(session)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    cols, rows = 2, 5
    per_page = cols * rows
    margin_x = 12 * mm
    margin_y = 14 * mm
    card_w = (width - 2 * margin_x) / cols
    card_h = (height - 2 * margin_y) / rows

    for idx, text in enumerate(promises):
        slot = idx % per_page
        if slot == 0:
            if idx > 0:
                c.showPage()
            c.setFillColor(COLOR_CREAM_50)
            c.rect(0, 0, width, height, stroke=0, fill=1)
            _scatter_motifs(c, width, height)
            # Page-level dashed grid (cut guides)
            c.setStrokeColor(COLOR_CREAM_300)
            c.setLineWidth(0.4)
            c.setDash(2, 3)
            for r in range(1, rows):
                y = margin_y + r * card_h
                c.line(margin_x, y, width - margin_x, y)
            for col in range(1, cols):
                x = margin_x + col * card_w
                c.line(x, margin_y, x, height - margin_y)
            # Outer cut frame
            c.rect(
                margin_x,
                margin_y,
                width - 2 * margin_x,
                height - 2 * margin_y,
                stroke=1,
                fill=0,
            )
            c.setDash()

        col = slot % cols
        row = slot // cols
        x = margin_x + col * card_w
        y = height - margin_y - (row + 1) * card_h  # bottom-left of card

        # Soft card body
        pad = 4 * mm
        c.setFillColor(HexColor("#ffffff"))
        c.setStrokeColor(COLOR_CREAM_200)
        c.setLineWidth(0.5)
        c.roundRect(
            x + pad,
            y + pad,
            card_w - 2 * pad,
            card_h - 2 * pad,
            5 * mm,
            stroke=1,
            fill=1,
        )

        # Header pill: «обещаю №X»
        _set_regular(c, 8, COLOR_BLUSH_600)
        c.drawString(
            x + pad + 5 * mm,
            y + card_h - pad - 6 * mm,
            f"ОБЕЩАНИЕ № {idx + 1}",
        )

        # Promise text — wrap by real width
        text_x = x + pad + 5 * mm
        text_w = card_w - 2 * pad - 10 * mm
        font_size = 12
        wrapped = _wrap_lines_by_width(c, text, _FONT_REGULAR, font_size, text_w)
        # If too tall, drop a size
        if len(wrapped) > 4:
            font_size = 10
            wrapped = _wrap_lines_by_width(c, text, _FONT_REGULAR, font_size, text_w)
        line_y = y + card_h - pad - 13 * mm
        _set_regular(c, font_size, COLOR_MOCHA_900)
        for line in wrapped:
            c.drawString(text_x, line_y, line)
            line_y -= font_size * 1.3  # pt-based line height

        # Tiny footer signature line
        _set_regular(c, 7, COLOR_MOCHA_400)
        c.drawString(
            x + pad + 5 * mm,
            y + pad + 4 * mm,
            "— Амалии, с любовью",
        )

    c.showPage()
    c.save()
    return buf.getvalue()


def _render_zodiac_blank(c: canvas.Canvas, z: dict) -> None:
    """Render one A4 page for one zodiac sign."""
    width, height = A4

    c.setFillColor(COLOR_CREAM_50)
    c.rect(0, 0, width, height, stroke=0, fill=1)
    _scatter_motifs(c, width, height)

    # Title — big centered name (skip zodiac glyph; not in Comfortaa subset)
    _set_regular(c, 9, COLOR_BLUSH_600)
    c.drawCentredString(width / 2, height - 22 * mm, "ЗНАК ЗОДИАКА")
    _draw_bold_centred(
        c,
        width / 2,
        height - 34 * mm,
        z["name"],
        36,
        COLOR_MOCHA_900,
    )

    _set_regular(c, 10, COLOR_MOCHA_500)
    c.drawCentredString(
        width / 2,
        height - 44 * mm,
        "Выберите две черты, которые хотите передать Амалии.",
    )

    # Card with traits
    card_x = 18 * mm
    card_w = width - 36 * mm
    card_top = height - 50 * mm
    card_bottom = 28 * mm
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.6)
    c.roundRect(
        card_x,
        card_bottom,
        card_w,
        card_top - card_bottom,
        6 * mm,
        stroke=1,
        fill=1,
    )

    # Five guest-name lines so multiple guests of the same sign can share one sheet
    _set_regular(c, 9, COLOR_BLUSH_600)
    c.drawString(card_x + 8 * mm, card_top - 10 * mm, "ГОСТИ")
    name_x = card_x + 8 * mm
    name_top_y = card_top - 17 * mm
    name_line_h = 6 * mm
    for i in range(5):
        ry = name_top_y - i * name_line_h
        _set_regular(c, 10, COLOR_MOCHA_500)
        c.drawString(name_x, ry, f"№{i + 1}.")
        c.setStrokeColor(COLOR_CREAM_300)
        c.setLineWidth(0.5)
        c.line(
            name_x + 9 * mm,
            ry - 1 * mm,
            card_x + card_w - 8 * mm,
            ry - 1 * mm,
        )

    # Divider before traits
    traits_top = name_top_y - 5 * name_line_h - 4 * mm
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.6)
    c.line(card_x + 8 * mm, traits_top, card_x + card_w - 8 * mm, traits_top)

    # Column header for the 5 guest checkboxes
    box = 5 * mm
    col_count = 5
    col_gap = 1.5 * mm
    cols_total_w = col_count * box + (col_count - 1) * col_gap
    cols_right_x = card_x + card_w - 8 * mm
    cols_left_x = cols_right_x - cols_total_w

    _set_regular(c, 7, COLOR_MOCHA_400)
    header_y = traits_top - 5 * mm
    for ci in range(col_count):
        cx = cols_left_x + ci * (box + col_gap) + box / 2
        c.drawCentredString(cx, header_y, f"№{ci + 1}")
    _set_regular(c, 7, COLOR_MOCHA_400)
    c.drawString(card_x + 8 * mm, header_y, "ЧЕРТА")

    # 10 traits with 5 checkboxes each
    row_h = 9 * mm
    start_y = header_y - 6 * mm
    for i, trait in enumerate(z["traits"]):
        ry = start_y - i * row_h
        if i % 2 == 0:
            c.setFillColor(COLOR_CREAM_50)
            c.setStrokeColor(COLOR_CREAM_50)
            c.roundRect(
                card_x + 6 * mm,
                ry - 2.5 * mm,
                card_w - 12 * mm,
                row_h - 1 * mm,
                2 * mm,
                stroke=0,
                fill=1,
            )
        # Trait text
        _set_regular(c, 11, COLOR_MOCHA_900)
        c.drawString(card_x + 12 * mm, ry + 0.5 * mm, f"{i + 1}.  {trait}")
        # 5 checkboxes
        c.setStrokeColor(COLOR_MOCHA_400)
        c.setFillColor(HexColor("#ffffff"))
        c.setLineWidth(0.7)
        for ci in range(col_count):
            cx = cols_left_x + ci * (box + col_gap)
            c.roundRect(cx, ry - 1 * mm, box, box, 1 * mm, stroke=1, fill=1)

    _set_regular(c, 8, COLOR_MOCHA_500)
    c.drawCentredString(width / 2, 16 * mm, "Спасибо! Передайте бланк ведущему.")


async def build_contest4_blank_pdf(
    session: AsyncSession, *, zodiac_key: str
):
    _ensure_fonts()
    z = await contest4_traits_for_pdf(session, zodiac_key)
    if z is None:
        return None
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    _render_zodiac_blank(c, z)
    c.showPage()
    c.save()
    return buf.getvalue()


async def build_contest4_all_blanks_pdf(session: AsyncSession) -> bytes:
    _ensure_fonts()
    zodiacs = await contest4_all_zodiacs_for_pdf(session)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    for z in zodiacs:
        _render_zodiac_blank(c, z)
        c.showPage()
    c.save()
    return buf.getvalue()


# -------- Thank-you cards (printable A6 × 4 per A4) --------


_THANKYOU_DIR = _BASE / "contests" / "thankyou"


def _render_thank_you_card(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    """One A6 thank-you card at (x, y) with width w, height h (bottom-left origin)."""
    # Cream backdrop
    c.setFillColor(COLOR_CREAM_50)
    c.rect(x, y, w, h, stroke=0, fill=1)
    # Translucent baby-girl pattern: confetti + motifs, local to each card.
    card_seed = int((x + y) * 7) % 1000
    area_mm2 = (w / mm) * (h / mm)
    _scatter_confetti(c, x, y, w, h, seed=card_seed + 5)
    _scatter_motifs_in(c, x, y, w, h, target_count=max(14, int(area_mm2 / 550)), seed=card_seed)
    # Soft border
    c.setStrokeColor(COLOR_CREAM_300)
    c.setLineWidth(0.6)
    c.roundRect(x + 3 * mm, y + 3 * mm, w - 6 * mm, h - 6 * mm, 4 * mm, stroke=1, fill=0)

    # Photo (top — landscape framing to fit a family portrait)
    photo_w = 78 * mm
    photo_h = 50 * mm
    photo_x = x + (w - photo_w) / 2
    photo_y = y + h - 10 * mm - photo_h
    photo_path = None
    if _THANKYOU_DIR.exists():
        for p in sorted(_THANKYOU_DIR.iterdir()):
            if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                photo_path = p
                break
    # White polaroid frame
    c.setFillColor(HexColor("#ffffff"))
    c.setStrokeColor(COLOR_CREAM_200)
    c.setLineWidth(0.5)
    c.roundRect(
        photo_x - 2 * mm,
        photo_y - 2 * mm,
        photo_w + 4 * mm,
        photo_h + 4 * mm,
        3 * mm,
        stroke=1,
        fill=1,
    )
    if photo_path is not None:
        try:
            img = ImageReader(str(photo_path))
            iw, ih = img.getSize()
            ratio = max(photo_w / iw, photo_h / ih)  # cover crop
            dw, dh = iw * ratio, ih * ratio
            c.saveState()
            # Clip to photo box
            p = c.beginPath()
            p.rect(photo_x, photo_y, photo_w, photo_h)
            c.clipPath(p, stroke=0, fill=0)
            c.drawImage(
                img,
                photo_x + (photo_w - dw) / 2,
                photo_y + (photo_h - dh) / 2,
                dw,
                dh,
                preserveAspectRatio=True,
                mask="auto",
            )
            c.restoreState()
        except Exception:
            pass

    # Text below photo — placed so the gap above (photo→text) equals the
    # gap below (text→card bottom).
    text_top = photo_y - 18 * mm
    text_x = x + 10 * mm
    text_w = w - 20 * mm

    _draw_bold_centred(
        c,
        x + w / 2,
        text_top,
        "Дорогие гости!",
        15,
        COLOR_BLUSH_600,
    )

    body_lines = [
        "Спасибо, что были с нами",
        "в этот тёплый день.",
        "",
        "Каждая ваша улыбка теперь —",
        "часть первого года Амалии.",
    ]
    line_y = text_top - 8 * mm
    _set_regular(c, 11, COLOR_MOCHA_700)
    for line in body_lines:
        c.drawCentredString(x + w / 2, line_y, line)
        line_y -= 5 * mm

    # Signature
    line_y -= 3 * mm
    _set_regular(c, 10, COLOR_MOCHA_500)
    c.drawCentredString(x + w / 2, line_y, "С любовью,")
    line_y -= 5 * mm
    _set_regular(c, 12, COLOR_MOCHA_900)
    c.drawCentredString(x + w / 2, line_y, "семья Матасянц")
    line_y -= 5.5 * mm
    _set_regular(c, 10, COLOR_BLUSH_600)
    c.drawCentredString(x + w / 2, line_y, "Микаел, Милена и Амалия")


async def build_thank_you_cards_pdf() -> bytes:
    """A4 sheet with 4× A6 thank-you cards (2 × 2 grid) and dashed cut lines."""
    _ensure_fonts()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4  # 210 × 297
    card_w = width / 2  # 105 mm
    card_h = height / 2  # 148.5 mm

    # Outer dashed cut frame
    c.setStrokeColor(COLOR_CREAM_300)
    c.setLineWidth(0.4)
    c.setDash(2, 3)
    c.line(0, height / 2, width, height / 2)
    c.line(width / 2, 0, width / 2, height)
    c.setDash()

    for row in range(2):
        for col in range(2):
            x = col * card_w
            y = height - (row + 1) * card_h
            _render_thank_you_card(c, x, y, card_w, card_h)

    c.showPage()
    c.save()
    return buf.getvalue()


