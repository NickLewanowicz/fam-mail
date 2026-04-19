---
name: postcard-validation
description: Domain knowledge for postcard address, image, and message validation rules required by PostGrid
---

## What I Do

Provide domain expertise on validating postcards before sending them to PostGrid for physical printing and mailing. Invalid postcards waste money and deliver bad user experiences.

## When to Use Me

- When implementing or modifying postcard creation endpoints
- When writing validation tests for postcard inputs
- When debugging PostGrid API errors
- When reviewing PRs that touch postcard flows

## PostGrid Requirements

### Address Validation
PostGrid requires these fields for both sender and recipient:
- `addressLine1` (required): Street address, max 200 chars
- `addressLine2` (optional): Apt/Suite number
- `city` (required): City name
- `provinceOrState` (required): 2-letter state/province code
- `postalOrZip` (required): Postal/ZIP code
- `country` (required): 2-letter ISO country code (US, CA)

#### Postal Code Formats
- **US ZIP**: `12345` or `12345-6789`
- **Canadian**: `A1A 1A1` (letter-digit-letter space digit-letter-digit)

#### Common Validation Errors
- Empty or whitespace-only strings
- State codes longer than 2 characters
- ZIP codes with invalid formats
- Missing country code
- PO Box in addressLine1 (some products don't support)

### Image Validation
PostGrid postcard front image requirements:
- **Formats**: JPEG, PNG (no SVG, GIF, BMP, WebP)
- **Minimum dimensions**: 1875 x 1275 pixels (6.25" x 4.25" at 300 DPI)
- **Maximum file size**: 10MB
- **Color space**: RGB (not CMYK)
- **No transparency**: PNG with alpha will have white background

#### Image Validation Checks
1. File extension matches content type (magic bytes)
2. Dimensions meet minimum
3. File size within limit
4. Not a corrupt/truncated file
5. No embedded scripts or exploits

### Message Validation
PostGrid supports HTML content for the back of the postcard:
- **Max length**: Varies by postcard size, typically ~500 characters for readability
- **Allowed HTML**: Basic formatting (bold, italic, line breaks)
- **Sanitization required**: Strip script tags, event handlers, iframes
- **Encoding**: UTF-8, but avoid complex Unicode that may not render in print

### Return Address
Every postcard MUST have a valid return address:
- Same validation rules as recipient address
- Should be pre-configured (not user-supplied for each postcard)
- Must be a real, deliverable address

## Test Matrix

| Test Case | Input | Expected |
|-----------|-------|----------|
| Valid US address | All fields, US ZIP | Pass |
| Valid CA address | All fields, CA postal | Pass |
| Missing addressLine1 | Empty string | 400 error |
| Missing city | null | 400 error |
| Invalid state | "California" | 400 error (need "CA") |
| Invalid US ZIP | "1234" | 400 error |
| Invalid CA postal | "AAA BBB" | 400 error |
| Missing country | undefined | 400 error |
| Valid JPEG image | 1875x1275, 2MB | Pass |
| Valid PNG image | 2000x1500, 3MB | Pass |
| SVG image | Any SVG | 400 error |
| Oversized image | 15MB JPEG | 400 error |
| Undersized image | 100x100 JPEG | 400 error |
| Corrupt image | Invalid bytes | 400 error |
| Empty message | "" | Pass (optional) |
| XSS in message | `<script>alert(1)</script>` | Sanitized |
| Long message | 2000 chars | Warning or truncate |
| Missing return addr | No return address configured | 500 error |
