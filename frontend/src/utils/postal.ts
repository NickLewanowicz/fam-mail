// Postal service guidelines and utilities for postcard layout
// Based on USPS and Canada Post standards for 4"x6" postcards

export interface PostalDimensions {
  // Postcard dimensions at 300 DPI (standard printing resolution)
  width: number; // 6 inches = 1800px at 300 DPI
  height: number; // 4 inches = 1200px at 300 DPI

  // Safe margins (0.125" = 38px at 300 DPI from each edge)
  safeMargin: number;

  // Back side split (60/40 ratio for message/address)
  messageAreaWidth: number; // 60% = 1080px (3.6 inches)
  addressAreaWidth: number; // 40% = 720px (2.4 inches)

  // Stamp area (standard US stamp: 0.875" x 1" = 263px x 300px)
  stampWidth: number;
  stampHeight: number;

  // Minimum font sizes for OCR readability
  minFontSizePt: number; // 8pt minimum
  minFontSizePx: number; // ~11px at 96 DPI screen

  // Address block positioning
  addressBlockTop: number; // Distance from top edge
  addressBlockLeft: number; // Distance from left edge of address area
}

export const POSTAL_CONSTANTS: PostalDimensions = {
  // Base dimensions at 300 DPI (6" × 4" postcard in landscape)
  width: 1800, // 6 inches
  height: 1200, // 4 inches

  // Margins and spacing
  safeMargin: 38, // 0.125" at 300 DPI

  // Back side layout (60/40 split for message/address)
  messageAreaWidth: 1080, // 60% = 3.6 inches
  addressAreaWidth: 720, // 40% = 2.4 inches

  // Stamp dimensions
  stampWidth: 263, // 0.875"
  stampHeight: 300, // 1"

  // Typography
  minFontSizePt: 8,
  minFontSizePx: 11,

  // Address positioning
  addressBlockTop: 100, // ~0.33" from top
  addressBlockLeft: 38, // Safe margin
};

// Scale constants for different screen densities
export function getScreenAdjustedConstants(screenDPI: number = 96): PostalDimensions {
  const scale = screenDPI / 96;

  return {
    ...POSTAL_CONSTANTS,
    minFontSizePx: Math.round(POSTAL_CONSTANTS.minFontSizePt * scale),
    safeMargin: Math.round(POSTAL_CONSTANTS.safeMargin * (screenDPI / 300)),
  };
}

// CSS-in-JS style generator for postal compliance
export function getPostalStyles(screenDPI: number = 96) {
  const constants = getScreenAdjustedConstants(screenDPI);

  return {
    // Postcard container
    postcard: {
      width: '100%',
      height: '100%',
      aspectRatio: '3/2', // 6:4 aspect ratio (landscape)
      backgroundColor: '#ffffff',
      position: 'relative' as const,
      overflow: 'hidden',
    },

    // Back side split layout
    messageArea: {
      width: '60%',
      height: '100%',
      padding: `${constants.safeMargin}px`,
      fontSize: `${Math.max(constants.minFontSizePx, 14)}px`,
      lineHeight: 1.5,
      color: '#000000', // High contrast for OCR
      position: 'relative' as const,
    },

    addressArea: {
      width: '40%',
      height: '100%',
      padding: `${constants.safeMargin}px`,
      fontSize: `${Math.max(constants.minFontSizePx, 12)}px`,
      lineHeight: 1.4,
      color: '#000000',
      position: 'relative' as const,
      display: 'flex',
      flexDirection: 'column' as const,
    },

    // Stamp placeholder
    stampPlaceholder: {
      width: `${(constants.stampWidth / constants.addressAreaWidth) * 100}%`,
      height: `${(constants.stampHeight / POSTAL_CONSTANTS.height) * 100}%`,
      border: '2px dashed #d1d5db',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      backgroundColor: '#f9fafb',
    },

    // Address block
    addressBlock: {
      marginTop: `${constants.addressBlockTop}px`,
      marginLeft: `${constants.addressBlockLeft}px`,
      fontFamily: 'monospace', // Better for OCR
      fontWeight: 400,
      letterSpacing: '0.02em',
    },

    // Message typography
    messageText: {
      fontSize: `${Math.max(constants.minFontSizePx, 14)}px`,
      lineHeight: 1.6,
      color: '#1a1a1a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },

    // Interactive zones
    editableZone: {
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      borderRadius: '4px',
      minHeight: '24px',
    },

    editableZoneHover: {
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      boxShadow: 'inset 0 0 0 1px rgba(59, 130, 246, 0.1)',
    },

    editableZoneActive: {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      boxShadow: 'inset 0 0 0 2px rgba(59, 130, 246, 0.2)',
    },
  };
}

// Validation utilities
export const MESSAGE_CONSTRAINTS = {
  maxLength: 500, // Approximate character limit for message area
  minFontSize: POSTAL_CONSTANTS.minFontSizePt,
  suggestedMaxWords: 100,
  linesApprox: 15, // Approximate lines that fit in message area
};

export const ADDRESS_PATTERNS = {
  // US ZIP Code (5-digit or ZIP+4)
  usZip: /^\d{5}(-\d{4})?$/,

  // Canadian Postal Code (A1A 1A1)
  caPostal: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,

  // UK Postcode
  ukPostcode: /^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$/,

  // State/Province codes (simplified)
  usState: /^[A-Za-z]{2}$/,
  caProvince: /^[A-Za-z]{2}$/,
};

// Validation functions
export function validateAddress(address: {
  addressLine1: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  countryCode: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!address.addressLine1?.trim()) {
    errors.push('Street address is required');
  }

  if (!address.city?.trim()) {
    errors.push('City is required');
  }

  if (!address.provinceOrState?.trim()) {
    errors.push('State/Province is required');
  }

  if (!address.postalOrZip?.trim()) {
    errors.push('ZIP/Postal code is required');
  }

  // Format validation
  if (address.postalOrZip) {
    const { countryCode } = address;

    if (countryCode === 'US' && !ADDRESS_PATTERNS.usZip.test(address.postalOrZip)) {
      errors.push('Invalid US ZIP code format (12345 or 12345-6789)');
    } else if (countryCode === 'CA' && !ADDRESS_PATTERNS.caPostal.test(address.postalOrZip)) {
      errors.push('Invalid Canadian postal code format (A1A 1A1)');
    } else if (countryCode === 'GB' && !ADDRESS_PATTERNS.ukPostcode.test(address.postalOrZip)) {
      errors.push('Invalid UK postcode format');
    }
  }

  // Length validations
  if (address.addressLine1 && address.addressLine1.length > 50) {
    errors.push('Address line 1 is too long (max 50 characters)');
  }

  if (address.city && address.city.length > 30) {
    errors.push('City name is too long (max 30 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Formatting utilities
export function formatAddress(address: {
  firstName?: string;
  lastName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  countryCode: string;
}): string[] {
  const lines: string[] = [];

  // Name line
  if (address.firstName && address.lastName) {
    lines.push(`${address.firstName} ${address.lastName}`);
  }

  // Address lines
  lines.push(address.addressLine1);
  if (address.addressLine2) {
    lines.push(address.addressLine2);
  }

  // City, State/Province, ZIP/Postal
  const cityStateZip = [
    address.city,
    address.provinceOrState,
    address.postalOrZip
  ].filter(Boolean).join(', ');

  if (cityStateZip) {
    lines.push(cityStateZip);
  }

  // Country (only for international mail)
  if (address.countryCode !== 'US') {
    const countryNames: Record<string, string> = {
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'MX': 'Mexico',
      'AU': 'Australia',
    };
    lines.push(countryNames[address.countryCode] || address.countryCode);
  }

  return lines;
}

// Auto-formatting functions
export function formatPostalCode(postalCode: string, countryCode: string): string {
  if (!postalCode) return '';

  const cleaned = postalCode.toUpperCase().replace(/\s/g, '');

  switch (countryCode) {
    case 'CA':
      // Format as A1A 1A1
      return cleaned.length === 6 ? `${cleaned.slice(0, 3)} ${cleaned.slice(3)}` : cleaned;

    case 'US':
      // Format as 12345 or 12345-6789
      if (cleaned.length === 9) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
      }
      return cleaned.slice(0, 5);

    default:
      return postalCode;
  }
}

export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatStateProvince(state: string, countryCode: string): string {
  if (!state) return '';

  const cleaned = state.toUpperCase().replace(/\s/g, '');

  // Ensure proper format (2 letters for US/CA)
  if (countryCode === 'US' || countryCode === 'CA') {
    return cleaned.slice(0, 2);
  }

  return state;
}