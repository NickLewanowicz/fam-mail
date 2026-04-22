import { useState, useEffect } from 'react'
import type { Address } from '../../types/address'

interface Props {
  address: Address | null
  onAddressChange: (addr: Address) => void
  onNext: () => void
  onBack: () => void
  countryCode?: string
}

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US',
}

export function AddressStep({ address, onAddressChange, onNext, onBack, countryCode }: Props) {
  const [form, setForm] = useState<Address>(address ?? { ...EMPTY_ADDRESS, countryCode: countryCode ?? 'US' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (address) setForm(address)
  }, [address])

  const update = (field: keyof Address, value: string) => {
    const next = { ...form, [field]: value }
    setForm(next)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.addressLine1.trim()) e.addressLine1 = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.provinceOrState.trim()) e.provinceOrState = 'Required'
    if (!form.postalOrZip.trim()) e.postalOrZip = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onAddressChange(form)
      onNext()
    }
  }

  const field = (label: string, key: keyof Address, placeholder: string, half = false) => (
    <div className={`form-control ${half ? 'w-full' : ''}`}>
      <label className="label py-1"><span className="label-text text-sm">{label}</span></label>
      <input
        type="text"
        className={`input input-bordered input-sm ${errors[key] ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => update(key, e.target.value)}
      />
      {errors[key] && <label className="label py-0"><span className="label-text-alt text-error">{errors[key]}</span></label>}
    </div>
  )

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold">Recipient Address</h2>
        <p className="text-base-content/60 text-sm mt-1">Where should we send this postcard?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {field('First Name', 'firstName', 'Jane', true)}
        {field('Last Name', 'lastName', 'Doe', true)}
      </div>
      {field('Address Line 1', 'addressLine1', '123 Main Street')}
      {field('Address Line 2', 'addressLine2', 'Apt 4B (optional)')}
      <div className="grid grid-cols-2 gap-3">
        {field('City', 'city', 'Toronto', true)}
        {field('State/Province', 'provinceOrState', 'ON', true)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('ZIP/Postal Code', 'postalOrZip', 'M5V 2T6', true)}
        <div className="form-control">
          <label className="label py-1"><span className="label-text text-sm">Country</span></label>
          {countryCode ? (
            <div className="select select-bordered select-sm bg-base-200">
              {countryCode === 'US' ? 'United States' : countryCode === 'CA' ? 'Canada' : countryCode === 'GB' ? 'United Kingdom' : countryCode}
            </div>
          ) : (
            <select className="select select-bordered select-sm" value={form.countryCode} onChange={e => update('countryCode', e.target.value)}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Next: Review</button>
      </div>
    </div>
  )
}
