<template>
  <div class="medical-tab">
    <div class="tabs-nav">
      <button
        v-for="tab in medicalTabs"
        :key="tab.id"
        :class="['tab-button', { active: activeMedicalTab === tab.id }]"
        @click="activeMedicalTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="tab-content">
      <AllergiesTab v-if="activeMedicalTab === 'allergies'" :patient-id="patientId" />
      <MedicationsTab v-if="activeMedicalTab === 'medications'" :patient-id="patientId" />
      <DiagnosesTab v-if="activeMedicalTab === 'diagnoses'" :patient-id="patientId" />
      <FindingsTab v-if="activeMedicalTab === 'findings'" :patient-id="patientId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AllergiesTab from './AllergiesTab.vue';
import MedicationsTab from './MedicationsTab.vue';
import DiagnosesTab from './DiagnosesTab.vue';
import FindingsTab from './FindingsTab.vue';

const props = defineProps<{
  patientId: string;
}>();

const activeMedicalTab = ref<'allergies' | 'medications' | 'diagnoses' | 'findings'>('allergies');

const medicalTabs = [
  { id: 'allergies' as const, label: 'Allergien' },
  { id: 'medications' as const, label: 'Medikationen' },
  { id: 'diagnoses' as const, label: 'Diagnosen' },
  { id: 'findings' as const, label: 'Befunde' }
];
</script>

<style scoped>
.medical-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.tab-button {
  padding: 0.75rem 1.5rem;
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
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}
</style>

