export interface PostcardDimensions {
  width: number
  height: number
  safeMargin: number
  bleedMargin: number
}

export const POSTCARD_6X4_DIMENSIONS: PostcardDimensions = {
  width: 1800,
  height: 1200,
  safeMargin: 37.5,
  bleedMargin: 18.75,
}

export interface SafeZones {
  safe: {
    x: number
    y: number
    width: number
    height: number
  }
  bleed: {
    x: number
    y: number
    width: number
    height: number
  }
  addressBlock?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export function calculateSafeZones(dimensions: PostcardDimensions, includeAddressBlock = false): SafeZones {
  const zones: SafeZones = {
    safe: {
      x: dimensions.safeMargin,
      y: dimensions.safeMargin,
      width: dimensions.width - (dimensions.safeMargin * 2),
      height: dimensions.height - (dimensions.safeMargin * 2),
    },
    bleed: {
      x: dimensions.bleedMargin,
      y: dimensions.bleedMargin,
      width: dimensions.width - (dimensions.bleedMargin * 2),
      height: dimensions.height - (dimensions.bleedMargin * 2),
    },
  }

  if (includeAddressBlock) {
    zones.addressBlock = {
      x: dimensions.width / 2 + 50,
      y: dimensions.height / 2 + 100,
      width: dimensions.width / 2 - 100,
      height: dimensions.height / 2 - 150,
    }
  }

  return zones
}

export function generateFrontHTML(imageBase64: string): string {
  const dims = POSTCARD_6X4_DIMENSIONS

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${dims.width}px;
      height: ${dims.height}px;
      overflow: hidden;
      position: relative;
    }
    .full-bleed {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .full-bleed img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <div class="full-bleed">
    <img src="${imageBase64}" alt="Postcard front" />
  </div>
</body>
</html>`
}

export function generateBackHTML(messageHTML?: string): string {
  const dims = POSTCARD_6X4_DIMENSIONS
  const zones = calculateSafeZones(dims, true)

  const displayMessage = messageHTML || '<p style="color: #999; font-style: italic;">Your message will appear here...</p>'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${dims.width}px;
      height: ${dims.height}px;
      overflow: hidden;
      position: relative;
      background: white;
      font-family: Arial, sans-serif;
    }
    .message-area {
      position: absolute;
      left: ${zones.safe.x}px;
      top: ${zones.safe.y}px;
      width: ${dims.width / 2 - zones.safe.x - 50}px;
      height: ${zones.safe.height}px;
      padding: 20px;
      font-size: 24px;
      line-height: 1.6;
      color: #333;
      overflow: hidden;
    }
    .message-area h1 { font-size: 36px; margin-bottom: 16px; font-weight: bold; }
    .message-area h2 { font-size: 32px; margin-bottom: 14px; font-weight: bold; }
    .message-area h3 { font-size: 28px; margin-bottom: 12px; font-weight: bold; }
    .message-area p { margin-bottom: 12px; }
    .message-area strong { font-weight: bold; }
    .message-area em { font-style: italic; }
    .message-area ul, .message-area ol { margin-left: 30px; margin-bottom: 12px; }
    .message-area li { margin-bottom: 6px; }
    .divider {
      position: absolute;
      left: ${dims.width / 2}px;
      top: ${zones.safe.y}px;
      width: 2px;
      height: ${zones.safe.height}px;
      background: #ddd;
    }
    .address-area {
      position: absolute;
      right: ${zones.safe.x}px;
      bottom: ${zones.safe.y}px;
      width: ${dims.width / 2 - zones.safe.x - 50}px;
      height: ${dims.height / 2 - zones.safe.y - 50}px;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="message-area">
    ${displayMessage}
  </div>
  <div class="divider"></div>
  <div class="address-area">
    Address will be placed here
  </div>
</body>
</html>`
}

export function generatePreviewHTML(
  imageBase64: string,
  side: 'front' | 'back',
  showSafeZones = true,
  messageHTML?: string
): string {
  const dims = POSTCARD_6X4_DIMENSIONS
  const zones = calculateSafeZones(dims, side === 'back')

  const baseHTML = side === 'front'
    ? generateFrontHTML(imageBase64)
    : generateBackHTML(messageHTML)

  if (!showSafeZones) {
    return baseHTML
  }

  const safeZoneOverlay = `
    <div style="
      position: absolute;
      top: ${zones.safe.y}px;
      left: ${zones.safe.x}px;
      width: ${zones.safe.width}px;
      height: ${zones.safe.height}px;
      border: 3px dashed rgba(34, 197, 94, 0.8);
      pointer-events: none;
      z-index: 1000;
    "></div>
    <div style="
      position: absolute;
      top: ${zones.bleed.y}px;
      left: ${zones.bleed.x}px;
      width: ${zones.bleed.width}px;
      height: ${zones.bleed.height}px;
      border: 3px dashed rgba(251, 191, 36, 0.6);
      pointer-events: none;
      z-index: 999;
    "></div>
    ${zones.addressBlock ? `
    <div style="
      position: absolute;
      top: ${zones.addressBlock.y}px;
      left: ${zones.addressBlock.x}px;
      width: ${zones.addressBlock.width}px;
      height: ${zones.addressBlock.height}px;
      border: 3px dashed rgba(239, 68, 68, 0.6);
      pointer-events: none;
      z-index: 1001;
    "></div>` : ''}
  `

  return baseHTML.replace('</body>', `${safeZoneOverlay}</body>`)
}
