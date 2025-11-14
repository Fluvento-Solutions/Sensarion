<template>
  <div class="patient-edit">
    <div v-if="isLoading">Lädt...</div>
    <div v-else-if="isError">{{ error?.message || 'Fehler beim Laden des Patienten' }}</div>
    <div v-else-if="patient" class="patient-form-container">
      <div class="header">
        <h1>Patient bearbeiten</h1>
        <button @click="handleCancel">Abbrechen</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="patient-form">
        <div class="form-group">
          <label for="given-names">Vornamen (kommagetrennt)</label>
          <input
            id="given-names"
            v-model="form.givenNames"
            type="text"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="family-name">Nachname</label>
          <input
            id="family-name"
            v-model="form.familyName"
            type="text"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="birth-date">Geburtsdatum</label>
          <input
            id="birth-date"
            v-model="form.birthDate"
            type="date"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="gender">Geschlecht</label>
          <select id="gender" v-model="form.gender">
            <option value="">Bitte wählen</option>
            <option value="m">Männlich</option>
            <option value="w">Weiblich</option>
            <option value="d">Divers</option>
          </select>
        </div>
        
        <div v-if="updateError" class="error-message">
          {{ updateError }}
        </div>
        
        <div class="form-actions">
          <button type="button" @click="handleCancel">Abbrechen</button>
          <button type="submit" :disabled="isUpdating">
            {{ isUpdating ? 'Wird gespeichert...' : 'Speichern' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/identity/useAuthStore';
import { usePatient } from './usePatient';
import type { UpdatePatientDTO } from '@/services/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const patientId = computed(() => route.params.id as string);
const tenantId = computed(() => authStore.state.user?.tenantId || '');

const { patient, isLoading, isError, error, update, isUpdating, updateError } = usePatient(
  computed(() => patientId.value),
  tenantId
);

const form = ref({
  givenNames: '',
  familyName: '',
  birthDate: '',
  gender: '' as 'm' | 'w' | 'd' | ''
});

// Formular mit Patient-Daten füllen
watch(patient, (p) => {
  if (p) {
    form.value.givenNames = p.name.given.join(', ');
    form.value.familyName = p.name.family;
    form.value.birthDate = p.birthDate;
    form.value.gender = p.gender || '';
  }
}, { immediate: true });

const handleSubmit = () => {
  if (!patient.value) return;
  
  const given = form.value.givenNames
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0);
  
  const dto: UpdatePatientDTO = {
    name: {
      given,
      family: form.value.familyName
    },
    birthDate: form.value.birthDate,
    gender: form.value.gender || undefined
  };
  
  update(dto, patient.value.version);
};

const handleCancel = () => {
  router.push({ name: 'patient-detail', params: { id: patientId.value } });
};
</script>

<style scoped>
.patient-edit {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.header {
  @apply glass-card p-6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
}

button {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
  background: linear-gradient(135deg, #1a7fd8 0%, #18b4a6 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.3);
}

.patient-form {
  @apply glass-card p-8;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text, #0c1f2f);
  font-weight: 500;
}

input,
select {
  @apply glass-card px-4 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  width: 100%;
  font-size: 1rem;
  color: var(--color-text, #0c1f2f);
  transition: all 0.2s;
}

input:focus,
select:focus {
  @apply bg-white/50 border-white/60;
  outline: none;
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

input::placeholder {
  color: var(--color-text-secondary, #6b7d8f);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.form-actions button[type="button"] {
  background: rgba(107, 114, 128, 0.8);
  backdrop-filter: blur(8px);
}

.error-message {
  @apply glass-card p-4 border border-red-200/50 bg-red-50/30 backdrop-blur-xl;
  color: var(--color-error, #ef4444);
  margin-bottom: 1rem;
}
</style>

