#!/usr/bin/env python3
"""
Generate test images for QA testing using PIL.
Creates various test images in the backend/test-assets directory.
"""

import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("PIL not installed. Install with: pip install Pillow")
    sys.exit(1)

# Directory setup
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
TEST_ASSETS_DIR = os.path.join(BACKEND_DIR, "test-assets")

os.makedirs(TEST_ASSETS_DIR, exist_ok=True)


def create_test_image(
    filename, width, height, bg_color, text, text_color="white", format="JPEG"
):
    """Create a test image with text"""
    filepath = os.path.join(TEST_ASSETS_DIR, filename)

    # Create image
    img = Image.new("RGB", (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use a system font, fall back to default
    try:
        # Try common system fonts
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/SFNSDisplay.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
        font = None
        font_size = min(width, height) // 10

        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    font = ImageFont.truetype(font_path, font_size)
                    break
                except:
                    continue

        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Center text
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2

    # Draw text with shadow for visibility
    draw.text((x + 2, y + 2), text, fill="black", font=font)
    draw.text((x, y), text, fill=text_color, font=font)

    # Save
    if format == "JPEG":
        img.save(filepath, "JPEG", quality=85)
    elif format == "PNG":
        img.save(filepath, "PNG")
    elif format == "GIF":
        img.save(filepath, "GIF")

    size_kb = os.path.getsize(filepath) // 1024
    print(f"Created: {filename} ({width}x{height}, {size_kb}KB)")
    return filepath


def create_large_image(filename, target_size_mb=11):
    """Create a large image for size limit testing"""
    filepath = os.path.join(TEST_ASSETS_DIR, filename)

    # Calculate dimensions for target size
    # Approximate: RGB image = 3 bytes per pixel
    # With JPEG compression, estimate 10:1 ratio for photographic content
    target_bytes = target_size_mb * 1024 * 1024

    # Start with a reasonable size and increase
    size = 1500
    while True:
        # Create image with noise for less compressibility
        img = Image.new("RGB", (size, size))
        pixels = img.load()

        import random

        for i in range(size):
            for j in range(size):
                # Create varied colors for less compression
                r = random.randint(0, 255)
                g = random.randint(0, 255)
                b = random.randint(0, 255)
                pixels[i, j] = (r, g, b)

        # Save with high quality
        img.save(filepath, "JPEG", quality=95)

        actual_size = os.path.getsize(filepath)
        actual_mb = actual_size / (1024 * 1024)

        if actual_mb >= target_size_mb or size >= 4000:
            print(f"Created: {filename} ({size}x{size}, {actual_mb:.1f}MB)")
            break

        size += 500


def create_text_file(filename, content):
    """Create a text file"""
    filepath = os.path.join(TEST_ASSETS_DIR, filename)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Created: {filename}")


def main():
    print("=" * 50)
    print("  FamMail Test Assets Generator")
    print("=" * 50)
    print()

    print(f"Output directory: {TEST_ASSETS_DIR}")
    print()

    # Valid test images
    print("Creating valid test images...")
    create_test_image(
        "test-image.jpg", 800, 600, (135, 206, 235), "FamMail Test Image", format="JPEG"
    )
    create_test_image(
        "test-image.png", 800, 600, (144, 238, 144), "PNG Test Image", format="PNG"
    )
    create_test_image(
        "test-image.gif", 800, 600, (255, 255, 224), "GIF Test Image", format="GIF"
    )
    create_test_image(
        "test-image-small.jpg", 200, 150, (255, 192, 203), "Small", format="JPEG"
    )

    # Transparent PNG
    print()
    print("Creating transparent PNG...")
    img = Image.new("RGBA", (800, 600), (135, 206, 235, 180))
    draw = ImageDraw.Draw(img)
    draw.rectangle(
        [50, 50, 750, 550], fill=(255, 255, 255, 200), outline=(100, 100, 100, 255)
    )
    draw.text((350, 280), "Transparent PNG", fill=(0, 0, 0, 255))
    filepath = os.path.join(TEST_ASSETS_DIR, "test-image-transparent.png")
    img.save(filepath, "PNG")
    print(f"Created: test-image-transparent.png")

    # Large image
    print()
    print("Creating large image for size limit testing...")
    print("(This may take a moment...)")
    create_large_image("large-image.jpg", target_size_mb=11)

    # Invalid files
    print()
    print("Creating invalid test files...")

    create_text_file(
        "invalid.txt",
        """This is not an image file.

It is plain text content that should be rejected by the image upload validation.
The system should display an error message like:
"Invalid file type. Please upload JPG, PNG, or GIF."

This file is used to test:
- File type validation
- Error message display
- User feedback for invalid uploads
""",
    )

    # Fake image (corrupted)
    filepath = os.path.join(TEST_ASSETS_DIR, "fake-image.png")
    with open(filepath, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\nFAKE_IMAGE_DATA_NOT_A_REAL_PNG_FILE")
    print("Created: fake-image.png (corrupted)")

    # SVG
    create_text_file(
        "test-image.svg",
        """<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <rect x="50" y="50" width="700" height="500" fill="white" rx="10"/>
  <text x="400" y="280" font-size="48" fill="#333" text-anchor="middle" font-family="Arial">SVG Test Image</text>
  <text x="400" y="350" font-size="24" fill="#666" text-anchor="middle" font-family="Arial">FamMail QA Testing</text>
</svg>""",
    )

    print()
    print("=" * 50)
    print("  Test Assets Created Successfully!")
    print("=" * 50)
    print()
    print("Files created in:", TEST_ASSETS_DIR)
    print()

    # List files
    print("Files:")
    for f in sorted(os.listdir(TEST_ASSETS_DIR)):
        filepath = os.path.join(TEST_ASSETS_DIR, f)
        if os.path.isfile(filepath):
            size = os.path.getsize(filepath)
            if size > 1024 * 1024:
                size_str = f"{size // (1024 * 1024)}MB"
            elif size > 1024:
                size_str = f"{size // 1024}KB"
            else:
                size_str = f"{size}B"
            print(f"  - {f} ({size_str})")


if __name__ == "__main__":
    main()
