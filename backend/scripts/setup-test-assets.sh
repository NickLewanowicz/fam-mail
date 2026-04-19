#!/bin/bash
# backend/scripts/setup-test-assets.sh
# Creates test images and files for QA testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TEST_ASSETS_DIR="$BACKEND_DIR/test-assets"

echo "=============================================="
echo "  FamMail QA Test Assets Setup"
echo "=============================================="
echo ""

# Create test-assets directory
mkdir -p "$TEST_ASSETS_DIR"
cd "$TEST_ASSETS_DIR"

echo "Test assets directory: $TEST_ASSETS_DIR"
echo ""

# Function to create placeholder image using base64
create_placeholder_jpg() {
    local filename=$1
    local width=$2
    local height=$3
    local text=$4
    
    # Create a minimal valid JPEG using a base64-encoded tiny image
    # This creates a small colored square that's technically valid
    echo "Creating $filename ($width x $height)..."
    
    # Use Python or base64 to create a minimal valid image if available
    if command -v python3 &> /dev/null; then
        python3 << PYEOF
import struct
import base64

def create_minimal_jpeg(width, height, color_rgb, output_path):
    """Create a minimal valid JPEG file"""
    # This creates a valid JPEG with solid color
    # Minimal JPEG structure
    
    # Use PIL if available
    try:
        from PIL import Image
        img = Image.new('RGB', (width, height), color=color_rgb)
        img.save(output_path, 'JPEG', quality=85)
        print(f"Created {output_path} using PIL")
        return True
    except ImportError:
        pass
    
    # Fallback: create a very small but valid JPEG manually
    # This is a 1x1 red pixel JPEG in hex
    minimal_jpeg_b64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=="
    
    with open(output_path, 'wb') as f:
        f.write(base64.b64decode(minimal_jpeg_b64))
    print(f"Created minimal {output_path}")
    return True

# Create test images
create_minimal_jpeg($width, $height, ($2, $3, $4), "$filename")
PYEOF
    else
        # Fallback: download from placeholder service
        echo "Downloading placeholder image for $filename..."
        curl -sL "https://placehold.co/${width}x${height}/87CEEB/white?text=$text" -o "$filename" 2>/dev/null || true
        
        # If download failed, create a minimal valid file
        if [ ! -s "$filename" ]; then
            echo "Download failed, creating minimal placeholder..."
            # Minimal valid JPEG header
            echo "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==" | base64 -d > "$filename"
        fi
    fi
}

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick found - creating high-quality test images"
    echo ""
    
    # Valid test image - 800x600 JPG
    echo "Creating test-image.jpg (800x600)..."
    convert -size 800x600 xc:skyblue \
        -pointsize 48 -fill white -gravity center \
        -annotate 0 "FamMail Test Image" \
        "test-image.jpg" 2>/dev/null || create_placeholder_jpg "test-image.jpg" 800 600 "Test"
    
    # Valid test image - PNG
    echo "Creating test-image.png (800x600)..."
    convert -size 800x600 xc:lightgreen \
        -pointsize 48 -fill darkgreen -gravity center \
        -annotate 0 "PNG Test Image" \
        "test-image.png" 2>/dev/null || create_placeholder_jpg "test-image.png" 800 600 "PNG"
    
    # Valid test image - GIF
    echo "Creating test-image.gif (800x600)..."
    convert -size 800x600 xc:lightyellow \
        -pointsize 48 -fill orange -gravity center \
        -annotate 0 "GIF Test Image" \
        "test-image.gif" 2>/dev/null || create_placeholder_jpg "test-image.gif" 800 600 "GIF"
    
    # Small test image - 200x150
    echo "Creating test-image-small.jpg (200x150)..."
    convert -size 200x150 xc:pink \
        -pointsize 14 -fill white -gravity center \
        -annotate 0 "Small Test" \
        "test-image-small.jpg" 2>/dev/null || create_placeholder_jpg "test-image-small.jpg" 200 150 "Small"
    
    # Large image for size limit testing (>10MB)
    echo "Creating large-image.jpg (>10MB for limit testing)..."
    echo "  This may take a moment..."
    convert -size 5000x5000 plasma:fractal \
        -quality 95 \
        "large-image.jpg" 2>/dev/null || {
            echo "  Large image creation failed, creating alternative..."
            # Create multiple smaller images and combine
            convert -size 2000x2000 plasma:fractal -quality 100 "large-image.jpg" 2>/dev/null || \
            create_placeholder_jpg "large-image.jpg" 800 600 "Large"
        }
    
    # Verify large image size
    if [ -f "large-image.jpg" ]; then
        size=$(stat -f%z "large-image.jpg" 2>/dev/null || stat -c%s "large-image.jpg" 2>/dev/null || echo "0")
        if [ "$size" -lt 10000000 ]; then
            echo "  Note: large-image.jpg is $(numfmt --to=iec $size 2>/dev/null || echo $size bytes)"
            echo "  For >10MB testing, you may need to create a larger file manually"
        else
            echo "  ✅ large-image.jpg is $(numfmt --to=iec $size 2>/dev/null || echo $size bytes)"
        fi
    fi
    
else
    echo "⚠️  ImageMagick not found"
    echo "   Install with: brew install imagemagick"
    echo "   Attempting alternative methods..."
    echo ""
    
    # Try downloading sample images
    echo "Downloading sample images from placeholder services..."
    
    curl -sL "https://placehold.co/800x600/87CEEB/white?text=FamMail%20Test" -o "test-image.jpg" 2>/dev/null || \
        create_placeholder_jpg "test-image.jpg" 800 600 "Test"
    
    curl -sL "https://placehold.co/800x600/90EE90/006400?text=PNG%20Test" -o "test-image.png" 2>/dev/null || \
        cp "test-image.jpg" "test-image.png" 2>/dev/null
    
    curl -sL "https://placehold.co/800x600/FFFFE0/FFA500?text=GIF%20Test" -o "test-image.gif" 2>/dev/null || \
        cp "test-image.jpg" "test-image.gif" 2>/dev/null
    
    curl -sL "https://placehold.co/200x150/FFC0CB/white?text=Small" -o "test-image-small.jpg" 2>/dev/null || \
        create_placeholder_jpg "test-image-small.jpg" 200 150 "Small"
    
    echo ""
    echo "⚠️  For large-image.jpg (>10MB for size limit testing):"
    echo "   1. Download a large image from: https://testfile.org/image-files/"
    echo "   2. Or install ImageMagick: brew install imagemagick"
    echo "   3. Then re-run this script"
    
    # Create a note about the large file
    echo "NOTE: Create large-image.jpg manually (>10MB) for file size limit testing" > "large-image.jpg.txt"
fi

echo ""

# Invalid file type (text file)
echo "Creating invalid.txt (for type validation testing)..."
cat > "invalid.txt" << 'EOF'
This is not an image file.

It is plain text content that should be rejected by the image upload validation.
The system should display an error message like:
"Invalid file type. Please upload JPG, PNG, or GIF."

This file is used to test:
- File type validation
- Error message display
- User feedback for invalid uploads
EOF

# Invalid file with image extension (fake image)
echo "Creating fake-image.png (corrupted/fake image for validation)..."
# Start with PNG header but invalid content
printf '\x89PNG\r\n\x1a\n' > "fake-image.png"
printf 'FAKE_IMAGE_DATA_NOT_A_REAL_PNG_FILE' >> "fake-image.png"

# SVG file (may or may not be supported)
echo "Creating test-image.svg (for SVG support testing)..."
cat > "test-image.svg" << 'EOF'
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#87CEEB"/>
  <rect x="50" y="50" width="700" height="500" fill="white" rx="10"/>
  <text x="400" y="300" font-size="48" fill="#333" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">
    SVG Test Image
  </text>
  <text x="400" y="380" font-size="24" fill="#666" text-anchor="middle" font-family="Arial, sans-serif">
    FamMail QA Testing
  </text>
</svg>
EOF

# WebP file placeholder
echo "Creating test-image.webp (for WebP support testing)..."
# Create a note - WebP creation typically requires specific tools
cat > "test-image.webp.txt" << 'EOF'
WebP Test Image Placeholder

To create a real WebP image:
1. Convert an existing image: convert test-image.jpg test-image.webp
2. Or download from: https://developers.google.com/speed/webp/gallery1

Note: WebP support varies by browser and upload handler.
EOF

# Create a test image with transparency (PNG)
if command -v convert &> /dev/null; then
    echo "Creating test-image-transparent.png (with transparency)..."
    convert -size 800x600 xc:none \
        -fill "rgba(135, 206, 235, 0.7)" \
        -draw "roundrectangle 50,50 750,550 20,20" \
        -pointsize 48 -fill "rgba(255,255,255,0.9)" -gravity center \
        -annotate 0 "Transparent PNG" \
        "test-image-transparent.png" 2>/dev/null || \
        cp "test-image.png" "test-image-transparent.png"
fi

echo ""
echo "=============================================="
echo "  Test Assets Created Successfully!"
echo "=============================================="
echo ""
echo "Files created in: $TEST_ASSETS_DIR"
echo ""
echo "Test Assets Summary:"
echo "--------------------"

# List files with sizes
ls -lh "$TEST_ASSETS_DIR" 2>/dev/null || ls -la "$TEST_ASSETS_DIR"

echo ""
echo "Usage:"
echo "  - test-image.jpg        : Valid JPEG for normal uploads"
echo "  - test-image.png        : Valid PNG for format testing"
echo "  - test-image.gif        : Valid GIF for format testing"
echo "  - test-image-small.jpg  : Small image for edge cases"
echo "  - large-image.jpg       : >10MB file for size limit testing"
echo "  - invalid.txt           : Text file for type validation"
echo "  - fake-image.png        : Corrupted PNG for validation"
echo "  - test-image.svg        : SVG for format support testing"
echo ""
echo "Next steps:"
echo "  1. If large-image.jpg is missing or too small, create manually or install ImageMagick"
echo "  2. Run QA tests using the Chrome DevTools plan"
echo ""
