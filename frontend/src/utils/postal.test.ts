import {
  POSTAL_CONSTANTS,
  getPostalStyles,
  validateAddress,
  formatAddress,
  formatPostalCode,
  capitalizeWords,
  formatStateProvince,
  ADDRESS_PATTERNS,
  MESSAGE_CONSTRAINTS,
} from './postal';

describe('Postal Utilities', () => {
  describe('POSTAL_CONSTANTS', () => {
    it('should have correct dimensions for 4x6 postcard', () => {
      expect(POSTAL_CONSTANTS.width).toBe(1200); // 4" at 300 DPI
      expect(POSTAL_CONSTANTS.height).toBe(1800); // 6" at 300 DPI
      expect(POSTAL_CONSTANTS.messageAreaWidth).toBe(720); // 60% of width
      expect(POSTAL_CONSTANTS.addressAreaWidth).toBe(480); // 40% of width
    });

    it('should have correct minimum font size requirements', () => {
      expect(POSTAL_CONSTANTS.minFontSizePt).toBe(8);
      expect(POSTAL_CONSTANTS.minFontSizePx).toBe(11);
    });

    it('should have correct stamp dimensions', () => {
      expect(POSTAL_CONSTANTS.stampWidth).toBe(263); // 0.875" at 300 DPI
      expect(POSTAL_CONSTANTS.stampHeight).toBe(300); // 1" at 300 DPI
    });
  });

  describe('getPostalStyles', () => {
    it('should return styles with proper structure', () => {
      const styles = getPostalStyles();

      expect(styles.postcard).toHaveProperty('width', '100%');
      expect(styles.postcard).toHaveProperty('aspectRatio', '2/3');

      expect(styles.messageArea).toHaveProperty('width', '60%');
      expect(styles.addressArea).toHaveProperty('width', '40%');

      expect(styles.messageArea).toHaveProperty('fontSize');
      expect(styles.addressArea).toHaveProperty('fontSize');
    });

    it('should adjust font sizes for different screen DPI', () => {
      const styles96 = getPostalStyles(96);
      const styles192 = getPostalStyles(192);

      // Font sizes should scale with DPI
      expect(parseInt(styles96.messageArea.fontSize as string)).toBeLessThan(
        parseInt(styles192.messageArea.fontSize as string)
      );
    });
  });

  describe('validateAddress', () => {
    const validUSAddress = {
      addressLine1: '123 Main St',
      city: 'New York',
      provinceOrState: 'NY',
      postalOrZip: '10001',
      countryCode: 'US',
    };

    it('should validate a correct US address', () => {
      const result = validateAddress(validUSAddress);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteAddress = {
        addressLine1: '',
        city: '',
        provinceOrState: '',
        postalOrZip: '',
        countryCode: 'US',
      };

      const result = validateAddress(incompleteAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Street address is required');
      expect(result.errors).toContain('City is required');
      expect(result.errors).toContain('State/Province is required');
      expect(result.errors).toContain('ZIP/Postal code is required');
    });

    it('should validate US ZIP codes', () => {
      const result1 = validateAddress({ ...validUSAddress, postalOrZip: '12345' });
      expect(result1.isValid).toBe(true);

      const result2 = validateAddress({ ...validUSAddress, postalOrZip: '12345-6789' });
      expect(result2.isValid).toBe(true);

      const result3 = validateAddress({ ...validUSAddress, postalOrZip: '1234' });
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Invalid US ZIP code format');
    });

    it('should validate Canadian postal codes', () => {
      const caAddress = {
        ...validUSAddress,
        countryCode: 'CA',
        postalOrZip: 'K1A 0B1',
      };

      const result1 = validateAddress(caAddress);
      expect(result1.isValid).toBe(true);

      const result2 = validateAddress({ ...caAddress, postalOrZip: 'K1A0B1' });
      expect(result2.isValid).toBe(true);

      const result3 = validateAddress({ ...caAddress, postalOrZip: '12345' });
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Invalid Canadian postal code format');
    });

    it('should validate field lengths', () => {
      const longAddress = {
        ...validUSAddress,
        addressLine1: 'a'.repeat(51), // Too long
        city: 'a'.repeat(31), // Too long
      };

      const result = validateAddress(longAddress);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Address line 1 is too long (max 50 characters)');
      expect(result.errors).toContain('City name is too long (max 30 characters)');
    });
  });

  describe('formatAddress', () => {
    const sampleAddress = {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      addressLine2: 'Apt 4B',
      city: 'New York',
      provinceOrState: 'NY',
      postalOrZip: '10001',
      countryCode: 'US',
    };

    it('should format address into lines', () => {
      const lines = formatAddress(sampleAddress);
      expect(lines).toEqual([
        'John Doe',
        '123 Main St',
        'Apt 4B',
        'New York, NY 10001',
      ]);
    });

    it('should handle optional address line 2', () => {
      const addressWithoutApt = { ...sampleAddress, addressLine2: undefined };
      const lines = formatAddress(addressWithoutApt);
      expect(lines).toEqual([
        'John Doe',
        '123 Main St',
        'New York, NY 10001',
      ]);
    });

    it('should include country for international addresses', () => {
      const caAddress = { ...sampleAddress, countryCode: 'CA' };
      const lines = formatAddress(caAddress);
      expect(lines).toContain('Canada');
    });
  });

  describe('formatPostalCode', () => {
    it('should format Canadian postal codes', () => {
      expect(formatPostalCode('k1a0b1', 'CA')).toBe('K1A 0B1');
      expect(formatPostalCode('K1A 0B1', 'CA')).toBe('K1A 0B1');
      expect(formatPostalCode('k1a 0b1', 'CA')).toBe('K1A 0B1');
    });

    it('should format US ZIP codes', () => {
      expect(formatPostalCode('12345', 'US')).toBe('12345');
      expect(formatPostalCode('123456789', 'US')).toBe('12345-6789');
      expect(formatPostalCode('12345-6789', 'US')).toBe('12345-6789');
    });

    it('should return as-is for unknown countries', () => {
      expect(formatPostalCode('ABC-123', 'XX')).toBe('ABC-123');
    });
  });

  describe('capitalizeWords', () => {
    it('should capitalize first letter of each word', () => {
      expect(capitalizeWords('john doe')).toBe('John Doe');
      expect(capitalizeWords('new york')).toBe('New York');
      expect(capitalizeWords('123 main st')).toBe('123 Main St');
    });

    it('should handle empty string', () => {
      expect(capitalizeWords('')).toBe('');
    });
  });

  describe('formatStateProvince', () => {
    it('should format US state codes to 2 letters', () => {
      expect(formatStateProvince('New York', 'US')).toBe('NY');
      expect(formatStateProvince('california', 'US')).toBe('CA');
      expect(formatStateProvince('TX', 'US')).toBe('TX');
    });

    it('should format Canadian province codes to 2 letters', () => {
      expect(formatStateProvince('Ontario', 'CA')).toBe('ON');
      expect(formatStateProvince('british columbia', 'CA')).toBe('BC');
      expect(formatStateProvince('QC', 'CA')).toBe('QC');
    });

    it('should return as-is for other countries', () => {
      expect(formatStateProvince('Bavaria', 'DE')).toBe('Bavaria');
    });
  });

  describe('ADDRESS_PATTERNS', () => {
    it('should have correct regex patterns', () => {
      expect(ADDRESS_PATTERNS.usZip.test('12345')).toBe(true);
      expect(ADDRESS_PATTERNS.usZip.test('12345-6789')).toBe(true);
      expect(ADDRESS_PATTERNS.usZip.test('1234')).toBe(false);

      expect(ADDRESS_PATTERNS.caPostal.test('K1A 0B1')).toBe(true);
      expect(ADDRESS_PATTERNS.caPostal.test('K1A0B1')).toBe(true);
      expect(ADDRESS_PATTERNS.caPostal.test('12345')).toBe(false);

      expect(ADDRESS_PATTERNS.ukPostcode.test('SW1A 1AA')).toBe(true);
      expect(ADDRESS_PATTERNS.ukPostcode.test('M1 1AA')).toBe(true);
      expect(ADDRESS_PATTERNS.ukPostcode.test('12345')).toBe(false);
    });
  });

  describe('MESSAGE_CONSTRAINTS', () => {
    it('should have reasonable constraints', () => {
      expect(MESSAGE_CONSTRAINTS.maxLength).toBeGreaterThan(0);
      expect(MESSAGE_CONSTRAINTS.minFontSize).toBe(POSTAL_CONSTANTS.minFontSizePt);
      expect(MESSAGE_CONSTRAINTS.suggestedMaxWords).toBeGreaterThan(0);
    });
  });
});