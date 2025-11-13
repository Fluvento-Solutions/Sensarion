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
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

h1 {
  margin: 0;
  color: var(--color-text);
}

button {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.patient-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  font-weight: 500;
}

input,
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.form-actions button[type="button"] {
  background: #6b7280;
}

.error-message {
  color: var(--color-error);
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #fee;
  border-radius: 4px;
}
</style>

