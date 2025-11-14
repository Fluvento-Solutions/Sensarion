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
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.loading,
.error {
  @apply glass-card;
  text-align: center;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7d8f);
}

.patient-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.header {
  @apply glass-card p-6;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header h1 {
  margin: 0 0 0.25rem 0;
  color: var(--color-text, #0c1f2f);
  font-size: 1.75rem;
  font-weight: 600;
}

.patient-id {
  margin: 0;
  color: var(--color-text-secondary, #6b7d8f);
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
  background: linear-gradient(135deg, #1a7fd8 0%, #18b4a6 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.3);
}

.tabs-container {
  @apply glass-card;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
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
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab-button:hover {
  color: var(--color-text, #0c1f2f);
  background: rgba(26, 127, 216, 0.08);
  backdrop-filter: blur(4px);
}

.tab-button.active {
  color: var(--color-primary, #1a7fd8);
  border-bottom-color: var(--color-primary, #1a7fd8);
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
</style>

