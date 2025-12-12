import { useForm } from 'react-hook-form'
import type { Address } from '../../types/address'

interface AddressFormProps {
  onSubmit: (address: Address) => void
  initialAddress?: Partial<Address>
}

export function AddressForm({ onSubmit, initialAddress }: AddressFormProps) {
  const { register, handleSubmit, formState: { errors }, trigger } = useForm<Address>({
    defaultValues: {
      firstName: initialAddress?.firstName || '',
      lastName: initialAddress?.lastName || '',
      addressLine1: initialAddress?.addressLine1 || '',
      addressLine2: initialAddress?.addressLine2 || '',
      city: initialAddress?.city || '',
      provinceOrState: initialAddress?.provinceOrState || '',
      postalOrZip: initialAddress?.postalOrZip || '',
      countryCode: initialAddress?.countryCode || 'CA',
    },
    mode: 'onChange',
  })

  return (
    <div className="bg-base-100 shadow-xl rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6">Recipient Address</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">First Name <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                placeholder="John"
                className={`input input-bordered ${errors.firstName ? 'input-error' : ''}`}
                {...register('firstName', {
                  required: 'First name is required',
                  onChange: () => trigger('firstName')
                })}
              />
              {errors.firstName && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.firstName.message}</span>
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
                {...register('lastName', {
                  required: 'Last name is required',
                  onChange: () => trigger('lastName')
                })}
              />
              {errors.lastName && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.lastName.message}</span>
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
              {...register('addressLine1', {
                required: 'Address is required',
                onChange: () => trigger('addressLine1')
              })}
            />
            {errors.addressLine1 && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.addressLine1.message}</span>
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
              {...register('addressLine2')}
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
                {...register('city', {
                  required: 'City is required',
                  onChange: () => trigger('city')
                })}
              />
              {errors.city && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.city.message}</span>
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
                {...register('provinceOrState', {
                  required: 'Province/State is required',
                  onChange: () => trigger('provinceOrState')
                })}
              />
              {errors.provinceOrState && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.provinceOrState.message}</span>
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
                {...register('postalOrZip', {
                  required: 'Postal/Zip code is required',
                  onChange: () => trigger('postalOrZip')
                })}
              />
              {errors.postalOrZip && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.postalOrZip.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Country <span className="text-error">*</span></span>
              </label>
              <select
                className={`select select-bordered ${errors.countryCode ? 'select-error' : ''}`}
                {...register('countryCode', {
                  required: 'Country is required',
                  onChange: () => trigger('countryCode')
                })}
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="other">Other</option>
              </select>
              {errors.countryCode && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.countryCode.message}</span>
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
