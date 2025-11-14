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
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
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
  color: var(--color-text, #0c1f2f);
  transition: all 0.2s;
  background: linear-gradient(135deg, #1a7fd8 0%, #18b4a6 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.3);
}

.search-bar {
  margin-bottom: 0;
}

.search-bar input {
  @apply glass-card px-4 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  width: 100%;
  max-width: 500px;
  font-size: 1rem;
  color: var(--color-text, #0c1f2f);
  transition: all 0.2s;
}

.search-bar input:focus {
  @apply bg-white/50 border-white/60;
  outline: none;
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.search-bar input::placeholder {
  color: var(--color-text-secondary, #6b7d8f);
}

.patient-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.loading,
.error,
.empty {
  @apply glass-card;
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7d8f);
}
</style>

