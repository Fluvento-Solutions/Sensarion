export type PracticeSummary = {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
};

export type TeamSummary = {
  id: string;
  name: string;
  role: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  shortName: string;
  practice: PracticeSummary;
  teams: TeamSummary[];
  isPracticeAdmin: boolean;
};

type AuthSuccessResponse = {
  status: 'ok';
  token: string;
  user: UserProfile;
};

type AuthErrorResponse = {
  status: 'error';
  message: string;
  code?: string;
};

const defaultHeaders: HeadersInit = {
  'Content-Type': 'application/json'
};

const handleJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as AuthErrorResponse;
    throw new Error(error.message ?? 'Unbekannter API-Fehler');
  }

  return response.json() as Promise<T>;
};

export const login = async (email: string, password: string): Promise<AuthSuccessResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password })
  });

  return handleJson<AuthSuccessResponse>(response);
};

export const devLogin = async (
  email: string,
  password?: string
): Promise<AuthSuccessResponse> => {
  const response = await fetch('/api/auth/dev-login', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({ email, password })
  });

  return handleJson<AuthSuccessResponse>(response);
};

export const logout = async (token: string) => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? 'Logout fehlgeschlagen');
  }
};

type ProfileSuccessResponse = {
  status: 'ok';
  user: UserProfile;
};

export const fetchProfile = async (userId: string, token: string): Promise<UserProfile> => {
  const response = await fetch(`/api/auth/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await handleJson<ProfileSuccessResponse>(response);
  return data.user;
};

type OllamaGenerateRequest = {
  prompt: string;
  model?: string;
  context?: string;
};

type OllamaSuccessResponse = {
  status: 'ok';
  result: {
    response: string;
  };
};

type OllamaErrorResponse = {
  status: 'error';
  message: string;
};

export const generateWithOllama = async (
  request: OllamaGenerateRequest
): Promise<string> => {
  const response = await fetch('/api/ollama/generate', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      prompt: request.prompt,
      model: request.model || 'llama3',
      context: request.context
    })
  });

  const data = await handleJson<OllamaSuccessResponse | OllamaErrorResponse>(response);
  
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.result.response;
};

// Patienten-API Types
export type PatientName = {
  given: string[];
  family: string;
};

export type PatientAddress = {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
};

export type PatientContact = {
  phone?: string;
  email?: string;
  mobile?: string;
};

export type PatientInsurance = {
  number?: string;
  type?: string;
  provider?: string;
};

export type PatientVitals = {
  bp_systolic?: number;
  bp_diastolic?: number;
  hr?: number;
  temperature?: number;
  spo2?: number;
  glucose?: number;
  bmi?: number;
  updated_at?: string;
};

export type PatientVitalHistory = {
  id: string;
  recordedAt: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  hr?: number;
  temperature?: number;
  spo2?: number;
  glucose?: number;
  bmi?: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export type PatientAllergy = {
  id?: string;
  substance: string;
  severity: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export type PatientMedication = {
  id?: string;
  name: string;
  dose?: string; // Legacy support
  dose_morning?: string;
  dose_midday?: string;
  dose_evening?: string;
  dose_night?: string;
  notes?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export type Patient = {
  patient_id: string;
  version: number;
  name: PatientName;
  birth_date: string;
  gender?: string | null;
  tags: string[];
  address?: PatientAddress | null;
  contact?: PatientContact | null;
  insurance?: PatientInsurance | null;
  vitals_latest: PatientVitals | null;
  vitals_history?: PatientVitalHistory[];
  allergies: PatientAllergy[];
  medications: PatientMedication[];
};

export type PatientNote = {
  note_id: string;
  created_at: string;
  author: string;
  text: string;
};

export type PatientEncounter = {
  encounter_id: string;
  date: string;
  location: string | null;
  reason: string | null;
  summary: string | null;
};

export type PatientAuditLog = {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'delete' | 'add' | 'remove';
  entity_type: 'patient' | 'vital' | 'allergy' | 'medication' | 'note' | 'encounter';
  entity_id?: string;
  entity_name?: string;
  changes?: Record<string, { old?: string; new?: string }>;
  author: string;
  description: string;
};

type PatientsListResponse = {
  status: 'ok';
  patients: Patient[];
};

type PatientResponse = {
  status: 'ok';
  patient: Patient;
};

type PatientNotesResponse = {
  status: 'ok';
  notes: PatientNote[];
};

type PatientNoteResponse = {
  status: 'ok';
  note: PatientNote;
};

type PatientEncountersResponse = {
  status: 'ok';
  encounters: PatientEncounter[];
};

type PatientEncounterResponse = {
  status: 'ok';
  encounter: PatientEncounter;
};

type ErrorResponse = {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
  currentVersion?: number;
};

const getAuthHeaders = (): HeadersInit => {
  try {
    const raw = localStorage.getItem('sensarion-auth');
    if (!raw) return defaultHeaders;
    const parsed = JSON.parse(raw) as { token?: string | null };
    const token = parsed.token;
    return {
      ...defaultHeaders,
      ...(token && { Authorization: `Bearer ${token}` })
    };
  } catch {
    return defaultHeaders;
  }
};

// GET /api/patients - Liste & Suche
export const getPatients = async (q?: string): Promise<Patient[]> => {
  const url = q ? `/api/patients?q=${encodeURIComponent(q)}` : '/api/patients';
  const response = await fetch(url, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<PatientsListResponse | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.patients;
};

// GET /api/patients/:id - Patient-Details
export const getPatient = async (id: string): Promise<Patient> => {
  const response = await fetch(`/api/patients/${id}`, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<PatientResponse | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.patient;
};

// POST /api/patients - Neuen Patienten erstellen
export const createPatient = async (data: {
  name: PatientName;
  birthDate: string;
  tags?: string[];
  vitalsLatest?: PatientVitals;
  allergies?: PatientAllergy[];
  medications?: PatientMedication[];
}): Promise<Patient> => {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: data.name,
      birthDate: data.birthDate,
      tags: data.tags || [],
      vitalsLatest: data.vitalsLatest,
      allergies: data.allergies || [],
      medications: data.medications || []
    })
  });

  const result = await handleJson<PatientResponse | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.patient;
};

// PATCH /api/patients/:id - Update (mit optimistic locking)
export const updatePatient = async (
  id: string,
  data: Partial<{
    name: PatientName;
    birthDate: string;
    gender?: string;
    tags: string[];
    address?: PatientAddress;
    contact?: PatientContact;
    insurance?: PatientInsurance;
    vitalsLatest: PatientVitals;
    allergies: PatientAllergy[];
    medications: PatientMedication[];
  }>,
  version: number
): Promise<Patient> => {
  const response = await fetch(`/api/patients/${id}`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'If-Match': version.toString()
    },
    body: JSON.stringify(data)
  });

  const result = await handleJson<PatientResponse | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.patient;
};

// GET /api/patients/:id/notes - Notizen auflisten
export const getPatientNotes = async (id: string): Promise<PatientNote[]> => {
  const response = await fetch(`/api/patients/${id}/notes`, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<PatientNotesResponse | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.notes;
};

// POST /api/patients/:id/notes - Notiz hinzufügen
export const createPatientNote = async (id: string, text: string): Promise<PatientNote> => {
  const response = await fetch(`/api/patients/${id}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text })
  });

  const data = await handleJson<PatientNoteResponse | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.note;
};

// GET /api/patients/:id/encounters - Encounters auflisten
export const getPatientEncounters = async (id: string): Promise<PatientEncounter[]> => {
  const response = await fetch(`/api/patients/${id}/encounters`, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<PatientEncountersResponse | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.encounters;
};

// POST /api/patients/:id/encounters - Encounter hinzufügen
export const createPatientEncounter = async (
  id: string,
  data: {
    date: string;
    location?: string;
    reason?: string;
    summary?: string;
  }
): Promise<PatientEncounter> => {
  const response = await fetch(`/api/patients/${id}/encounters`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<PatientEncounterResponse | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.encounter;
};

// GET /api/patients/:id/audit-logs - Audit-Logs abrufen
export const getPatientAuditLogs = async (id: string): Promise<PatientAuditLog[]> => {
  const response = await fetch(`/api/patients/${id}/audit-logs`, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<{ status: 'ok'; logs: PatientAuditLog[] } | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.logs;
};

// GET /api/patients/:id/vitals - Vitalwerte-Historie abrufen
export const getPatientVitals = async (id: string): Promise<PatientVitalHistory[]> => {
  const response = await fetch(`/api/patients/${id}/vitals`, {
    headers: getAuthHeaders()
  });

  const data = await handleJson<{ status: 'ok'; vitals: PatientVitalHistory[] } | ErrorResponse>(response);
  if (data.status === 'error') {
    throw new Error(data.message);
  }

  return data.vitals;
};

// POST /api/patients/:id/vitals - Vitalwerte hinzufügen
export const createPatientVital = async (
  id: string,
  data: {
    bp_systolic?: number;
    bp_diastolic?: number;
    hr?: number;
    temperature?: number;
    spo2?: number;
    glucose?: number;
    bmi?: number;
  }
): Promise<PatientVitalHistory> => {
  const response = await fetch(`/api/patients/${id}/vitals`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; vital: PatientVitalHistory } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.vital;
};

// PATCH /api/patients/:id/vitals/:vitalId - Vitalwerte bearbeiten
export const updatePatientVital = async (
  id: string,
  vitalId: string,
  data: {
    bp_systolic?: number;
    bp_diastolic?: number;
    hr?: number;
    temperature?: number;
    spo2?: number;
    glucose?: number;
    bmi?: number;
  }
): Promise<PatientVitalHistory> => {
  const response = await fetch(`/api/patients/${id}/vitals/${vitalId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; vital: PatientVitalHistory } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.vital;
};

// DELETE /api/patients/:id/vitals/:vitalId - Vitalwerte Soft Delete
export const deletePatientVital = async (id: string, vitalId: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/vitals/${vitalId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

// POST /api/patients/:id/allergies - Allergie hinzufügen
export const addPatientAllergy = async (
  id: string,
  data: { substance: string; severity: string }
): Promise<PatientAllergy> => {
  const response = await fetch(`/api/patients/${id}/allergies`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; allergy: PatientAllergy } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.allergy;
};

// PATCH /api/patients/:id/allergies/:allergyId - Allergie bearbeiten
export const updatePatientAllergy = async (
  id: string,
  allergyId: string,
  data: { substance: string; severity: string }
): Promise<PatientAllergy> => {
  const response = await fetch(`/api/patients/${id}/allergies/${allergyId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; allergy: PatientAllergy } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.allergy;
};

// DELETE /api/patients/:id/allergies/:allergyId - Allergie Soft Delete
export const deletePatientAllergy = async (id: string, allergyId: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/allergies/${allergyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

// POST /api/patients/:id/medications - Medikation hinzufügen
export const addPatientMedication = async (
  id: string,
  data: { 
    name: string; 
    dose_morning?: string;
    dose_midday?: string;
    dose_evening?: string;
    dose_night?: string;
    notes?: string;
  }
): Promise<PatientMedication> => {
  const response = await fetch(`/api/patients/${id}/medications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; medication: PatientMedication } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.medication;
};

// PATCH /api/patients/:id/medications/:medicationId - Medikation bearbeiten
export const updatePatientMedication = async (
  id: string,
  medicationId: string,
  data: {
    name: string;
    dose_morning?: string;
    dose_midday?: string;
    dose_evening?: string;
    dose_night?: string;
    notes?: string;
  }
): Promise<PatientMedication> => {
  const response = await fetch(`/api/patients/${id}/medications/${medicationId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; medication: PatientMedication } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.medication;
};

// DELETE /api/patients/:id/medications/:medicationId - Medikation Soft Delete
export const deletePatientMedication = async (id: string, medicationId: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/medications/${medicationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

