import { useEffect, useState } from 'react'
import type { Address } from '../../types/address'

interface AddressFormProps {
  onSubmit: (address: Address) => void
  initialAddress?: Partial<Address>
}

const emptyForm = (initial?: Partial<Address>): Address => ({
  firstName: initial?.firstName ?? '',
  lastName: initial?.lastName ?? '',
  addressLine1: initial?.addressLine1 ?? '',
  addressLine2: initial?.addressLine2 ?? '',
  city: initial?.city ?? '',
  provinceOrState: initial?.provinceOrState ?? '',
  postalOrZip: initial?.postalOrZip ?? '',
  countryCode: initial?.countryCode ?? 'CA',
})

const FIELD_ERRORS: Record<keyof Address, string> = {
  firstName: 'First name is required',
  lastName: 'Last name is required',
  addressLine1: 'Address is required',
  addressLine2: '',
  city: 'City is required',
  provinceOrState: 'Province/State is required',
  postalOrZip: 'Postal/Zip code is required',
  countryCode: 'Country is required',
}

export function AddressForm({ onSubmit, initialAddress }: AddressFormProps) {
  const [values, setValues] = useState<Address>(() => emptyForm(initialAddress))
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({})

  useEffect(() => {
    setValues(emptyForm(initialAddress))
  }, [initialAddress])

  const setField = (field: keyof Address, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const validateField = (field: keyof Address, v: Address): string | undefined => {
    if (field === 'addressLine2') return undefined
    const raw = v[field]
    const str = typeof raw === 'string' ? raw.trim() : ''
    if (!str) return FIELD_ERRORS[field]
    return undefined
  }

  const validateAll = (v: Address): Partial<Record<keyof Address, string>> => {
    const next: Partial<Record<keyof Address, string>> = {}
    ;(Object.keys(FIELD_ERRORS) as (keyof Address)[]).forEach(k => {
      if (k === 'addressLine2') return
      const msg = validateField(k, v)
      if (msg) next[k] = msg
    })
    return next
  }

  const handleBlur = (field: keyof Address) => {
    if (field === 'addressLine2') return
    const msg = validateField(field, values)
    setErrors(prev => ({ ...prev, [field]: msg }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateAll(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSubmit({
      ...values,
      addressLine2: values.addressLine2?.trim() ?? '',
    })
  }

  return (
    <div className="bg-base-100 shadow-xl rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6">Recipient Address</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">First Name <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="John"
                className={`input input-bordered ${errors.firstName ? 'input-error' : ''}`}
                value={values.firstName}
                onChange={e => setField('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
              />
              {errors.firstName && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.firstName}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Last Name <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="Doe"
                className={`input input-bordered ${errors.lastName ? 'input-error' : ''}`}
                value={values.lastName}
                onChange={e => setField('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
              />
              {errors.lastName && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.lastName}</span>
                </label>
              )}
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Address Line 1 <span className="text-error">*</span></span>
            </label>
            <input
              type="text"
              placeholder="123 Main Street"
              className={`input input-bordered ${errors.addressLine1 ? 'input-error' : ''}`}
              value={values.addressLine1}
              onChange={e => setField('addressLine1', e.target.value)}
              onBlur={() => handleBlur('addressLine1')}
            />
            {errors.addressLine1 && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.addressLine1}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Address Line 2</span>
            </label>
            <input
              type="text"
              placeholder="Apt 4B (optional)"
              className="input input-bordered"
              value={values.addressLine2}
              onChange={e => setField('addressLine2', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">City <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="City"
                className={`input input-bordered ${errors.city ? 'input-error' : ''}`}
                value={values.city}
                onChange={e => setField('city', e.target.value)}
                onBlur={() => handleBlur('city')}
              />
              {errors.city && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.city}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Province/State <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="Province/State"
                className={`input input-bordered ${errors.provinceOrState ? 'input-error' : ''}`}
                value={values.provinceOrState}
                onChange={e => setField('provinceOrState', e.target.value)}
                onBlur={() => handleBlur('provinceOrState')}
              />
              {errors.provinceOrState && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.provinceOrState}</span>
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Postal/Zip Code <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="Postal/Zip Code"
                className={`input input-bordered ${errors.postalOrZip ? 'input-error' : ''}`}
                value={values.postalOrZip}
                onChange={e => setField('postalOrZip', e.target.value)}
                onBlur={() => handleBlur('postalOrZip')}
              />
              {errors.postalOrZip && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.postalOrZip}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Country <span className="text-error">*</span></span>
              </label>
              <select
                className={`select select-bordered ${errors.countryCode ? 'select-error' : ''}`}
                value={values.countryCode}
                onChange={e => setField('countryCode', e.target.value)}
                onBlur={() => handleBlur('countryCode')}
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="other">Other</option>
              </select>
              {errors.countryCode && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.countryCode}</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="btn btn-primary">
              Save Address
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
