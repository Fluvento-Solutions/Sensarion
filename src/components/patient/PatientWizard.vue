<script setup lang="ts">
import { ref, computed } from 'vue';
import { PhCaretLeft, PhCaretRight, PhSpinner, PhSparkle, PhCheckCircle, PhX } from '@phosphor-icons/vue';
import {
  createPatient,
  createPatientEncounter,
  createPatientVital,
  createPatientNote,
  reviewPatientDataWithAI,
  type PatientName,
  type PatientAddress,
  type PatientContact,
  type PatientInsurance,
  type PatientVitals,
  type PatientAllergy,
  type PatientMedication
} from '@/services/api';

const emit = defineEmits<{
  close: [];
  success: [patientId: string];
}>();

const currentStep = ref(1);
const totalSteps = 9;
const isLoading = ref(false);
const isReviewing = ref(false);
const error = ref<string | null>(null);

// Form-Daten
const formData = ref({
  // Step 1: Basis-Daten
  givenNames: '',
  familyName: '',
  birthDate: '',
  gender: '' as 'm' | 'w' | 'd' | '',
  tags: '',
  
  // Step 2: Adresse
  address: {
    street: '',
    zip: '',
    city: '',
    country: ''
  } as PatientAddress,
  
  // Step 3: Kontakt
  contact: {
    phone: '',
    email: '',
    mobile: ''
  } as PatientContact,
  
  // Step 4: Versicherung
  insurance: {
    number: '',
    type: '',
    provider: ''
  } as PatientInsurance,
  
  // Step 5: Anamnese
  anamnesis: {
    reason: '',
    complaints: '',
    previousIllnesses: '',
    medications: [] as PatientMedication[],
    allergies: [] as PatientAllergy[]
  },
  
  // Step 6: Vitalwerte
  vitals: {
    bp_systolic: undefined as number | undefined,
    bp_diastolic: undefined as number | undefined,
    hr: undefined as number | undefined,
    temperature: undefined as number | undefined,
    spo2: undefined as number | undefined,
    glucose: undefined as number | undefined,
    weight: undefined as number | undefined,
    height: undefined as number | undefined,
    pain_scale: undefined as number | undefined
  } as PatientVitals
});

// KI-Review-Ergebnis
const aiReviewResult = ref<string>('');
const aiFollowUpAnswers = ref<string>('');

// Temporäre Formulare für Anamnese
const newAllergyForm = ref({
  substance: '',
  severity: '' as 'leicht' | 'mittel' | 'schwer' | '',
  notes: ''
});

const newMedicationForm = ref({
  name: '',
  dose_morning: '',
  dose_midday: '',
  dose_evening: '',
  dose_night: '',
  notes: ''
});

const progress = computed(() => (currentStep.value / totalSteps) * 100);

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return formData.value.givenNames.trim() && 
             formData.value.familyName.trim() && 
             formData.value.birthDate;
    case 2:
    case 3:
    case 4:
      return true; // Optional
    case 5:
      return formData.value.anamnesis.reason.trim() || 
             formData.value.anamnesis.complaints.trim();
    case 6:
      return true; // Optional
    case 7:
      return !isReviewing.value && aiReviewResult.value.length > 0;
    case 8:
      return true; // Optional
    case 9:
      return true;
    default:
      return false;
  }
});

const stepTitles = [
  'Basis-Daten',
  'Adresse',
  'Kontakt',
  'Versicherung',
  'Anamnese',
  'Vitalwerte',
  'KI-Prüfung',
  'KI-Rückfragen',
  'Zusammenfassung'
];

const nextStep = () => {
  if (currentStep.value < totalSteps && canProceed.value) {
    if (currentStep.value === 6) {
      // Vor Step 7 (KI-Prüfung) die Prüfung starten
      startAIReview();
    } else {
      currentStep.value++;
    }
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const startAIReview = async () => {
  isReviewing.value = true;
  error.value = null;
  aiReviewResult.value = '';
  currentStep.value = 7; // Wechsle zu KI-Prüfung Step
  
  try {
    await reviewPatientDataWithAI({
      givenNames: formData.value.givenNames,
      familyName: formData.value.familyName,
      birthDate: formData.value.birthDate,
      gender: formData.value.gender,
      tags: formData.value.tags,
      address: formData.value.address,
      contact: formData.value.contact,
      insurance: formData.value.insurance,
      anamnesis: formData.value.anamnesis,
      vitals: formData.value.vitals
    }, (chunk: string) => {
      aiReviewResult.value += chunk;
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler bei der KI-Prüfung';
  } finally {
    isReviewing.value = false;
  }
};

const addAllergy = () => {
  if (newAllergyForm.value.substance.trim() && newAllergyForm.value.severity) {
    formData.value.anamnesis.allergies.push({
      substance: newAllergyForm.value.substance.trim(),
      severity: newAllergyForm.value.severity,
      notes: newAllergyForm.value.notes.trim() || undefined
    });
    newAllergyForm.value = { substance: '', severity: '', notes: '' };
  }
};

const removeAllergy = (index: number) => {
  formData.value.anamnesis.allergies.splice(index, 1);
};

const addMedication = () => {
  if (newMedicationForm.value.name.trim()) {
    formData.value.anamnesis.medications.push({
      name: newMedicationForm.value.name.trim(),
      dose_morning: newMedicationForm.value.dose_morning.trim() || undefined,
      dose_midday: newMedicationForm.value.dose_midday.trim() || undefined,
      dose_evening: newMedicationForm.value.dose_evening.trim() || undefined,
      dose_night: newMedicationForm.value.dose_night.trim() || undefined,
      notes: newMedicationForm.value.notes.trim() || undefined
    });
    newMedicationForm.value = { name: '', dose_morning: '', dose_midday: '', dose_evening: '', dose_night: '', notes: '' };
  }
};

const removeMedication = (index: number) => {
  formData.value.anamnesis.medications.splice(index, 1);
};

const createPatientAndEncounter = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Parse Tags
    const tagsArray = formData.value.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Parse Vornamen
    const givenNamesArray = formData.value.givenNames
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    // Berechne BMI falls vorhanden
    const bmi = formData.value.vitals.weight && formData.value.vitals.height
      ? formData.value.vitals.weight / Math.pow(formData.value.vitals.height / 100, 2)
      : undefined;
    
    // Entferne undefined Werte aus Vitalwerten
    const vitalsWithBmi: Record<string, number> = {};
    Object.entries({
      ...formData.value.vitals,
      bmi
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        vitalsWithBmi[key] = value;
      }
    });
    
    // Erstelle Patient
    const patient = await createPatient({
      name: {
        given: givenNamesArray,
        family: formData.value.familyName.trim()
      } as PatientName,
      birthDate: formData.value.birthDate,
      gender: formData.value.gender || undefined,
      tags: tagsArray,
      address: Object.keys(formData.value.address).some(k => formData.value.address[k as keyof PatientAddress]) 
        ? formData.value.address 
        : undefined,
      contact: Object.keys(formData.value.contact).some(k => formData.value.contact[k as keyof PatientContact]) 
        ? formData.value.contact 
        : undefined,
      insurance: Object.keys(formData.value.insurance).some(k => formData.value.insurance[k as keyof PatientInsurance]) 
        ? formData.value.insurance 
        : undefined,
      vitalsLatest: Object.keys(vitalsWithBmi).length > 0 
        ? vitalsWithBmi as any
        : undefined,
      allergies: formData.value.anamnesis.allergies,
      medications: formData.value.anamnesis.medications
    });
    
    // Erstelle Encounter (Anamnese)
    if (formData.value.anamnesis.reason.trim() || formData.value.anamnesis.complaints.trim()) {
      await createPatientEncounter(patient.patient_id, {
        date: new Date().toISOString().split('T')[0],
        reason: formData.value.anamnesis.reason.trim() || 'Erstaufnahme',
        summary: formData.value.anamnesis.complaints.trim() || undefined,
        location: 'Praxis'
      });
    }
    
    // Erstelle Vitalwerte-Eintrag falls vorhanden
    if (Object.keys(vitalsWithBmi).length > 0) {
      await createPatientVital(patient.patient_id, vitalsWithBmi as any);
    }
    
    // Speichere KI-Empfehlung als Notiz
    if (aiReviewResult.value.trim()) {
      const kiNoteText = `KI-Empfehlung zur Aufnahme:\n\n${aiReviewResult.value}${aiFollowUpAnswers.value.trim() ? `\n\nBeantwortete Rückfragen:\n${aiFollowUpAnswers.value}` : ''}`;
      await createPatientNote(patient.patient_id, kiNoteText);
    }
    
    emit('success', patient.patient_id);
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Patienten';
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE');
};

const calculateAge = () => {
  if (!formData.value.birthDate) return '';
  const today = new Date();
  const birthDate = new Date(formData.value.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      @click.self="emit('close')"
    >
      <div class="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-white/30 p-6">
          <div>
            <h3 class="text-xl font-semibold text-steel-700">Neuen Patienten aufnehmen</h3>
            <p class="mt-1 text-xs text-steel-400">Schritt {{ currentStep }} von {{ totalSteps }}: {{ stepTitles[currentStep - 1] }}</p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 p-2 text-steel-700 transition hover:bg-white/60"
            @click="emit('close')"
          >
            <PhX :size="20" weight="regular" />
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="px-6 pt-4">
          <div class="mb-2 flex items-center justify-between text-xs text-steel-600">
            <span>{{ Math.round(progress) }}% abgeschlossen</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-white/40">
            <div
              class="h-full bg-gradient-to-r from-accent-sky to-accent-teal transition-all duration-300"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6">
          <!-- Error Message -->
          <div v-if="error" class="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {{ error }}
          </div>

          <!-- Step 1: Basis-Daten -->
          <div v-if="currentStep === 1" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Vorname(n) <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="formData.givenNames"
                  type="text"
                  placeholder="z.B. Max, Maria Anna (kommagetrennt)"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Nachname <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="formData.familyName"
                  type="text"
                  placeholder="z.B. Mustermann"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Geburtsdatum <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="formData.birthDate"
                  type="date"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Geschlecht
                </label>
                <select
                  v-model="formData.gender"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                >
                  <option value="">Nicht angegeben</option>
                  <option value="m">Männlich</option>
                  <option value="w">Weiblich</option>
                  <option value="d">Divers</option>
                </select>
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Tags
              </label>
              <input
                v-model="formData.tags"
                type="text"
                placeholder="z.B. Hausbesuch, Hypertonie (kommagetrennt)"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>

          <!-- Step 2: Adresse -->
          <div v-if="currentStep === 2" class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Straße</label>
              <input
                v-model="formData.address.street"
                type="text"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">PLZ</label>
                <input
                  v-model="formData.address.zip"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Ort</label>
                <input
                  v-model="formData.address.city"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Land</label>
              <input
                v-model="formData.address.country"
                type="text"
                placeholder="z.B. Deutschland"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>

          <!-- Step 3: Kontakt -->
          <div v-if="currentStep === 3" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Telefon</label>
                <input
                  v-model="formData.contact.phone"
                  type="tel"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Mobil</label>
                <input
                  v-model="formData.contact.mobile"
                  type="tel"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">E-Mail</label>
              <input
                v-model="formData.contact.email"
                type="email"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>

          <!-- Step 4: Versicherung -->
          <div v-if="currentStep === 4" class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Versicherungsnummer</label>
              <input
                v-model="formData.insurance.number"
                type="text"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Typ</label>
                <input
                  v-model="formData.insurance.type"
                  type="text"
                  placeholder="z.B. GKV, PKV"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Versicherer</label>
                <input
                  v-model="formData.insurance.provider"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <!-- Step 5: Anamnese -->
          <div v-if="currentStep === 5" class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Grund der Vorstellung <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="formData.anamnesis.reason"
                type="text"
                placeholder="z.B. Routinekontrolle, akute Beschwerden"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Aktuelle Beschwerden
              </label>
              <textarea
                v-model="formData.anamnesis.complaints"
                rows="4"
                placeholder="Beschreiben Sie die aktuellen Beschwerden des Patienten..."
                class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Vorerkrankungen
              </label>
              <textarea
                v-model="formData.anamnesis.previousIllnesses"
                rows="3"
                placeholder="Relevante Vorerkrankungen..."
                class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            
            <!-- Allergien -->
            <div class="border-t border-white/30 pt-4">
              <h4 class="mb-3 text-sm font-semibold text-steel-700">Allergien</h4>
              <div class="space-y-2">
                <div v-for="(allergy, index) in formData.anamnesis.allergies" :key="index" class="flex items-center justify-between rounded-xl border border-white/60 bg-white/40 p-3">
                  <div>
                    <span class="font-medium text-steel-700">{{ allergy.substance }}</span>
                    <span class="ml-2 text-xs text-steel-400">({{ allergy.severity }})</span>
                    <p v-if="allergy.notes" class="mt-1 text-xs text-steel-500">{{ allergy.notes }}</p>
                  </div>
                  <button
                    type="button"
                    @click="removeAllergy(index)"
                    class="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 transition hover:bg-red-100"
                  >
                    Entfernen
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <input
                    v-model="newAllergyForm.substance"
                    type="text"
                    placeholder="Substanz"
                    class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                  <select
                    v-model="newAllergyForm.severity"
                    class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  >
                    <option value="">Schweregrad</option>
                    <option value="leicht">Leicht</option>
                    <option value="mittel">Mittel</option>
                    <option value="schwer">Schwer</option>
                  </select>
                  <button
                    type="button"
                    @click="addAllergy"
                    :disabled="!newAllergyForm.substance.trim() || !newAllergyForm.severity"
                    class="rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-3 py-2 text-sm font-medium text-accent-sky transition hover:bg-accent-sky/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Hinzufügen
                  </button>
                </div>
                <input
                  v-model="newAllergyForm.notes"
                  type="text"
                  placeholder="Notizen (optional)"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>

            <!-- Medikation -->
            <div class="border-t border-white/30 pt-4">
              <h4 class="mb-3 text-sm font-semibold text-steel-700">Medikation</h4>
              <div class="space-y-2">
                <div v-for="(med, index) in formData.anamnesis.medications" :key="index" class="flex items-center justify-between rounded-xl border border-white/60 bg-white/40 p-3">
                  <div>
                    <span class="font-medium text-steel-700">{{ med.name }}</span>
                    <p v-if="med.dose_morning || med.dose_midday || med.dose_evening || med.dose_night" class="mt-1 text-xs text-steel-500">
                      Dosis: {{ [med.dose_morning, med.dose_midday, med.dose_evening, med.dose_night].filter(Boolean).join(', ') }}
                    </p>
                    <p v-if="med.notes" class="mt-1 text-xs text-steel-500">{{ med.notes }}</p>
                  </div>
                  <button
                    type="button"
                    @click="removeMedication(index)"
                    class="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 transition hover:bg-red-100"
                  >
                    Entfernen
                  </button>
                </div>
                <div class="space-y-2">
                  <input
                    v-model="newMedicationForm.name"
                    type="text"
                    placeholder="Medikamentenname"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                  <div class="grid grid-cols-4 gap-2">
                    <input
                      v-model="newMedicationForm.dose_morning"
                      type="text"
                      placeholder="Morgens"
                      class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                    <input
                      v-model="newMedicationForm.dose_midday"
                      type="text"
                      placeholder="Mittags"
                      class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                    <input
                      v-model="newMedicationForm.dose_evening"
                      type="text"
                      placeholder="Abends"
                      class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                    <input
                      v-model="newMedicationForm.dose_night"
                      type="text"
                      placeholder="Nachts"
                      class="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                  </div>
                  <div class="flex gap-2">
                    <input
                      v-model="newMedicationForm.notes"
                      type="text"
                      placeholder="Notizen (optional)"
                      class="flex-1 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                    <button
                      type="button"
                      @click="addMedication"
                      :disabled="!newMedicationForm.name.trim()"
                      class="rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-4 py-2 text-sm font-medium text-accent-sky transition hover:bg-accent-sky/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 6: Vitalwerte -->
          <div v-if="currentStep === 6" class="space-y-4">
            <p class="text-sm text-steel-500">Vitalwerte können optional erfasst werden. Sie können diese auch später hinzufügen.</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Systolisch</label>
                <input
                  v-model.number="formData.vitals.bp_systolic"
                  type="number"
                  placeholder="z.B. 120"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Diastolisch</label>
                <input
                  v-model.number="formData.vitals.bp_diastolic"
                  type="number"
                  placeholder="z.B. 80"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Puls (bpm)</label>
                <input
                  v-model.number="formData.vitals.hr"
                  type="number"
                  placeholder="z.B. 72"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Temperatur (°C)</label>
                <input
                  v-model.number="formData.vitals.temperature"
                  type="number"
                  step="0.1"
                  placeholder="z.B. 36.5"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">SpO2 (%)</label>
                <input
                  v-model.number="formData.vitals.spo2"
                  type="number"
                  placeholder="z.B. 98"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Zucker (mg/dl)</label>
                <input
                  v-model.number="formData.vitals.glucose"
                  type="number"
                  placeholder="z.B. 95"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Gewicht (kg)</label>
                <input
                  v-model.number="formData.vitals.weight"
                  type="number"
                  step="0.1"
                  placeholder="z.B. 75.5"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Körpergröße (cm)</label>
                <input
                  v-model.number="formData.vitals.height"
                  type="number"
                  step="0.1"
                  placeholder="z.B. 175"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Schmerzskala (1-10)</label>
              <input
                v-model.number="formData.vitals.pain_scale"
                type="number"
                min="1"
                max="10"
                placeholder="z.B. 5"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>

          <!-- Step 7: KI-Prüfung -->
          <div v-if="currentStep === 7" class="space-y-4">
            <div v-if="isReviewing" class="flex flex-col items-center justify-center py-8">
              <PhSpinner :size="32" weight="regular" class="mb-4 animate-spin text-accent-sky" />
              <p class="text-sm text-steel-600">KI analysiert die Patientendaten...</p>
            </div>
            <div v-else-if="aiReviewResult" class="space-y-4">
              <div class="flex items-center gap-2 text-sm font-semibold text-steel-700">
                <PhSparkle :size="20" weight="regular" class="text-accent-sky" />
                <span>KI-Analyse</span>
              </div>
              <div class="rounded-xl border border-white/60 bg-white/40 p-4 text-sm text-steel-700 whitespace-pre-wrap">
                {{ aiReviewResult }}
              </div>
            </div>
          </div>

          <!-- Step 8: KI-Rückfragen -->
          <div v-if="currentStep === 8" class="space-y-4">
            <div class="rounded-xl border border-accent-sky/30 bg-accent-sky/10 p-4">
              <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-steel-700">
                <PhSparkle :size="20" weight="regular" class="text-accent-sky" />
                <span>KI-Rückfragen beantworten</span>
              </div>
              <p class="mb-4 text-xs text-steel-600">
                Die KI hat möglicherweise weitere Fragen oder empfohlene Untersuchungen identifiziert. 
                Bitte beantworten Sie diese hier, falls bereits bekannt.
              </p>
              <textarea
                v-model="aiFollowUpAnswers"
                rows="8"
                placeholder="Beantworten Sie hier die Rückfragen der KI oder notieren Sie geplante Untersuchungen..."
                class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
              <p class="mt-2 text-xs text-steel-400">Dieses Feld ist optional und kann auch später ausgefüllt werden.</p>
            </div>
          </div>

          <!-- Step 9: Zusammenfassung -->
          <div v-if="currentStep === 9" class="space-y-6">
            <div class="rounded-xl border border-white/60 bg-white/40 p-4">
              <h4 class="mb-3 text-sm font-semibold text-steel-700">Patientendaten</h4>
              <div class="space-y-2 text-sm text-steel-600">
                <p><span class="font-medium">Name:</span> {{ formData.givenNames }} {{ formData.familyName }}</p>
                <p><span class="font-medium">Geburtsdatum:</span> {{ formatDate(formData.birthDate) }} ({{ calculateAge() }} Jahre)</p>
                <p v-if="formData.gender"><span class="font-medium">Geschlecht:</span> {{ formData.gender === 'm' ? 'Männlich' : formData.gender === 'w' ? 'Weiblich' : 'Divers' }}</p>
                <p v-if="formData.tags"><span class="font-medium">Tags:</span> {{ formData.tags }}</p>
              </div>
            </div>
            
            <div v-if="formData.anamnesis.reason || formData.anamnesis.complaints" class="rounded-xl border border-white/60 bg-white/40 p-4">
              <h4 class="mb-3 text-sm font-semibold text-steel-700">Anamnese</h4>
              <div class="space-y-2 text-sm text-steel-600">
                <p v-if="formData.anamnesis.reason"><span class="font-medium">Grund:</span> {{ formData.anamnesis.reason }}</p>
                <p v-if="formData.anamnesis.complaints"><span class="font-medium">Beschwerden:</span> {{ formData.anamnesis.complaints }}</p>
                <p v-if="formData.anamnesis.allergies.length > 0">
                  <span class="font-medium">Allergien:</span> {{ formData.anamnesis.allergies.map(a => a.substance).join(', ') }}
                </p>
                <p v-if="formData.anamnesis.medications.length > 0">
                  <span class="font-medium">Medikation:</span> {{ formData.anamnesis.medications.map(m => m.name).join(', ') }}
                </p>
              </div>
            </div>

            <div v-if="aiReviewResult" class="rounded-xl border border-accent-sky/30 bg-accent-sky/10 p-4">
              <h4 class="mb-2 flex items-center gap-2 text-sm font-semibold text-steel-700">
                <PhSparkle :size="16" weight="regular" class="text-accent-sky" />
                KI-Empfehlungen
              </h4>
              <p class="text-xs text-steel-600 whitespace-pre-wrap">{{ aiReviewResult.substring(0, 200) }}...</p>
            </div>
          </div>
        </div>

        <!-- Footer Navigation -->
        <div class="border-t border-white/30 p-6">
          <div class="flex items-center justify-between">
            <button
              type="button"
              class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
              @click="currentStep === 1 ? emit('close') : prevStep()"
            >
              <PhCaretLeft :size="16" weight="regular" class="inline mr-1" />
              {{ currentStep === 1 ? 'Abbrechen' : 'Zurück' }}
            </button>
            
            <button
              v-if="currentStep < 9"
              type="button"
              :disabled="!canProceed || isLoading"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-6 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              @click="nextStep"
            >
              Weiter
              <PhCaretRight :size="16" weight="regular" class="inline ml-1" />
            </button>
            
            <button
              v-else
              type="button"
              :disabled="isLoading"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-6 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              @click="createPatientAndEncounter"
            >
              <PhSpinner v-if="isLoading" :size="16" weight="regular" class="inline mr-2 animate-spin" />
              <PhCheckCircle v-else :size="16" weight="regular" class="inline mr-2" />
              Patient erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

