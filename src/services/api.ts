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

// POST /api/ollama/improve-text - Text mit KI verbessern (Streaming)
export const improveTextWithAI = async (
  text: string,
  systemPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const response = await fetch('/api/ollama/improve-text', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, systemPrompt })
  });

  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler beim Verbessern des Textes');
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // SSE-Format: Jede Zeile beginnt mit "data: " gefolgt von JSON oder "[DONE]"
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          
          if (data === '[DONE]') {
            return result;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              result += parsed.chunk;
              if (onChunk) {
                onChunk(parsed.chunk);
              }
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore JSON parse errors for non-JSON lines
            console.warn('Failed to parse SSE data:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
};

// POST /api/ollama/review-patient - Patient mit KI überprüfen (Streaming)
export const reviewPatientWithAI = async (
  patientId: string,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const response = await fetch('/api/ollama/review-patient', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ patientId })
  });

  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler bei der KI-Überprüfung');
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // SSE-Format: Jede Zeile beginnt mit "data: " gefolgt von JSON oder "[DONE]"
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          
          if (data === '[DONE]') {
            return result;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              result += parsed.chunk;
              if (onChunk) {
                onChunk(parsed.chunk);
              }
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore JSON parse errors for non-JSON lines
            console.warn('Failed to parse SSE data:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
};

// POST /api/ollama/review-patient-data - Patientendaten mit KI überprüfen (vor Erstellung)
export const reviewPatientDataWithAI = async (
  patientData: {
    givenNames: string;
    familyName: string;
    birthDate: string;
    gender?: string;
    tags?: string;
    address?: PatientAddress;
    contact?: PatientContact;
    insurance?: PatientInsurance;
    anamnesis?: {
      reason?: string;
      complaints?: string;
      previousIllnesses?: string;
      medications?: PatientMedication[];
      allergies?: PatientAllergy[];
    };
    vitals?: PatientVitals;
  },
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const response = await fetch('/api/ollama/review-patient-data', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ patientData })
  });

  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler bei der KI-Überprüfung');
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // SSE-Format: Jede Zeile beginnt mit "data: " gefolgt von JSON oder "[DONE]"
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          
          if (data === '[DONE]') {
            return result;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              result += parsed.chunk;
              if (onChunk) {
                onChunk(parsed.chunk);
              }
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore JSON parse errors for non-JSON lines
            console.warn('Failed to parse SSE data:', data, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return result;
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
  weight?: number;
  height?: number;
  bmi?: number;
  pain_scale?: number;
  pmh_responses?: number[];
  pmh_total?: number;
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
  weight?: number;
  height?: number;
  bmi?: number;
  pain_scale?: number;
  pmh_responses?: number[];
  pmh_total?: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export type PatientAllergy = {
  id?: string;
  substance: string;
  severity: string;
  notes?: string;
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

export type PatientDiagnosis = {
  id?: string;
  text: string;
  created_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
};

export type PatientFinding = {
  id?: string;
  text: string;
  created_at?: string;
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
  diagnoses?: PatientDiagnosis[];
  findings?: PatientFinding[];
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
  entity_type: 'patient' | 'vital' | 'allergy' | 'medication' | 'note' | 'encounter' | 'diagnosis' | 'finding';
  entity_id?: string;
  entity_name?: string;
  changes?: Record<string, { old?: string; new?: string }>;
  author: string;
  description: string;
  reason?: string;
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
  gender?: 'm' | 'w' | 'd';
  tags?: string[];
  address?: PatientAddress;
  contact?: PatientContact;
  insurance?: PatientInsurance;
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
      gender: data.gender,
      tags: data.tags || [],
      address: data.address,
      contact: data.contact,
      insurance: data.insurance,
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
    reason: string;
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
    weight?: number;
    height?: number;
    bmi?: number;
    pain_scale?: number;
    pmh_responses?: number[];
    pmh_total?: number;
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
    weight?: number;
    height?: number;
    bmi?: number;
    pain_scale?: number;
    reason: string;
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
export const deletePatientVital = async (id: string, vitalId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/vitals/${vitalId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

// POST /api/patients/:id/allergies - Allergie hinzufügen
export const addPatientAllergy = async (
  id: string,
  data: { substance: string; severity: string; notes?: string }
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
  data: { substance: string; severity: string; notes?: string; reason: string }
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
export const deletePatientAllergy = async (id: string, allergyId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/allergies/${allergyId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
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
    reason: string;
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
export const deletePatientMedication = async (id: string, medicationId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/medications/${medicationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

// POST /api/patients/:id/diagnoses - Diagnose hinzufügen
export const addPatientDiagnosis = async (
  id: string,
  data: { text: string }
): Promise<PatientDiagnosis> => {
  const response = await fetch(`/api/patients/${id}/diagnoses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; diagnosis: PatientDiagnosis } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.diagnosis;
};

// PATCH /api/patients/:id/diagnoses/:diagnosisId - Diagnose bearbeiten
export const updatePatientDiagnosis = async (
  id: string,
  diagnosisId: string,
  data: { text: string; reason: string }
): Promise<PatientDiagnosis> => {
  const response = await fetch(`/api/patients/${id}/diagnoses/${diagnosisId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; diagnosis: PatientDiagnosis } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.diagnosis;
};

// DELETE /api/patients/:id/diagnoses/:diagnosisId - Diagnose Soft Delete
export const deletePatientDiagnosis = async (id: string, diagnosisId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/diagnoses/${diagnosisId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  });

  const result = await handleJson<{ status: 'ok'; message: string } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }
};

// POST /api/patients/:id/findings - Befund hinzufügen
export const addPatientFinding = async (
  id: string,
  data: { text: string }
): Promise<PatientFinding> => {
  const response = await fetch(`/api/patients/${id}/findings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; finding: PatientFinding } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.finding;
};

// PATCH /api/patients/:id/findings/:findingId - Befund bearbeiten
export const updatePatientFinding = async (
  id: string,
  findingId: string,
  data: { text: string; reason: string }
): Promise<PatientFinding> => {
  const response = await fetch(`/api/patients/${id}/findings/${findingId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });

  const result = await handleJson<{ status: 'ok'; finding: PatientFinding } | ErrorResponse>(response);
  if (result.status === 'error') {
    throw new Error(result.message);
  }

  return result.finding;
};

// DELETE /api/patients/:id/findings/:findingId - Befund Soft Delete
export const deletePatientFinding = async (id: string, findingId: string, reason: string): Promise<void> => {
  const response = await fetch(`/api/patients/${id}/findings/${findingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    const result = await handleJson<ErrorResponse>(response);
    throw new Error(result.message);
  }
};

// Setup API Functions
export type SetupStatus = {
  status: 'ok';
  installationComplete: boolean;
  hasConfig: boolean;
};

export const getSetupStatus = async (): Promise<SetupStatus> => {
  const response = await fetch('/api/setup/status');
  return handleJson<SetupStatus>(response);
};

export type InitSetupData = {
  practiceName: string;
  practiceCode: string;
  adminEmail: string;
  adminPassword: string;
  adminDisplayName: string;
  adminShortName?: string;
};

export type InitSetupResponse = {
  status: 'ok';
  message: string;
  practice: {
    id: string;
    name: string;
    code: string;
  };
  admin: {
    id: string;
    email: string;
    displayName: string;
  };
};

export const initSetup = async (data: InitSetupData): Promise<InitSetupResponse> => {
  const response = await fetch('/api/setup/init', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data)
  });
  return handleJson<InitSetupResponse>(response);
};

export const testPostgresConnection = async (): Promise<{ status: 'ok'; message: string }> => {
  const response = await fetch('/api/setup/test/postgres');
  return handleJson<{ status: 'ok'; message: string }>(response);
};

export const testOllamaConnection = async (): Promise<{ status: 'ok'; message: string }> => {
  const response = await fetch('/api/setup/test/ollama');
  return handleJson<{ status: 'ok'; message: string }>(response);
};

export type OllamaModel = {
  name: string;
  modified_at: string;
  size: number;
};

export const getOllamaModels = async (): Promise<OllamaModel[]> => {
  const response = await fetch('/api/setup/models');
  const data = await handleJson<{ status: 'ok'; models: OllamaModel[] }>(response);
  return data.models;
};

export type WhitelabelData = {
  practiceId: string;
  logoUrl?: string;
  primaryColor?: string;
};

export const updateWhitelabel = async (data: WhitelabelData): Promise<{
  status: 'ok';
  practice: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
  };
}> => {
  const response = await fetch('/api/setup/whitelabel', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data)
  });
  return handleJson(response);
};

// Calendar API Types
export type Calendar = {
  id: string;
  name: string;
  type: 'PERSONAL' | 'ROOM' | 'PURPOSE';
  roomId?: string | null;
  purpose?: string | null;
  color?: string | null;
  ownerId?: string | null;
  owner?: {
    id: string;
    displayName: string;
    shortName: string;
    email: string;
  } | null;
  room?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventParticipant = {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    shortName: string;
    email: string;
  };
  createdAt: string;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  patientId?: string | null;
  patient?: {
    id: string;
    name: any;
  } | null;
  recurrenceRule?: {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    endAfter?: number;
    endDate?: string;
  } | null;
  recurrenceEndDate?: string | null;
  calendar: {
    id: string;
    name: string;
    type: string;
    color?: string | null;
  };
  participants: CalendarEventParticipant[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarConflict = {
  type: 'location' | 'participant';
  eventId: string;
  eventTitle: string;
  calendarName: string;
  startTime: string;
  endTime: string;
  location?: string;
  conflictingParticipants?: Array<{
    id: string;
    displayName: string;
  }>;
};

// Calendar API Functions
export const getCalendars = async (): Promise<Calendar[]> => {
  const response = await fetch('/api/calendar/calendars', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; calendars: Calendar[] }>(response);
  return data.calendars;
};

export const getCalendar = async (id: string): Promise<Calendar> => {
  const response = await fetch(`/api/calendar/calendars/${id}`, {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; calendar: Calendar }>(response);
  return data.calendar;
};

export const createCalendar = async (data: {
  name: string;
  type: 'PERSONAL' | 'ROOM' | 'PURPOSE';
  roomId?: string;
  purpose?: string;
  color?: string;
}): Promise<Calendar> => {
  const response = await fetch('/api/calendar/calendars', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; calendar: Calendar }>(response);
  return result.calendar;
};

export const updateCalendar = async (id: string, data: {
  name?: string;
  type?: 'PERSONAL' | 'ROOM' | 'PURPOSE';
  roomId?: string;
  purpose?: string;
  color?: string;
}): Promise<Calendar> => {
  const response = await fetch(`/api/calendar/calendars/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; calendar: Calendar }>(response);
  return result.calendar;
};

export const deleteCalendar = async (id: string): Promise<void> => {
  const response = await fetch(`/api/calendar/calendars/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler beim Löschen des Kalenders');
  }
};

export const getCalendarEvents = async (params?: {
  calendarIds?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<CalendarEvent[]> => {
  const queryParams = new URLSearchParams();
  if (params?.calendarIds) {
    params.calendarIds.forEach(id => queryParams.append('calendarIds', id));
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  const response = await fetch(`/api/calendar/events?${queryParams.toString()}`, {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; events: CalendarEvent[] }>(response);
  return data.events;
};

export const getCalendarEvent = async (id: string): Promise<CalendarEvent> => {
  const response = await fetch(`/api/calendar/events/${id}`, {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; event: CalendarEvent }>(response);
  return data.event;
};

export const createCalendarEvent = async (data: {
  calendarId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  patientId?: string;
  recurrenceRule?: {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    endAfter?: number;
    endDate?: string;
  };
  recurrenceEndDate?: string;
  participantIds?: string[];
}): Promise<CalendarEvent> => {
  const response = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; event: CalendarEvent }>(response);
  return result.event;
};

export const updateCalendarEvent = async (id: string, data: {
  calendarId?: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  patientId?: string;
  recurrenceRule?: {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
    endAfter?: number;
    endDate?: string;
  };
  recurrenceEndDate?: string;
}): Promise<CalendarEvent> => {
  const response = await fetch(`/api/calendar/events/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; event: CalendarEvent }>(response);
  return result.event;
};

export const deleteCalendarEvent = async (id: string, deleteAll?: boolean): Promise<void> => {
  const queryParams = deleteAll ? '?deleteAll=true' : '';
  const response = await fetch(`/api/calendar/events/${id}${queryParams}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler beim Löschen des Termins');
  }
};

export const addEventParticipant = async (eventId: string, userId: string): Promise<CalendarEventParticipant> => {
  const response = await fetch(`/api/calendar/events/${eventId}/participants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId })
  });
  const result = await handleJson<{ status: 'ok'; participant: CalendarEventParticipant }>(response);
  return result.participant;
};

export const removeEventParticipant = async (eventId: string, userId: string): Promise<void> => {
  const response = await fetch(`/api/calendar/events/${eventId}/participants/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await handleJson<ErrorResponse>(response);
    throw new Error(error.message || 'Fehler beim Entfernen des Teilnehmers');
  }
};

export const checkEventConflicts = async (params: {
  startTime: string;
  endTime: string;
  location?: string;
  participantIds?: string[];
  excludeEventId?: string;
}): Promise<{ conflicts: CalendarConflict[]; hasConflicts: boolean }> => {
  const queryParams = new URLSearchParams();
  queryParams.append('startTime', params.startTime);
  queryParams.append('endTime', params.endTime);
  if (params.location) {
    queryParams.append('location', params.location);
  }
  if (params.participantIds) {
    params.participantIds.forEach(id => queryParams.append('participantIds', id));
  }
  if (params.excludeEventId) {
    queryParams.append('excludeEventId', params.excludeEventId);
  }

  const response = await fetch(`/api/calendar/events/conflicts?${queryParams.toString()}`, {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; conflicts: CalendarConflict[]; hasConflicts: boolean }>(response);
  return { conflicts: data.conflicts, hasConflicts: data.hasConflicts };
};

export type Room = {
  id: string;
  name: string;
  description?: string | null;
};

export type CalendarUser = {
  id: string;
  email: string;
  displayName: string;
  shortName: string;
};

export const getRooms = async (): Promise<Room[]> => {
  const response = await fetch('/api/calendar/rooms', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; rooms: Room[] }>(response);
  return data.rooms;
};

export const getCalendarUsers = async (): Promise<CalendarUser[]> => {
  const response = await fetch('/api/calendar/users', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; users: CalendarUser[] }>(response);
  return data.users;
};

// Admin API Types and Functions
export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  shortName: string;
  isPracticeAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserType = {
  id: string;
  practiceId: string;
  name: string;
  description: string | null;
  defaultPermissions: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTeam = {
  id: string;
  name: string;
  description: string | null;
  members: Array<{
    id: string;
    userId: string;
    teamId: string;
    role: string;
    user: {
      id: string;
      email: string;
      displayName: string;
      shortName: string;
    };
  }>;
};

export type AdminRoom = {
  id: string;
  practiceId: string;
  name: string;
  description: string | null;
  roomTypeId: string | null;
  roomType: RoomType | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomType = {
  id: string;
  practiceId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PracticeSettings = {
  id: string;
  settings: Record<string, any>;
  hasAdminPassword: boolean;
};

// Admin Password Verification
export const verifyAdminPassword = async (password: string): Promise<{ status: 'ok'; valid: boolean }> => {
  const response = await fetch('/api/admin/verify-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password })
  });
  return handleJson<{ status: 'ok'; valid: boolean }>(response);
};

// User Management
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  const response = await fetch('/api/admin/users', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; users: AdminUser[] }>(response);
  return data.users;
};

export const createAdminUser = async (data: {
  email: string;
  password: string;
  displayName: string;
  shortName: string;
  isPracticeAdmin?: boolean;
}): Promise<AdminUser> => {
  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; user: AdminUser }>(response);
  return result.user;
};

export const updateAdminUser = async (id: string, data: {
  email?: string;
  password?: string;
  displayName?: string;
  shortName?: string;
  isPracticeAdmin?: boolean;
}): Promise<AdminUser> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; user: AdminUser }>(response);
  return result.user;
};

export const deleteAdminUser = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Löschen des Benutzers');
  }
};

// User Types Management
export const getUserTypes = async (): Promise<UserType[]> => {
  const response = await fetch('/api/admin/user-types', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; userTypes: UserType[] }>(response);
  return data.userTypes;
};

export const createUserType = async (data: {
  name: string;
  description?: string;
  defaultPermissions?: string[];
}): Promise<UserType> => {
  const response = await fetch('/api/admin/user-types', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; userType: UserType }>(response);
  return result.userType;
};

export const updateUserType = async (id: string, data: {
  name?: string;
  description?: string;
  defaultPermissions?: string[];
}): Promise<UserType> => {
  const response = await fetch(`/api/admin/user-types/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; userType: UserType }>(response);
  return result.userType;
};

export const deleteUserType = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/user-types/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Löschen des Usertyps');
  }
};

// Team Management
export const getAdminTeams = async (): Promise<AdminTeam[]> => {
  const response = await fetch('/api/admin/teams', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; teams: AdminTeam[] }>(response);
  return data.teams;
};

export const createAdminTeam = async (data: {
  name: string;
  description?: string;
}): Promise<{ id: string; name: string; description: string | null }> => {
  const response = await fetch('/api/admin/teams', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; team: { id: string; name: string; description: string | null } }>(response);
  return result.team;
};

export const updateAdminTeam = async (id: string, data: {
  name?: string;
  description?: string;
}): Promise<{ id: string; name: string; description: string | null }> => {
  const response = await fetch(`/api/admin/teams/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; team: { id: string; name: string; description: string | null } }>(response);
  return result.team;
};

export const deleteAdminTeam = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/teams/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Löschen des Teams');
  }
};

export const addTeamMember = async (teamId: string, data: {
  userId: string;
  role: 'PRACTICE_ADMIN' | 'PHYSICIAN' | 'MFA' | 'ADMINISTRATION' | 'CUSTOM';
}): Promise<{ id: string; userId: string; teamId: string; role: string; user: { id: string; email: string; displayName: string; shortName: string } }> => {
  const response = await fetch(`/api/admin/teams/${teamId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; membership: { id: string; userId: string; teamId: string; role: string; user: { id: string; email: string; displayName: string; shortName: string } } }>(response);
  return result.membership;
};

export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const response = await fetch(`/api/admin/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Entfernen des Team-Mitglieds');
  }
};

// Room Management
export const getAdminRooms = async (): Promise<AdminRoom[]> => {
  const response = await fetch('/api/admin/rooms', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; rooms: AdminRoom[] }>(response);
  return data.rooms;
};

export const createAdminRoom = async (data: {
  name: string;
  description?: string;
  roomTypeId?: string;
}): Promise<AdminRoom> => {
  const response = await fetch('/api/admin/rooms', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; room: AdminRoom }>(response);
  return result.room;
};

export const updateAdminRoom = async (id: string, data: {
  name?: string;
  description?: string;
  roomTypeId?: string | null;
}): Promise<AdminRoom> => {
  const response = await fetch(`/api/admin/rooms/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; room: AdminRoom }>(response);
  return result.room;
};

export const deleteAdminRoom = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/rooms/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Löschen des Raums');
  }
};

// Room Types Management
export const getRoomTypes = async (): Promise<RoomType[]> => {
  const response = await fetch('/api/admin/room-types', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; roomTypes: RoomType[] }>(response);
  return data.roomTypes;
};

export const createRoomType = async (data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<RoomType> => {
  const response = await fetch('/api/admin/room-types', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; roomType: RoomType }>(response);
  return result.roomType;
};

export const updateRoomType = async (id: string, data: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<RoomType> => {
  const response = await fetch(`/api/admin/room-types/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleJson<{ status: 'ok'; roomType: RoomType }>(response);
  return result.roomType;
};

export const deleteRoomType = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/room-types/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Löschen des Raumtyps');
  }
};

// Permissions
export const getAvailablePermissions = async (): Promise<string[]> => {
  const response = await fetch('/api/admin/permissions', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; permissions: string[] }>(response);
  return data.permissions;
};

export const getUserPermissions = async (userId: string): Promise<string[]> => {
  const response = await fetch(`/api/admin/users/${userId}/permissions`, {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; permissions: string[] }>(response);
  return data.permissions;
};

export const updateUserPermissions = async (userId: string, data: {
  membershipId: string;
  permissions: string[];
}): Promise<void> => {
  const response = await fetch(`/api/admin/users/${userId}/permissions`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Aktualisieren der Berechtigungen');
  }
};

// Practice Settings
export const getPracticeSettings = async (): Promise<PracticeSettings> => {
  const response = await fetch('/api/admin/settings', {
    headers: getAuthHeaders()
  });
  const data = await handleJson<{ status: 'ok'; settings: PracticeSettings }>(response);
  return data.settings;
};

export const updatePracticeSettings = async (settings: Record<string, any>): Promise<PracticeSettings> => {
  const response = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ settings })
  });
  const result = await handleJson<{ status: 'ok'; settings: PracticeSettings }>(response);
  return result.settings;
};

export const setAdminPassword = async (password: string): Promise<void> => {
  const response = await fetch('/api/admin/admin-password', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { message?: string }).message ?? 'Fehler beim Setzen des Admin-Passworts');
  }
};

