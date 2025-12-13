/**
 * Image processing utilities for postcard editor
 * Handles optimization, resizing, and canvas-based editing operations
 */

export interface ImageTransform {
  scale: number
  rotation: number
  offsetX: number
  offsetY: number
}

export interface ImageDimensions {
  width: number
  height: number
}

export interface ProcessedImageResult {
  dataUrl: string
  dimensions: ImageDimensions
  fileSize: number
}

// Postcard dimensions (6x4 inches at 300 DPI) - Landscape orientation
export const POSTCARD_DIMENSIONS = {
  width: 1800, // 6 inches * 300 DPI
  height: 1200, // 4 inches * 300 DPI
  aspectRatio: 3 / 2 // 6:4 ratio (width:height)
}

// Maximum file size for upload (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed file types
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

// Quality settings for optimization
export const OPTIMIZATION_SETTINGS = {
  jpeg: { quality: 0.85, maxWidth: 2048, maxHeight: 1365 },
  png: { quality: 0.9, maxWidth: 2048, maxHeight: 1365 },
  webp: { quality: 0.85, maxWidth: 2048, maxHeight: 1365 }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    }
  }

  return { isValid: true }
}

/**
 * Load image from file or data URL
 */
export function loadImage(source: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))

    if (typeof source === 'string') {
      img.src = source
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(source)
    }
  })
}

/**
 * Calculate dimensions to fit image within constraints while maintaining aspect ratio
 */
export function calculateFitDimensions(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): ImageDimensions {
  const aspectRatio = imageWidth / imageHeight
  const maxAspectRatio = maxWidth / maxHeight

  let width = imageWidth
  let height = imageHeight

  if (aspectRatio > maxAspectRatio) {
    // Image is wider than max aspect ratio
    width = maxWidth
    height = width / aspectRatio
  } else if (aspectRatio < maxAspectRatio) {
    // Image is taller than max aspect ratio
    height = maxHeight
    width = height * aspectRatio
  } else {
    // Perfect match
    width = maxWidth
    height = maxHeight
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Calculate dimensions to cover area while maintaining aspect ratio
 */
export function calculateCoverDimensions(
  imageWidth: number,
  imageHeight: number,
  coverWidth: number,
  coverHeight: number
): ImageDimensions {
  const aspectRatio = imageWidth / imageHeight
  const coverAspectRatio = coverWidth / coverHeight

  let width = coverWidth
  let height = coverHeight

  if (aspectRatio > coverAspectRatio) {
    // Image is wider than cover area
    height = coverHeight
    width = height * aspectRatio
  } else if (aspectRatio < coverAspectRatio) {
    // Image is taller than cover area
    width = coverWidth
    height = width / aspectRatio
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Resize and optimize image
 */
export async function processImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: 'jpeg' | 'png' | 'webp'
  } = {}
): Promise<ProcessedImageResult> {
  const img = await loadImage(file)

  const settings = OPTIMIZATION_SETTINGS[file.type.split('/')[1] as keyof typeof OPTIMIZATION_SETTINGS] || OPTIMIZATION_SETTINGS.jpeg

  const maxWidth = options.maxWidth || settings.maxWidth
  const maxHeight = options.maxHeight || settings.maxHeight
  const quality = options.quality || settings.quality
  const format = options.format || (file.type === 'image/png' ? 'png' : 'jpeg')

  const dimensions = calculateFitDimensions(img.width, img.height, maxWidth, maxHeight)

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Draw image
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

    // Convert to data URL
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
    const dataUrl = canvas.toDataURL(mimeType, quality)

    // Estimate file size
    const fileSize = Math.round(dataUrl.length * 0.75) // Base64 to bytes approximation

    resolve({
      dataUrl,
      dimensions,
      fileSize
    })
  })
}

/**
 * Apply transformations to image using canvas
 */
export async function transformImage(
  imageData: string,
  transform: ImageTransform,
  outputSize: ImageDimensions
): Promise<string> {
  const img = await loadImage(imageData)

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    canvas.width = outputSize.width
    canvas.height = outputSize.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save context state
    ctx.save()

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((transform.rotation * Math.PI) / 180)
    ctx.scale(transform.scale, transform.scale)

    // Calculate draw position with offset
    const drawWidth = img.width
    const drawHeight = img.height

    ctx.drawImage(
      img,
      -drawWidth / 2 + transform.offsetX,
      -drawHeight / 2 + transform.offsetY,
      drawWidth,
      drawHeight
    )

    // Restore context state
    ctx.restore()

    resolve(canvas.toDataURL('image/jpeg', 0.9))
  })
}

/**
 * Generate thumbnail for preview
 */
export async function generateThumbnail(
  imageData: string,
  size: number = 200
): Promise<string> {
  const img = await loadImage(imageData)

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    const dimensions = calculateFitDimensions(img.width, img.height, size, size)

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

    resolve(canvas.toDataURL('image/jpeg', 0.8))
  })
}

/**
 * Check if image meets quality guidelines
 */
export function checkImageQuality(
  dimensions: ImageDimensions,
  fileSize: number
): {
  isGoodQuality: boolean
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []
  let isGoodQuality = true

  // Check resolution
  const minResolution = 600 // Minimum dimension for good print quality
  if (dimensions.width < minResolution || dimensions.height < minResolution) {
    warnings.push('Image resolution is quite low. May appear pixelated when printed.')
    recommendations.push('Use an image with at least 600 pixels on the shortest side.')
    isGoodQuality = false
  }

  // Check aspect ratio
  const aspectRatio = dimensions.width / dimensions.height
  const targetAspectRatio = POSTCARD_DIMENSIONS.aspectRatio
  const aspectRatioDiff = Math.abs(aspectRatio - targetAspectRatio)

  if (aspectRatioDiff > 0.2) {
    warnings.push('Image aspect ratio differs significantly from postcard ratio (3:2).')
    recommendations.push('Consider cropping or using an image closer to 3:2 ratio for best results.')
  }

  // Check file compression
  const pixels = dimensions.width * dimensions.height
  const bytesPerPixel = fileSize / pixels

  if (bytesPerPixel < 0.5) {
    warnings.push('Image appears heavily compressed.')
    recommendations.push('Use a higher quality image source if available.')
  }

  return {
    isGoodQuality,
    warnings,
    recommendations
  }
}

/**
 * Generate safe zone overlay for postcard
 */
export function generateSafeZoneOverlay(
  width: number,
  height: number,
  bleedSize: number = 0.125, // 1/8 inch bleed
  safeZoneMargin: number = 0.25 // 1/4 inch safe zone
): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  canvas.width = width
  canvas.height = height

  // Clear canvas with transparent background
  ctx.clearRect(0, 0, width, height)

  const dpi = 300 // Standard print DPI
  const bleedPx = bleedSize * dpi
  const safeZonePx = safeZoneMargin * dpi

  // Draw bleed area (outer border)
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, width, height)

  // Draw trim line (actual postcard size)
  ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.strokeRect(bleedPx, bleedPx, width - bleedPx * 2, height - bleedPx * 2)

  // Draw safe zone
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'
  ctx.strokeRect(
    bleedPx + safeZonePx,
    bleedPx + safeZonePx,
    width - (bleedPx + safeZonePx) * 2,
    height - (bleedPx + safeZonePx) * 2
  )

  return canvas.toDataURL()
}