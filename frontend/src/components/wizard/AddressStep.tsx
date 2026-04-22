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
}

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US',
}

export function AddressStep({ address, returnAddress, onAddressChange, onReturnAddressChange, onNext, onBack, countryCode }: Props) {
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
    if (!addr.postalOrZip.trim()) e.postalOrZip = 'Required'
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

  const field = (label: string, key: keyof Address, placeholder: string, half = false, isReturn = false) => (
    <div className={`form-control ${half ? 'w-full' : ''}`}>
      <label className="label py-1"><span className="label-text text-sm">{label}</span></label>
      <input
        type="text"
        className={`input input-bordered input-sm ${isReturn ? (returnErrors[key] ? 'input-error' : '') : (errors[key] ? 'input-error' : '')}`}
        placeholder={placeholder}
        value={isReturn ? returnForm[key] : form[key]}
        onChange={e => isReturn ? updateReturn(key, e.target.value) : update(key, e.target.value)}
      />
      {(isReturn ? returnErrors[key] : errors[key]) && <label className="label py-0"><span className="label-text-alt text-error">{(isReturn ? returnErrors[key] : errors[key])}</span></label>}
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

      <div className="divider"></div>

      {/* Return address toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={showReturn}
            onChange={e => setShowReturn(e.target.checked)}
          />
          <span className="label-text">Use a different return address</span>
        </label>
        {!showReturn && (
          <p className="text-base-content/50 text-xs mt-1 ml-8">If unchecked, the recipient address will also be used as the return address.</p>
        )}
      </div>

      {showReturn && (
        <>
          <div>
            <h3 className="text-lg font-semibold">Return Address</h3>
            <p className="text-base-content/60 text-sm mt-1">Where should the postcard be returned from?</p>
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
            <div className="form-control">
              <label className="label py-1"><span className="label-text text-sm">Country</span></label>
              <select className="select select-bordered select-sm" value={returnForm.countryCode} onChange={e => updateReturn('countryCode', e.target.value)}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between pt-4">
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Next: Review</button>
      </div>
    </div>
  )
}
