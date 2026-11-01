#!/usr/bin/env python3
"""Save stitch download_file JSON (html or base64 image) to disk."""
import argparse
import base64
import json
import sys
from pathlib import Path


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("json_path", type=Path)
    p.add_argument("out_path", type=Path)
    args = p.parse_args()
    raw = args.json_path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if "html" in data:
        args.out_path.write_text(data["html"], encoding="utf-8")
        print(f"html {args.out_path} {len(data['html'])} chars")
        return
    if "image" in data:
        img_b64 = data["image"]
        if isinstance(img_b64, str) and img_b64.startswith("data:"):
            img_b64 = img_b64.split(",", 1)[1]
        blob = base64.b64decode(img_b64)
        args.out_path.write_bytes(blob)
        meta = data.get("image_metadata", {})
        print(
            f"image {args.out_path} {len(blob)} bytes "
            f"{meta.get('width')}x{meta.get('height')} {meta.get('mime_type')}"
        )
        return
    print("unknown payload keys:", list(data.keys()), file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
