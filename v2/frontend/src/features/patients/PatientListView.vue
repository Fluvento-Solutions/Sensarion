<template>
  <div class="patient-list">
    <div class="header">
      <h1>Patienten</h1>
      <button @click="handleCreate">Neuer Patient</button>
    </div>
    
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Suche nach Name oder Tags..."
      />
    </div>
    
    <div v-if="isLoading" class="loading">Lädt...</div>
    <div v-else-if="isError" class="error">
      {{ error?.message || 'Fehler beim Laden der Patienten' }}
    </div>
    <div v-else-if="patients.length === 0" class="empty">
      Keine Patienten gefunden
    </div>
    <div v-else class="patient-grid">
      <PatientCard
        v-for="patient in patients"
        :key="patient.id"
        :patient="patient"
        @click="handlePatientClick(patient.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/identity/useAuthStore';
import { usePatients } from './usePatients';
import PatientCard from './PatientCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const tenantId = computed(() => authStore.state.user?.tenantId || '');

const searchQuery = ref('');
const { patients, isLoading, isError, error } = usePatients(tenantId, searchQuery);

const handleCreate = () => {
  router.push({ name: 'patient-create' });
};

const handlePatientClick = (patientId: string) => {
  router.push({ name: 'patient-detail', params: { id: patientId } });
};
</script>

<style scoped>
.patient-list {
  padding: 2rem;
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

.search-bar {
  margin-bottom: 2rem;
}

.search-bar input {
  width: 100%;
  max-width: 500px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}
</style>

