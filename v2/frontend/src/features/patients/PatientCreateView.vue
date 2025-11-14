<template>
  <div class="patient-create">
    <div class="header">
      <h1>Neuer Patient</h1>
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
          placeholder="Max, Maria"
        />
      </div>
      
      <div class="form-group">
        <label for="family-name">Nachname</label>
        <input
          id="family-name"
          v-model="form.familyName"
          type="text"
          required
          placeholder="Mustermann"
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
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div class="form-actions">
        <button type="button" @click="handleCancel">Abbrechen</button>
        <button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Wird erstellt...' : 'Erstellen' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { patientApi, type CreatePatientDTO } from '@/services/api';
import { useAuthStore } from '@/features/identity/useAuthStore';

const router = useRouter();
const authStore = useAuthStore();
const queryClient = useQueryClient();

const form = ref({
  givenNames: '',
  familyName: '',
  birthDate: '',
  gender: '' as 'm' | 'w' | 'd' | ''
});

const error = ref<string | null>(null);

const mutation = useMutation({
  mutationFn: (dto: CreatePatientDTO) => patientApi.createPatient(dto),
  onSuccess: () => {
    const tenantId = authStore.state.user?.tenantId || '';
    queryClient.invalidateQueries({ queryKey: ['patients', tenantId] });
    router.push({ name: 'patients' });
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Patienten';
  }
});

const isSubmitting = computed(() => mutation.isPending.value);

const handleSubmit = () => {
  error.value = null;
  
  const given = form.value.givenNames
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0);
  
  if (given.length === 0) {
    error.value = 'Bitte geben Sie mindestens einen Vornamen ein';
    return;
  }
  
  const dto: CreatePatientDTO = {
    name: {
      given,
      family: form.value.familyName
    },
    birthDate: form.value.birthDate,
    gender: form.value.gender || undefined
  };
  
  mutation.mutate(dto);
};

const handleCancel = () => {
  router.push({ name: 'patients' });
};
</script>

<style scoped>
.patient-create {
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

