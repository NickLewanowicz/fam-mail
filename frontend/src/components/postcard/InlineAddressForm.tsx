import { useState, useEffect } from 'react'
import type { Address } from '../../types/address'

interface Props {
  address: Address | null
  onAddressChange: (addr: Address) => void
  onClose: () => void
}

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US',
}

export function InlineAddressForm({ address, onAddressChange, onClose }: Props) {
  const [form, setForm] = useState<Address>(address ?? EMPTY_ADDRESS)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (address) setForm(address)
  }, [address])

  const update = (field: keyof Address, value: string) => {
    const next = { ...form, [field]: value }
    setForm(next)
    setErrors(prev => ({ ...prev, [field]: '' }))
    // Live-save on each change
    onAddressChange(next)
  }

  const handleDone = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.addressLine1.trim()) e.addressLine1 = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.provinceOrState.trim()) e.provinceOrState = 'Required'
    if (!form.postalOrZip.trim()) e.postalOrZip = 'Required'
    setErrors(e)
    if (Object.keys(e).length === 0) {
      onClose()
    }
  }

  const inputCls = (key: keyof Address) =>
    `input input-bordered input-xs w-full text-xs ${errors[key] ? 'input-error' : ''}`

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col rounded-lg overflow-hidden z-10 p-2">
      <div className="flex justify-between items-center mb-1 shrink-0">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Recipient</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs !min-h-0 h-5 px-1 text-xs text-gray-500"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">First Name<span className="text-error">*</span></span></label>
            <input className={inputCls('firstName')} placeholder="Jane" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
            {errors.firstName && <span className="text-[9px] text-error">{errors.firstName}</span>}
          </div>
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">Last Name<span className="text-error">*</span></span></label>
            <input className={inputCls('lastName')} placeholder="Doe" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
            {errors.lastName && <span className="text-[9px] text-error">{errors.lastName}</span>}
          </div>
        </div>
        <div>
          <label className="label py-0"><span className="label-text text-[10px]">Address<span className="text-error">*</span></span></label>
          <input className={inputCls('addressLine1')} placeholder="123 Main Street" value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} />
          {errors.addressLine1 && <span className="text-[9px] text-error">{errors.addressLine1}</span>}
        </div>
        <div>
          <label className="label py-0"><span className="label-text text-[10px]">Apt/Suite</span></label>
          <input className={inputCls('addressLine2')} placeholder="Apt 4B" value={form.addressLine2 ?? ''} onChange={e => update('addressLine2', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">City<span className="text-error">*</span></span></label>
            <input className={inputCls('city')} placeholder="Toronto" value={form.city} onChange={e => update('city', e.target.value)} />
            {errors.city && <span className="text-[9px] text-error">{errors.city}</span>}
          </div>
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">State<span className="text-error">*</span></span></label>
            <input className={inputCls('provinceOrState')} placeholder="ON" value={form.provinceOrState} onChange={e => update('provinceOrState', e.target.value)} />
            {errors.provinceOrState && <span className="text-[9px] text-error">{errors.provinceOrState}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">ZIP/Postal<span className="text-error">*</span></span></label>
            <input className={inputCls('postalOrZip')} placeholder="M5V 2T6" value={form.postalOrZip} onChange={e => update('postalOrZip', e.target.value)} />
            {errors.postalOrZip && <span className="text-[9px] text-error">{errors.postalOrZip}</span>}
          </div>
          <div>
            <label className="label py-0"><span className="label-text text-[10px]">Country</span></label>
            <select className="select select-bordered select-xs w-full text-xs" value={form.countryCode} onChange={e => update('countryCode', e.target.value)}>
              <option value="US">US</option>
              <option value="CA">CA</option>
              <option value="GB">GB</option>
              <option value="AU">AU</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
