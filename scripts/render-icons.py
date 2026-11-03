"""Rasterize the It Works mark to the PNG sizes the home screen needs.

No third-party image library: the mark is a gradient field, a four-point star
and a small spark. Maskable icons keep that artwork inside the safe circle and
paint the gradient to the edges.
"""
from pathlib import Path
import struct
import zlib

START = (0x81, 0x76, 0xEA)
END = (0x4C, 0x43, 0xA8)
SPARK = (0xDD, 0xD7, 0xFF)
STAR = (
    (96, 25), (111, 73), (159, 88), (111, 103),
    (96, 151), (81, 103), (33, 88), (81, 73),
)


def scale_point(x, y, content_scale):
    return 96 + (x - 96) * content_scale, 96 + (y - 96) * content_scale


def inside_polygon(x, y, polygon):
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        if (yi > y) != (yj > y):
            cross = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < cross:
                inside = not inside
        j = i
    return inside


def sample(x, y, size, content_scale):
    t = (x + y) / (2 * (size - 1))
    red = round(START[0] + (END[0] - START[0]) * t)
    green = round(START[1] + (END[1] - START[1]) * t)
    blue = round(START[2] + (END[2] - START[2]) * t)
    dx = x / size * 192
    dy = y / size * 192
    star = tuple(scale_point(px, py, content_scale) for px, py in STAR)
    if inside_polygon(dx, dy, star):
        return (255, 255, 255, 255)
    cx, cy = scale_point(144, 143, content_scale)
    if (dx - cx) ** 2 + (dy - cy) ** 2 <= (9 * content_scale) ** 2:
        return (*SPARK, 255)
    return (red, green, blue, 255)


def write_png(path, size, content_scale):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            acc = [0, 0, 0, 0]
            for oy in (0.25, 0.75):
                for ox in (0.25, 0.75):
                    pixel = sample(x + ox, y + oy, size, content_scale)
                    for i, channel in enumerate(pixel):
                        acc[i] += channel
            raw.extend(round(channel / 4) for channel in acc)
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    Path(path).write_bytes(png)


def main():
    root = Path(__file__).resolve().parents[1] / "icons"
    # Full-bleed, with the star inset so the iOS rounded mask does not clip it.
    write_png(root / "apple-touch-icon.png", 180, 0.80)
    write_png(root / "icon-192.png", 192, 0.80)
    write_png(root / "icon-512.png", 512, 0.80)
    # Maskable icons need the artwork inside the center safe circle.
    write_png(root / "icon-maskable-192.png", 192, 0.62)
    write_png(root / "icon-maskable-512.png", 512, 0.62)


if __name__ == "__main__":
    main()
