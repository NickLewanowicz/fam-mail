import { useState, useEffect } from 'react'
import type { Address } from '../../types/address'

interface Props {
  address: Address | null
  returnAddress: Address | null
  onAddressChange: (addr: Address) => void
  onReturnAddressChange: (addr: Address) => void
  onNext: () => void
  onBack: () => void
  countryCode?: string
  recent?: Address[]
}

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US',
}

export function AddressStep({ address, returnAddress, onAddressChange, onReturnAddressChange, onNext, onBack, countryCode, recent = [] }: Props) {
  const [form, setForm] = useState<Address>(address ?? { ...EMPTY_ADDRESS, countryCode: countryCode ?? 'US' })
  const [returnForm, setReturnForm] = useState<Address>(returnAddress ?? { ...EMPTY_ADDRESS, countryCode: countryCode ?? 'US' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [returnErrors, setReturnErrors] = useState<Record<string, string>>({})
  const [showReturn, setShowReturn] = useState(!!returnAddress)

  useEffect(() => {
    if (address) setForm(address)
  }, [address])

  useEffect(() => {
    if (returnAddress) setReturnForm(returnAddress)
  }, [returnAddress])

  const update = (field: keyof Address, value: string) => {
    const next = { ...form, [field]: value }
    setForm(next)
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const updateReturn = (field: keyof Address, value: string) => {
    const next = { ...returnForm, [field]: value }
    setReturnForm(next)
    setReturnErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (addr: Address): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!addr.firstName.trim()) e.firstName = 'Required'
    if (!addr.lastName.trim()) e.lastName = 'Required'
    if (!addr.addressLine1.trim()) e.addressLine1 = 'Required'
    if (!addr.city.trim()) e.city = 'Required'
    if (!addr.provinceOrState.trim()) e.provinceOrState = 'Required'
    if (!addr.postalOrZip.trim()) {
      e.postalOrZip = 'Required'
      return e
    }
    // Preflight the postal format per destination — mirrors backend rules so
    // users learn about a bad ZIP before reaching the review step.
    const country = (addr.countryCode || 'US').toUpperCase()
    const country_ = country === addr.countryCode ? addr.countryCode : addr.countryCode.toUpperCase()
    if (country_ === 'US' && !/^\d{5}(-\d{4})?$/.test(addr.postalOrZip)) {
      e.postalOrZip = 'ZIP must be 5 digits or 5+4 (e.g. 12345)'
    } else if (country_ === 'CA' && !/^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/.test(addr.postalOrZip)) {
      e.postalOrZip = 'Postal code must look like A1A 1A1'
    } else if (country_ === 'GB' && !/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(addr.postalOrZip)) {
      e.postalOrZip = 'Postcode must look like SW1A 1AA'
    }
    if (!/^[A-Za-z]{2}$/.test(addr.provinceOrState)) {
      e.provinceOrState = 'Use a 2-letter code (e.g. CT, ON)'
    }
    return e
  }

  const handleSubmit = () => {
    const recipientErrors = validate(form)
    setErrors(recipientErrors)

    if (!showReturn) {
      // Copy recipient address as return address if return section not shown
      if (Object.keys(recipientErrors).length === 0) {
        onAddressChange(form)
        onReturnAddressChange(form)
        onNext()
      }
      return
    }

    const senderErrors = validate(returnForm)
    setReturnErrors(senderErrors)

    if (Object.keys(recipientErrors).length === 0 && Object.keys(senderErrors).length === 0) {
      onAddressChange(form)
      onReturnAddressChange(returnForm)
      onNext()
    }
  }

  // Standard autofill tokens so iOS/Chrome can fill the address form (#104)
  const AUTOCOMPLETE: Partial<Record<keyof Address, string>> = {
    firstName: 'given-name',
    lastName: 'family-name',
    addressLine1: 'address-line1',
    addressLine2: 'address-line2',
    city: 'address-level2',
    provinceOrState: 'address-level1',
    postalOrZip: 'postal-code',
  }

  const field = (label: string, key: keyof Address, placeholder: string, half = false, isReturn = false) => (
    <div className={half ? 'w-full' : 'w-full'}>
      <label className="block py-1 text-xs font-medium text-zinc-600">{label}</label>
      <input
        type="text"
        maxLength={key === 'provinceOrState' ? 2 : key === 'postalOrZip' ? 10 : 120}
        autoComplete={AUTOCOMPLETE[key]}
        inputMode={key === 'postalOrZip' ? ((isReturn ? returnForm.countryCode : form.countryCode).toUpperCase() === 'US' ? 'numeric' : 'text') : undefined}
        className={`w-full rounded-md border bg-white px-2.5 h-11 text-base text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors ${
          isReturn
            ? returnErrors[key] ? 'border-red-400 focus:border-red-500' : 'border-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400'
            : errors[key] ? 'border-red-400 focus:border-red-500' : 'border-zinc-300 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400'
        }`}
        placeholder={placeholder}
        value={isReturn ? returnForm[key] : form[key]}
        onChange={e => isReturn ? updateReturn(key, e.target.value) : update(key, e.target.value)}
      />
      {(isReturn ? returnErrors[key] : errors[key]) && (
        <p className="mt-1 text-xs text-red-600">{(isReturn ? returnErrors[key] : errors[key])}</p>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">Recipient Address</h2>
        <p className="text-zinc-600 text-sm mt-1">Where should we send this postcard?</p>
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1.5">Send to a recent recipient</p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r, i) => (
              <button
                key={`${r.firstName}-${r.addressLine1}-${i}`}
                type="button"
                onClick={() => setForm({ ...EMPTY_ADDRESS, ...r })}
                className="inline-flex items-center min-h-11 px-3 rounded-full border border-zinc-200 bg-white text-xs text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                {r.firstName} {r.lastName} · {r.city}
              </button>
            ))}
          </div>
        </div>
      )}

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
        <div>
          <label className="block py-1 text-xs font-medium text-zinc-600">Country</label>
          {countryCode ? (
            <div className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-700">
              {countryCode === 'US' ? 'United States' : countryCode === 'CA' ? 'Canada' : countryCode === 'GB' ? 'United Kingdom' : countryCode}
            </div>
          ) : (
            <select
              className="w-full rounded-md border border-zinc-300 bg-white px-2.5 h-11 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
              value={form.countryCode} onChange={e => update('countryCode', e.target.value)}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
            </select>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 my-2" />

      {/* Return address toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            checked={showReturn}
            onChange={e => setShowReturn(e.target.checked)}
          />
          <span className="text-sm text-zinc-800">Use a different return address</span>
        </label>
        {!showReturn && (
          <p className="text-zinc-500 text-xs mt-1 ml-7">If unchecked, the recipient address will also be used as the return address.</p>
        )}
      </div>

      {showReturn && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Return Address</h3>
            <p className="text-zinc-600 text-sm mt-1">Where should the postcard be returned from?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('First Name', 'firstName', 'Jane', true, true)}
            {field('Last Name', 'lastName', 'Doe', true, true)}
          </div>
          {field('Address Line 1', 'addressLine1', '123 Main Street', false, true)}
          {field('Address Line 2', 'addressLine2', 'Apt 4B (optional)', false, true)}
          <div className="grid grid-cols-2 gap-3">
            {field('City', 'city', 'Toronto', true, true)}
            {field('State/Province', 'provinceOrState', 'ON', true, true)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('ZIP/Postal Code', 'postalOrZip', 'M5V 2T6', true, true)}
            <div>
              <label className="block py-1 text-xs font-medium text-zinc-600">Country</label>
              <select
                className="w-full rounded-md border border-zinc-300 bg-white px-2.5 h-11 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
                value={returnForm.countryCode} onChange={e => updateReturn('countryCode', e.target.value)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between pt-4">
        <button
          className="px-4 h-11 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="px-4 h-11 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          onClick={handleSubmit}
        >
          Next: Review
        </button>
      </div>
    </div>
  )
}
