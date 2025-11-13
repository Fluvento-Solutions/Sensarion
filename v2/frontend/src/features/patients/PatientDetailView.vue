<template>
  <div class="patient-detail">
    <div v-if="isLoading" class="loading">Lädt...</div>
    <div v-else-if="isError" class="error">{{ error?.message || 'Fehler beim Laden des Patienten' }}</div>
    <div v-else-if="patient" class="patient-content">
      <div class="header">
        <div>
          <h1>{{ patient.name.given.join(' ') }} {{ patient.name.family }}</h1>
          <p class="patient-id">ID: {{ patient.id }}</p>
        </div>
        <div class="header-actions">
          <button @click="handleEdit" class="btn-primary">Bearbeiten</button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="tabs-container">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="16" weight="regular" />
            <span>{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <OverviewTab v-if="activeTab === 'overview'" :patient="patient" />
          <VitalsTab v-if="activeTab === 'vitals'" :patient-id="patient.id" />
          <MedicalTab v-if="activeTab === 'medical'" :patient-id="patient.id" />
          <HistoryTab v-if="activeTab === 'history'" :patient-id="patient.id" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/identity/useAuthStore';
import { usePatient } from './usePatient';
import {
  PhAddressBook,
  PhActivity,
  PhStethoscope,
  PhFileText
} from '@phosphor-icons/vue';
import OverviewTab from './components/OverviewTab.vue';
import VitalsTab from './components/VitalsTab.vue';
import MedicalTab from './components/MedicalTab.vue';
import HistoryTab from './components/HistoryTab.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const patientId = computed(() => route.params.id as string);
const tenantId = computed(() => authStore.state.user?.tenantId || '');

const { patient, isLoading, isError, error } = usePatient(
  computed(() => patientId.value),
  tenantId
);

const activeTab = ref<'overview' | 'vitals' | 'medical' | 'history'>('overview');

const tabs = [
  { id: 'overview' as const, label: 'Übersicht', icon: PhAddressBook },
  { id: 'vitals' as const, label: 'Vitalwerte', icon: PhActivity },
  { id: 'medical' as const, label: 'Medizinisch', icon: PhStethoscope },
  { id: 'history' as const, label: 'Verlauf', icon: PhFileText }
];

const handleEdit = () => {
  router.push({ name: 'patient-edit', params: { id: patientId.value } });
};
</script>

<style scoped>
.patient-detail {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.patient-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0;
}

.header h1 {
  margin: 0 0 0.25rem 0;
  color: var(--color-text);
  font-size: 1.75rem;
}

.patient-id {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.tabs-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e2e8f0;
  background: #f8fafc;
  padding: 0 1rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: #334155;
  background: rgba(59, 130, 246, 0.05);
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>

