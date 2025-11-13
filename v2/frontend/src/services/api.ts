/**
 * API Client
 * 
 * TODO: Generate from OpenAPI spec
 * Für jetzt: Manuelle Implementierung
 */

import { mapRFC7807Error, isRFC7807Error } from './error-mapper';
import type { AuthResponse } from '@/features/identity/types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * Auth Headers
 */
function getAuthHeaders(): HeadersInit {
  try {
    const raw = localStorage.getItem('sensarion-auth');
    if (!raw) return { 'Content-Type': 'application/json' };
    const parsed = JSON.parse(raw) as { accessToken?: string | null };
    const token = parsed.accessToken;
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

/**
 * Handle JSON Response
 */
async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (isRFC7807Error(error)) {
      throw mapRFC7807Error(error);
    }
    throw new Error((error as any).message || 'Unknown API error');
  }
  return response.json() as Promise<T>;
}

/**
 * Auth API
 */
export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    return handleJson<AuthResponse>(response);
  },
  
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    return handleJson<AuthResponse>(response);
  }
};

/**
 * Patient API
 */
export interface Patient {
  id: string;
  tenantId: string;
  version: number;
  name: { given: string[]; family: string };
  birthDate: string;
  gender?: 'm' | 'w' | 'd';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientDTO {
  name: { given: string[]; family: string };
  birthDate: string;
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
}

export interface UpdatePatientDTO {
  name?: { given: string[]; family: string };
  birthDate?: string;
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
}

export const patientApi = {
  async getPatients(_tenantId: string, search?: string): Promise<{ patients: Patient[]; total: number }> {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    
    const response = await fetch(`${API_BASE_URL}/patients?${params}`, {
      headers: getAuthHeaders()
    });
    
    return handleJson(response);
  },
  
  async getPatient(id: string, _tenantId: string): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getAuthHeaders()
    });
    
    return handleJson<Patient>(response);
  },
  
  async createPatient(dto: CreatePatientDTO): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    
    return handleJson<Patient>(response);
  },
  
  async updatePatient(id: string, dto: UpdatePatientDTO, version: number): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'If-Match': version.toString()
      },
      body: JSON.stringify(dto)
    });
    
    return handleJson<Patient>(response);
  },
  
  async deletePatient(id: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete patient');
    }
  },

  // Vitalwerte
  async getVitals(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/vitals`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ vitals: any[] }>(response);
    return data.vitals;
  },

  async createVital(patientId: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/vitals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ vital: any }>(response);
    return data.vital;
  },

  async updateVital(patientId: string, vitalId: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/vitals/${vitalId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ vital: any }>(response);
    return data.vital;
  },

  async deleteVital(patientId: string, vitalId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/vitals/${vitalId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error('Failed to delete vital');
    }
  },

  // Allergien
  async getAllergies(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/allergies`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ allergies: any[] }>(response);
    return data.allergies;
  },

  async createAllergy(patientId: string, dto: { substance: string; severity: string; notes?: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/allergies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ allergy: any }>(response);
    return data.allergy;
  },

  async updateAllergy(patientId: string, allergyId: string, dto: { substance: string; severity: string; notes?: string; reason: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/allergies/${allergyId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ allergy: any }>(response);
    return data.allergy;
  },

  async deleteAllergy(patientId: string, allergyId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/allergies/${allergyId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error('Failed to delete allergy');
    }
  },

  // Medikationen
  async getMedications(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/medications`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ medications: any[] }>(response);
    return data.medications;
  },

  async createMedication(patientId: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/medications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ medication: any }>(response);
    return data.medication;
  },

  async updateMedication(patientId: string, medicationId: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/medications/${medicationId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ medication: any }>(response);
    return data.medication;
  },

  async deleteMedication(patientId: string, medicationId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/medications/${medicationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error('Failed to delete medication');
    }
  },

  // Diagnosen
  async getDiagnoses(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/diagnoses`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ diagnoses: any[] }>(response);
    return data.diagnoses;
  },

  async createDiagnosis(patientId: string, dto: { text: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/diagnoses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ diagnosis: any }>(response);
    return data.diagnosis;
  },

  async updateDiagnosis(patientId: string, diagnosisId: string, dto: { text: string; reason: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/diagnoses/${diagnosisId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ diagnosis: any }>(response);
    return data.diagnosis;
  },

  async deleteDiagnosis(patientId: string, diagnosisId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/diagnoses/${diagnosisId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error('Failed to delete diagnosis');
    }
  },

  // Befunde
  async getFindings(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/findings`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ findings: any[] }>(response);
    return data.findings;
  },

  async createFinding(patientId: string, dto: { text: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/findings`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ finding: any }>(response);
    return data.finding;
  },

  async updateFinding(patientId: string, findingId: string, dto: { text: string; reason: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/findings/${findingId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ finding: any }>(response);
    return data.finding;
  },

  async deleteFinding(patientId: string, findingId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/findings/${findingId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error('Failed to delete finding');
    }
  },

  // Notizen
  async getNotes(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/notes`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ notes: any[] }>(response);
    return data.notes;
  },

  async createNote(patientId: string, dto: { text: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ note: any }>(response);
    return data.note;
  },

  // Encounters
  async getEncounters(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/encounters`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ encounters: any[] }>(response);
    return data.encounters;
  },

  async createEncounter(patientId: string, dto: { date: string; location?: string; reason?: string; summary?: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ encounter: any }>(response);
    return data.encounter;
  },

  // Audit Logs
  async getAuditLogs(patientId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/audit-logs`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ logs: any[] }>(response);
    return data.logs;
  }
};

/**
 * Admin API
 */
export const adminApi = {
  async verifyPassword(password: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${API_BASE_URL}/admin/verify-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    });
    return handleJson(response);
  },

  async getUsers(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ users: any[] }>(response);
    return data.users;
  },

  async createUser(dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ user: any }>(response);
    return data.user;
  },

  async updateUser(id: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ user: any }>(response);
    return data.user;
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  },

  async getSettings(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      headers: getAuthHeaders()
    });
    return handleJson(response);
  },

  async updateSettings(settings: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ settings })
    });
    return handleJson(response);
  },

  async getPermissions(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/admin/permissions`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ permissions: string[] }>(response);
    return data.permissions;
  }
};

/**
 * Calendar API
 */
export const calendarApi = {
  async getCalendars(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/calendars`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ calendars: any[] }>(response);
    return data.calendars;
  },

  async createCalendar(dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calendars`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ calendar: any }>(response);
    return data.calendar;
  },

  async updateCalendar(id: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calendars/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ calendar: any }>(response);
    return data.calendar;
  },

  async deleteCalendar(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/calendars/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to delete calendar');
    }
  },

  async getEvents(params?: { calendarIds?: string[]; startDate?: string; endDate?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.calendarIds) {
      params.calendarIds.forEach(id => queryParams.append('calendarIds', id));
    }
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`${API_BASE_URL}/calendar-events?${queryParams}`, {
      headers: getAuthHeaders()
    });
    const data = await handleJson<{ events: any[] }>(response);
    return data.events;
  },

  async createEvent(dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calendar-events`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ event: any }>(response);
    return data.event;
  },

  async updateEvent(id: string, dto: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calendar-events/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(dto)
    });
    const data = await handleJson<{ event: any }>(response);
    return data.event;
  },

  async deleteEvent(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/calendar-events/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  },

  async checkConflicts(params: {
    startTime: string;
    endTime: string;
    location?: string;
    participantIds?: string[];
    excludeEventId?: string;
  }): Promise<{ conflicts: any[]; hasConflicts: boolean }> {
    const queryParams = new URLSearchParams();
    queryParams.append('startTime', params.startTime);
    queryParams.append('endTime', params.endTime);
    if (params.location) queryParams.append('location', params.location);
    if (params.participantIds) {
      params.participantIds.forEach(id => queryParams.append('participantIds', id));
    }
    if (params.excludeEventId) queryParams.append('excludeEventId', params.excludeEventId);

    const response = await fetch(`${API_BASE_URL}/calendar-events/check-conflicts?${queryParams}`, {
      headers: getAuthHeaders()
    });
    return handleJson(response);
  },

  async addParticipant(eventId: string, userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/calendar-events/${eventId}/participants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    const data = await handleJson<{ participant: any }>(response);
    return data.participant;
  },

  async removeParticipant(eventId: string, userId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/calendar-events/${eventId}/participants/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to remove participant');
    }
  }
};

