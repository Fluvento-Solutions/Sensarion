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
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 0.5rem;
}

.tab-button {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
  margin-bottom: -3px;
}

.tab-button:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.tab-button.active {
  @apply bg-white/70 border-white/80;
  color: var(--color-primary, #1a7fd8);
  border-bottom-color: var(--color-primary, #1a7fd8);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}
</style>

