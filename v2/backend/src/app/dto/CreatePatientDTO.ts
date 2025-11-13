/**
 * Create Patient DTO
 * 
 * Request DTO für Patient-Erstellung
 */
export interface CreatePatientDTO {
  name: {
    given: string[];
    family: string;
  };
  birthDate: string; // ISO Date (YYYY-MM-DD)
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

