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

