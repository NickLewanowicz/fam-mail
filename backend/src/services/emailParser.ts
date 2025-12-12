export interface ParsedEmail {
  subject: string
  textContent: string
  htmlContent?: string
  attachments: Array<{
    filename: string
    contentType: string
    data: Buffer | string
    base64?: boolean
  }>
}

export interface ParsedAddress {
  firstName?: string
  lastName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  provinceOrState?: string
  postalOrZip?: string
  countryCode?: string
}

export interface EmailParseResult {
  recipient: ParsedAddress | null
  message: string
  images: Array<{
    filename: string
    data: string // base64 encoded
  }>
  isValid: boolean
  errors: string[]
}

export class EmailParser {
  private readonly addressPatterns = {
    // Subject line patterns
    subjectPatterns: [
      /^To:\s*(.+?)\s*,?\s*([\d\s\w]+\s+.+?)\s*,?\s*([^,]+),?\s*([^,]+),?\s*([^,]+),?\s*([^\s]+)$/i,
      /^Send to:\s*(.+?)\s*,?\s*([\d\s\w]+\s+.+?)\s*,?\s*([^,]+),?\s*([^,]+),?\s*([^,]+),?\s*([^\s]+)$/i,
      /^Recipient:\s*(.+?)\s*,?\s*([\d\s\w]+\s+.+?)\s*,?\s*([^,]+),?\s*([^,]+),?\s*([^,]+),?\s*([^\s]+)$/i,
    ],

    // Body patterns
    bodyPatterns: [
      // Multi-line address format
      /To:\s*\n(.+?)\n([\d\s\w]+\s+.+?)\n([^,\n]+),?\s*([^,\n]+)\s*([^,\n]+)\s*([^\s\n]+)/im,
      /Recipient:\s*\n(.+?)\n([\d\s\w]+\s+.+?)\n([^,\n]+),?\s*([^,\n]+)\s*([^,\n]+)\s*([^\s\n]+)/im,
      /Send to:\s*\n(.+?)\n([\d\s\w]+\s+.+?)\n([^,\n]+),?\s*([^,\n]+)\s*([^,\n]+)\s*([^\s\n]+)/im,

      // Single line patterns
      /To:\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^\s\n]+)/i,
      /Address:\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^,\n]+),\s*([^\s\n]+)/i,
    ],
  }

  private readonly stateAbbreviations = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    // Canadian provinces
    'AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ]

  parseEmail(emailData: ParsedEmail): EmailParseResult {
    const result: EmailParseResult = {
      recipient: null,
      message: '',
      images: [],
      isValid: false,
      errors: [],
    }

    try {
      // Extract recipient address
      result.recipient = this.extractAddress(emailData.subject, emailData.textContent)

      // Extract message content (remove address lines)
      result.message = this.extractMessage(emailData.textContent, emailData.htmlContent)

      // Process images from attachments
      result.images = this.extractImages(emailData.attachments)

      // Validate result
      result.isValid = this.validateResult(result)

      if (!result.isValid) {
        result.errors.push('Could not extract valid recipient address from email')
      }

    } catch (error) {
      result.errors.push(`Failed to parse email: ${error}`)
    }

    return result
  }

  private extractAddress(subject: string, body: string): ParsedAddress | null {
    // Try to extract address from subject first
    let address = this.tryExtractFromPatterns(subject, this.addressPatterns.subjectPatterns)

    if (!address) {
      // Try to extract from body
      address = this.tryExtractFromPatterns(body, this.addressPatterns.bodyPatterns)
    }

    return address
  }

  private tryExtractFromPatterns(text: string, patterns: RegExp[]): ParsedAddress | null {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        // Try different interpretations of the matched groups
        const address = this.interpretMatchGroups(match)
        if (address && this.isValidAddress(address)) {
          return address
        }
      }
    }
    return null
  }

  private interpretMatchGroups(match: RegExpMatchArray): ParsedAddress | null {
    const groups = match.slice(1) // Skip full match

    // Try different interpretations of the groups
    const interpretations = [
      // Standard: Name, Address, City, State, ZIP, Country
      {
        fullName: groups[0]?.trim(),
        addressLine1: groups[1]?.trim(),
        city: groups[2]?.trim(),
        state: groups[3]?.trim(),
        zip: groups[4]?.trim(),
        country: groups[5]?.trim(),
      },
      // Alternative: Name, Address, City, State, ZIP (Country optional)
      {
        fullName: groups[0]?.trim(),
        addressLine1: groups[1]?.trim(),
        city: groups[2]?.trim(),
        state: groups[3]?.trim(),
        zip: groups[4]?.trim(),
        country: groups[5]?.trim() || 'US',
      },
    ]

    for (const interpretation of interpretations) {
      const address = this.buildAddress(interpretation)
      if (address && this.isValidAddress(address)) {
        return address
      }
    }

    return null
  }

  private buildAddress(data: {
    fullName?: string
    addressLine1?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }): ParsedAddress | null {
    if (!data.fullName || !data.addressLine1 || !data.city || !data.state || !data.zip) {
      return null
    }

    // Parse full name into first and last
    const nameParts = data.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Normalize country code
    let countryCode = data.country || 'US'
    if (countryCode.length === 2) {
      countryCode = countryCode.toUpperCase()
    } else {
      // Convert country name to code (simplified)
      const countryMap: Record<string, string> = {
        'united states': 'US',
        'canada': 'CA',
        'usa': 'US',
      }
      countryCode = countryMap[countryCode.toLowerCase()] || 'US'
    }

    // Normalize state
    let provinceOrState = data.state.toUpperCase()

    // Expand state name to abbreviation if needed
    const stateMap: Record<string, string> = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
      'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
      // Add more as needed
    }

    if (provinceOrState.length > 2) {
      provinceOrState = stateMap[provinceOrState] || provinceOrState
    }

    return {
      firstName,
      lastName,
      addressLine1: data.addressLine1,
      city: data.city,
      provinceOrState,
      postalOrZip: data.zip,
      countryCode,
    }
  }

  private isValidAddress(address: ParsedAddress): boolean {
    return !!(
      address.firstName &&
      address.lastName &&
      address.addressLine1 &&
      address.city &&
      address.provinceOrState &&
      address.postalOrZip &&
      address.countryCode &&
      // Check if state/province is valid abbreviation
      this.stateAbbreviations.includes(address.provinceOrState)
    )
  }

  private extractMessage(textContent: string, htmlContent?: string): string {
    // Use text content primarily
    let message = textContent || ''

    if (htmlContent) {
      // If available, prefer text content but fallback to stripped HTML
      message = textContent || this.stripHtml(htmlContent)
    }

    // Remove address lines from message
    const lines = message.split('\n')
    const filteredLines = lines.filter(line => {
      const lowerLine = line.toLowerCase().trim()
      return !(
        lowerLine.startsWith('to:') ||
        lowerLine.startsWith('recipient:') ||
        lowerLine.startsWith('send to:') ||
        lowerLine.startsWith('address:')
      )
    })

    return filteredLines.join('\n').trim()
  }

  private extractImages(attachments: ParsedEmail['attachments']): Array<{ filename: string; data: string }> {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

    return attachments
      .filter(att => imageTypes.includes(att.contentType))
      .map(att => ({
        filename: att.filename,
        data: att.base64 && typeof att.data === 'string'
          ? att.data
          : Buffer.isBuffer(att.data)
            ? att.data.toString('base64')
            : Buffer.from(att.data).toString('base64')
      }))
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }

  private validateResult(result: EmailParseResult): boolean {
    // Must have a valid recipient address
    if (!result.recipient || !this.isValidAddress(result.recipient)) {
      return false
    }

    // Must have some message content
    if (!result.message || result.message.trim().length === 0) {
      return false
    }

    return true
  }
}