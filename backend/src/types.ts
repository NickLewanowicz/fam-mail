export interface Address {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  provinceOrState: string;
  postalOrZip: string;
  countryCode: string;
}

export interface PostcardRequest {
  to: Address;
  from?: Address;
  frontImageUrl?: string;
  message: string;
}

export interface PostGridPostcardResponse {
  id: string;
  status: string;
  createdAt: string;
  expectedDeliveryDate?: string;
}

export interface PostGridError {
  status: number;
  message: string;
  error?: {
    type: string;
    message: string;
  };
}
