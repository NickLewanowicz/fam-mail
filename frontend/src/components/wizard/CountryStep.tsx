import type { CountryCode } from '../../utils/postcardTemplate'

interface Props {
  countryCode: CountryCode
  onCountryChange: (code: CountryCode) => void
  onNext: () => void
}

const COUNTRIES: { code: CountryCode; name: string; flag: string; description: string }[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', description: 'USA postal service' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', description: 'Canada Post' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', description: 'Royal Mail' },
]

export function CountryStep({ countryCode, onCountryChange, onNext }: Props) {
  const handleSelect = (code: CountryCode) => {
    onCountryChange(code)
    onNext()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Where are you sending this?</h2>
        <p className="text-base-content/60 text-sm mt-1">Choose the destination country for your postcard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COUNTRIES.map((country) => (
          <button
            key={country.code}
            type="button"
            className={`card bg-base-100 border-2 transition-all hover:shadow-lg ${
              countryCode === country.code
                ? 'border-primary shadow-primary/20 shadow-md'
                : 'border-base-300 hover:border-primary/50'
            }`}
            onClick={() => handleSelect(country.code)}
          >
            <div className="card-body p-4 items-center text-center">
              <span className="text-5xl mb-2">{country.flag}</span>
              <h3 className="card-title text-base">{country.name}</h3>
              <p className="text-xs text-base-content/60">{country.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
