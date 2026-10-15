#!/usr/bin/env python3
"""
Generate high-resolution logo and social preview banner for AgentWildFire.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_logo():
    width, height = 1200, 630
    img = Image.new("RGBA", (width, height), (10, 13, 20, 255)) # warroom-900
    draw = ImageDraw.Draw(img)

    # Gradient background / aura
    for i in range(300, 0, -5):
        alpha = int(35 * (1 - i / 300))
        draw.ellipse(
            [600 - i * 1.5, 315 - i, 600 + i * 1.5, 315 + i],
            fill=(249, 115, 22, alpha) # plasma orange
        )

    # Flame icon center graphic
    cx, cy = 600, 240
    # Outer flame
    flame_coords = [
        (cx, cy - 90),
        (cx + 45, cy - 20),
        (cx + 70, cy + 30),
        (cx + 50, cy + 80),
        (cx, cy + 100),
        (cx - 50, cy + 80),
        (cx - 70, cy + 30),
        (cx - 45, cy - 20),
    ]
    draw.polygon(flame_coords, fill=(239, 68, 68, 255)) # flame red

    # Inner core
    inner_flame = [
        (cx, cy - 50),
        (cx + 25, cy),
        (cx + 35, cy + 40),
        (cx, cy + 70),
        (cx - 35, cy + 40),
        (cx - 25, cy),
    ]
    draw.polygon(inner_flame, fill=(249, 115, 22, 255)) # plasma orange

    # Innermost spark
    spark = [
        (cx, cy - 10),
        (cx + 12, cy + 20),
        (cx, cy + 45),
        (cx - 12, cy + 20),
    ]
    draw.polygon(spark, fill=(254, 215, 170, 255)) # warm yellow/white

    # Orbit ring
    draw.arc([cx - 130, cy - 60, cx + 130, cy + 80], start=190, end=350, fill=(6, 182, 212, 220), width=3)
    draw.arc([cx - 130, cy - 60, cx + 130, cy + 80], start=10, end=170, fill=(6, 182, 212, 100), width=2)
    # Satellite dot
    draw.ellipse([cx + 120, cy - 5, cx + 136, cy + 11], fill=(6, 182, 212, 255))

    # Text
    draw.text((600, 390), "AgentWildFire", fill=(255, 255, 255, 255), anchor="mm")
    draw.text((600, 440), "Autonomous Satellite Wildfire Detection & Parametric Disaster Relief Escrow", fill=(203, 213, 225, 255), anchor="mm")
    draw.text((600, 480), "Powered by GenLayer Intelligent Contracts & Earth Observation Oracles", fill=(249, 115, 22, 255), anchor="mm")
    draw.text((600, 540), "STUDIONET (CHAIN ID: 61999) • NASA FIRMS • SENTINEL-3 • COPERNICUS EMS", fill=(148, 163, 184, 255), anchor="mm")

    out_path = Path(__file__).parent.parent / "logo.png"
    img.save(out_path, "PNG")
    print(f"[+] Saved logo to {out_path}")


if __name__ == "__main__":
    create_logo()
