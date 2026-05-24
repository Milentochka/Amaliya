"""Convert all HEIC files in frontend/public/family/ to JPG and update DB rows.

Chrome/Firefox can't render .heic — they show a blank image, making the
projector slideshow look like a black screen. Run this once after a big
HEIC upload from an iPhone.
"""
import asyncio
import sys
from pathlib import Path

import asyncpg
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()

LOCAL_URL = "postgresql://milenazakharova@127.0.0.1:5432/amaliya_local"
MEDIA_DIR = Path(
    "/Users/milenazakharova/amalia_dr/frontend/public/family"
)


async def main():
    db = await asyncpg.connect(LOCAL_URL)
    rows = await db.fetch(
        "SELECT id, filename FROM family_media "
        "WHERE filename ILIKE '%.heic' ORDER BY id"
    )
    print(f"Found {len(rows)} HEIC rows to convert.")
    converted = skipped = errors = 0
    for r in rows:
        old_name: str = r["filename"]
        old_path = MEDIA_DIR / old_name
        new_name = old_name.rsplit(".", 1)[0] + ".jpg"
        new_path = MEDIA_DIR / new_name
        if not old_path.exists():
            print(f"  skip (missing): {old_name}")
            skipped += 1
            continue
        if new_path.exists():
            print(f"  already converted: {new_name}")
        else:
            try:
                img = Image.open(old_path)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                img.save(new_path, "JPEG", quality=88, optimize=True)
                print(f"  converted: {old_name} → {new_name}")
            except Exception as e:
                print(f"  ERROR {old_name}: {e}")
                errors += 1
                continue
        await db.execute(
            "UPDATE family_media SET filename = $1 WHERE id = $2",
            new_name,
            r["id"],
        )
        try:
            old_path.unlink()
        except OSError:
            pass
        converted += 1
    await db.close()
    print(f"\nDone. converted={converted} skipped={skipped} errors={errors}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"FATAL: {e}", file=sys.stderr)
        sys.exit(1)
