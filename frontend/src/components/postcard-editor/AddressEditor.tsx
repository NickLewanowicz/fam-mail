import { useState, useCallback, useEffect } from 'react';
import type { Address } from '../../types/address';
import {
  validateAddress,
  formatPostalCode,
  capitalizeWords,
  formatStateProvince,
} from '../../utils/postal';

interface AddressEditorProps {
  address: Address | null;
  onChange: (address: Address) => void;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  includeReturnAddress?: boolean;
  returnAddress?: Address | null;
  onReturnAddressChange?: (returnAddress: Address) => void;
  showSafeZones?: boolean;
}

interface AddressFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: 'text' | 'email';
  maxLength?: number;
  autoCapitalize?: boolean;
}

function AddressField({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  type = 'text',
  maxLength,
  autoCapitalize = false,
}: AddressFieldProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    if (autoCapitalize && newValue.length > 0) {
      newValue = capitalizeWords(newValue);
    }

    if (maxLength && newValue.length <= maxLength) {
      onChange(newValue);
    } else if (!maxLength) {
      onChange(newValue);
    }
  }, [onChange, maxLength, autoCapitalize]);

  return (
    <div className="address-field">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-sm border rounded transition-colors duration-200 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-200 focus:border-blue-400 focus:ring-blue-100'
        } focus:outline-none focus:ring-2`}
        maxLength={maxLength}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

export function AddressEditor({
  address,
  onChange,
  isEditing: externalIsEditing = false,
  onEditingChange,
  includeReturnAddress = false,
  returnAddress,
  onReturnAddressChange,
  showSafeZones = false,
}: AddressEditorProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use external editing state if provided, otherwise use internal state
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;

  const setIsEditing = useCallback((newState: boolean) => {
    if (onEditingChange) {
      onEditingChange(newState);
    } else {
      setInternalIsEditing(newState);
    }
  }, [onEditingChange]);

  // Initialize empty address if none provided
  const currentAddress = address || {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    provinceOrState: '',
    postalOrZip: '',
    countryCode: 'US',
  };

  const currentReturnAddress = returnAddress || {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    provinceOrState: '',
    postalOrZip: '',
    countryCode: 'US',
  };

  // Validate address on change
  useEffect(() => {
    if (address) {
      const validation = validateAddress(address);
      const errorMap: Record<string, string> = {};

      validation.errors.forEach(error => {
        if (error.includes('Street address')) errorMap.addressLine1 = error;
        if (error.includes('City')) errorMap.city = error;
        if (error.includes('State/Province')) errorMap.provinceOrState = error;
        if (error.includes('ZIP/Postal')) errorMap.postalOrZip = error;
      });

      setErrors(errorMap);
    }
  }, [address]);

  // Handle address field changes
  const handleAddressChange = useCallback((field: keyof Address, value: string) => {
    const updatedAddress = {
      ...currentAddress,
      [field]: value,
    };

    // Auto-format postal code
    if (field === 'postalOrZip') {
      updatedAddress[field] = formatPostalCode(value, updatedAddress.countryCode);
    }

    // Auto-format state/province
    if (field === 'provinceOrState') {
      updatedAddress[field] = formatStateProvince(value, updatedAddress.countryCode);
    }

    onChange(updatedAddress);
  }, [currentAddress, onChange]);

  // Handle return address field changes
  const handleReturnAddressChange = useCallback((field: keyof Address, value: string) => {
    if (!onReturnAddressChange) return;

    const updatedAddress = {
      ...currentReturnAddress,
      [field]: value,
    };

    if (field === 'postalOrZip') {
      updatedAddress[field] = formatPostalCode(value, updatedAddress.countryCode);
    }

    if (field === 'provinceOrState') {
      updatedAddress[field] = formatStateProvince(value, updatedAddress.countryCode);
    }

    onReturnAddressChange(updatedAddress);
  }, [currentReturnAddress, onReturnAddressChange]);

  // Handle click to edit
  const handleEditClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing, setIsEditing]);

  // Click outside to exit editing (type-safe approach)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('.address-editor') && isEditing) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditing, setIsEditing]);

  const isValid = Object.keys(errors).length === 0;

  return (
    <div className="address-editor h-full flex flex-col relative" onClick={handleEditClick}>
      {/* Safe zone overlay */}
      {showSafeZones && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="w-full h-full border-4 border-red-400 border-opacity-30 rounded">
            <div className="absolute -top-6 left-0 text-xs text-red-400 font-medium">
              Address Block (Do not write in this area)
            </div>
          </div>
        </div>
      )}

      {/* Stamp placeholder */}
      <div className="stamp-placeholder mb-4 flex-shrink-0">
        <div className="w-full h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50">
          <span className="text-xs text-gray-400 text-center">
            Stamp<br/>
            <span className="text-[10px]">(1" × 0.875")</span>
          </span>
        </div>
      </div>

      {/* Address forms */}
      <div className={`address-forms flex-1 ${isEditing ? 'space-y-4' : 'space-y-3'}`}>
        {/* Return Address */}
        {includeReturnAddress && (
          <div className="return-address-section">
            <div className="text-xs font-medium text-gray-600 mb-2">Return Address (Optional)</div>
            {isEditing ? (
              <div className="space-y-2">
                <AddressField
                  label="Name"
                  value={`${returnAddress?.firstName || ''} ${returnAddress?.lastName || ''}`.trim()}
                  onChange={(value) => {
                    const names = value.split(' ');
                    handleReturnAddressChange('firstName', names[0] || '');
                    handleReturnAddressChange('lastName', names.slice(1).join(' ') || '');
                  }}
                  placeholder="Your Name"
                  maxLength={50}
                  autoCapitalize={true}
                />
                <AddressField
                  label="Street Address"
                  value={returnAddress?.addressLine1 || ''}
                  onChange={(value) => handleReturnAddressChange('addressLine1', value)}
                  placeholder="123 Main St"
                  maxLength={50}
                  autoCapitalize={true}
                />
                <AddressField
                  label="Apt, Suite, etc."
                  value={returnAddress?.addressLine2 || ''}
                  onChange={(value) => handleReturnAddressChange('addressLine2', value)}
                  placeholder="Apt 4B"
                  maxLength={30}
                  autoCapitalize={true}
                />
                <div className="grid grid-cols-2 gap-2">
                  <AddressField
                    label="City"
                    value={returnAddress?.city || ''}
                    onChange={(value) => handleReturnAddressChange('city', value)}
                    placeholder="City"
                    maxLength={30}
                    autoCapitalize={true}
                  />
                  <AddressField
                    label="State"
                    value={returnAddress?.provinceOrState || ''}
                    onChange={(value) => handleReturnAddressChange('provinceOrState', value)}
                    placeholder="State"
                    maxLength={2}
                  />
                </div>
                <AddressField
                  label="ZIP Code"
                  value={returnAddress?.postalOrZip || ''}
                  onChange={(value) => handleReturnAddressChange('postalOrZip', value)}
                  placeholder="12345"
                  maxLength={10}
                />
              </div>
            ) : (
              returnAddress?.addressLine1 ? (
                <div className="text-xs text-gray-600 space-y-1">
                  <div>{returnAddress.firstName} {returnAddress.lastName}</div>
                  <div>{returnAddress.addressLine1}</div>
                  {returnAddress.addressLine2 && <div>{returnAddress.addressLine2}</div>}
                  <div>
                    {returnAddress.city}, {returnAddress.provinceOrState} {returnAddress.postalOrZip}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">
                  Click to add return address
                </div>
              )
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 my-3"></div>
          </div>
        )}

        {/* Recipient Address */}
        <div className="recipient-address-section">
          <div className="text-xs font-medium text-gray-600 mb-2">Recipient Address</div>
          {isEditing ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <AddressField
                  label="First Name"
                  value={currentAddress.firstName || ''}
                  onChange={(value) => handleAddressChange('firstName', value)}
                  placeholder="John"
                  required={true}
                  maxLength={25}
                  autoCapitalize={true}
                />
                <AddressField
                  label="Last Name"
                  value={currentAddress.lastName || ''}
                  onChange={(value) => handleAddressChange('lastName', value)}
                  placeholder="Doe"
                  required={true}
                  maxLength={25}
                  autoCapitalize={true}
                />
              </div>
              <AddressField
                label="Street Address"
                value={currentAddress.addressLine1 || ''}
                onChange={(value) => handleAddressChange('addressLine1', value)}
                placeholder="123 Main St"
                required={true}
                maxLength={50}
                autoCapitalize={true}
                error={errors.addressLine1}
              />
              <AddressField
                label="Apt, Suite, etc."
                value={currentAddress.addressLine2 || ''}
                onChange={(value) => handleAddressChange('addressLine2', value)}
                placeholder="Apt 4B"
                maxLength={30}
                autoCapitalize={true}
              />
              <div className="grid grid-cols-2 gap-2">
                <AddressField
                  label="City"
                  value={currentAddress.city || ''}
                  onChange={(value) => handleAddressChange('city', value)}
                  placeholder="City"
                  required={true}
                  maxLength={30}
                  autoCapitalize={true}
                  error={errors.city}
                />
                <AddressField
                  label="State/Province"
                  value={currentAddress.provinceOrState || ''}
                  onChange={(value) => handleAddressChange('provinceOrState', value)}
                  placeholder="State"
                  required={true}
                  maxLength={2}
                  error={errors.provinceOrState}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AddressField
                  label="ZIP/Postal Code"
                  value={currentAddress.postalOrZip || ''}
                  onChange={(value) => handleAddressChange('postalOrZip', value)}
                  placeholder="12345"
                  required={true}
                  maxLength={10}
                  error={errors.postalOrZip}
                />
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={currentAddress.countryCode}
                    onChange={(e) => handleAddressChange('countryCode', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="MX">Mexico</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              {/* Validation status */}
              <div className={`text-xs px-2 py-1 rounded ${
                isValid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                {isValid ? '✓ Address format is valid' : '⚠ Please complete required fields'}
              </div>
            </div>
          ) : (
            address?.addressLine1 ? (
              <div className="text-xs text-gray-800 space-y-1 font-mono">
                <div className="font-medium">
                  {address.firstName} {address.lastName}
                </div>
                <div>{address.addressLine1}</div>
                {address.addressLine2 && <div>{address.addressLine2}</div>}
                <div>
                  {address.city}, {address.provinceOrState} {address.postalOrZip}
                </div>
                {address.countryCode !== 'US' && (
                  <div>
                    {address.countryCode === 'CA' ? 'Canada' :
                     address.countryCode === 'GB' ? 'United Kingdom' :
                     address.countryCode === 'MX' ? 'Mexico' :
                     address.countryCode === 'AU' ? 'Australia' :
                     address.countryCode}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-400 italic min-h-[60px] flex items-center">
                Click to add recipient address
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}