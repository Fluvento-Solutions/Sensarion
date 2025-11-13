/**
 * Update Patient DTO
 * 
 * Request DTO für Patient-Update
 */
export interface UpdatePatientDTO {
  name?: {
    given: string[];
    family: string;
  };
  birthDate?: string; // ISO Date
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
  address?: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    mobile?: string;
  };
  insurance?: {
    number?: string;
    type?: string;
    provider?: string;
  };
}

