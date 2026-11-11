import type { CountryCode } from '../../utils/postcardTemplate'

interface Props {
  countryCode?: CountryCode | null
  onCountryChange: (code: CountryCode) => void
  onNext: () => void
}

const COUNTRIES: { code: CountryCode; name: string; flag: string; sub: string }[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', sub: 'USPS delivery' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', sub: 'Canada Post' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', sub: 'Royal Mail' },
]

export function CountryStep({ countryCode, onCountryChange, onNext }: Props) {
  const handleSelect = (code: CountryCode) => {
    onCountryChange(code)
    onNext()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Where is this going?</h2>
        <p className="text-stone-500 text-sm mt-0.5">Choose the destination country</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            className={`press rounded-lg border-2 p-4 text-center ${
              countryCode === c.code
                ? 'border-stone-900 bg-stone-100'
                : 'border-stone-200 hover:border-stone-400 bg-paper'
            }`}
            onClick={() => handleSelect(c.code)}
          >
            <span className="text-3xl block mb-1.5">{c.flag}</span>
            <span className="font-medium text-sm text-stone-900 block">{c.name}</span>
            <span className="text-xs text-stone-500 block mt-0.5">{c.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
