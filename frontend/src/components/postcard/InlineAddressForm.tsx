import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Address } from '../../types/address'

interface Props {
  address: Address | null
  onAddressChange: (addr: Address) => void
  onClose: () => void
  countryCode?: string
}

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', addressLine1: '', addressLine2: '',
  city: '', provinceOrState: '', postalOrZip: '', countryCode: 'US',
}

export function InlineAddressForm({ address, onAddressChange, onClose, countryCode }: Props) {
  const [form, setForm] = useState<Address>(address ?? { ...EMPTY_ADDRESS, countryCode: (countryCode as Address['countryCode']) ?? 'US' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (address) setForm(address)
  }, [address])

  const update = (field: keyof Address, value: string) => {
    const next = { ...form, [field]: value }
    setForm(next)
    setErrors(prev => ({ ...prev, [field]: '' }))
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
    if (Object.keys(e).length === 0) onClose()
  }

  const inputCls = (key: keyof Address) =>
    `w-full px-2 py-1 text-[11px] rounded-lg border outline-none transition-colors ${
      errors[key]
        ? 'border-red-300 bg-red-50 focus:border-red-500'
        : 'border-zinc-200 bg-white focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300'
    }`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white flex flex-col rounded-xl overflow-hidden z-10 p-2.5"
    >
      <div className="flex justify-between items-center mb-2 shrink-0">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Recipient</span>
        <button
          type="button"
          className="press px-2.5 py-0.5 rounded-md font-medium bg-zinc-900 text-white text-[10px] hover:bg-zinc-800"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-firstName">First Name <span className="text-red-500">*</span></label>
            <input className={inputCls('firstName')} placeholder="Jane" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-lastName">Last Name <span className="text-red-500">*</span></label>
            <input className={inputCls('lastName')} placeholder="Doe" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-addressLine1">Address <span className="text-red-500">*</span></label>
          <input className={inputCls('addressLine1')} placeholder="123 Main Street" value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-addressLine2">Apt / Suite <span className="text-red-500">*</span></label>
          <input className={inputCls('addressLine2')} placeholder="Apt 4B" value={form.addressLine2 ?? ''} onChange={e => update('addressLine2', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-city">City <span className="text-error">*</span></label>
            <input className={inputCls('city')} placeholder="Toronto" value={form.city} onChange={e => update('city', e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-provinceOrState">State <span className="text-red-500">*</span></label>
            <input className={inputCls('provinceOrState')} placeholder="ON" value={form.provinceOrState} onChange={e => update('provinceOrState', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block" htmlFor="iaf-postalOrZip">ZIP / Postal <span className="text-red-500">*</span></label>
            <input className={inputCls('postalOrZip')} placeholder="M5V 2T6" value={form.postalOrZip} onChange={e => update('postalOrZip', e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-zinc-600 mb-0.5 block">Country</label>
            {countryCode ? (
              <div className="w-full px-2 py-1 text-[11px] rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500">
                {countryCode}
              </div>
            ) : (
              <select className="w-full px-2 py-1 text-[11px] rounded-lg border border-zinc-200 bg-white" value={form.countryCode} onChange={e => update('countryCode', e.target.value)}>
                <option value="US">US</option>
                <option value="CA">CA</option>
                <option value="GB">GB</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
