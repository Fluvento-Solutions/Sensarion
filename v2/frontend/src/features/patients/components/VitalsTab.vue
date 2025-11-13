<template>
  <div class="vitals-tab">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-steel-700">Vitalwerte</h3>
      <button @click="showVitalModal = true" class="btn-primary">
        <PhPlus :size="16" weight="regular" />
        <span>Neue Vitalwerte</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else-if="vitals.length === 0" class="text-center py-8 text-steel-500">
      Noch keine Vitalwerte erfasst
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="vital in vitals"
        :key="vital.id"
        class="glass-card p-4"
      >
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="text-sm font-semibold text-steel-700">
              {{ formatDate(vital.recordedAt) }}
            </div>
            <div class="text-xs text-steel-500">
              {{ formatTime(vital.recordedAt) }}
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="editVital(vital)" class="btn-icon">
              <PhPencil :size="16" weight="regular" />
            </button>
            <button @click="deleteVital(vital)" class="btn-icon text-red-600">
              <PhTrash :size="16" weight="regular" />
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div v-if="vital.bp_systolic && vital.bp_diastolic">
            <span class="text-steel-500">RR:</span>
            <span class="text-steel-700 font-medium ml-1">
              {{ vital.bp_systolic }}/{{ vital.bp_diastolic }} mmHg
            </span>
          </div>
          <div v-if="vital.hr">
            <span class="text-steel-500">Puls:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.hr }} bpm</span>
          </div>
          <div v-if="vital.temperature">
            <span class="text-steel-500">Temp:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.temperature }}°C</span>
          </div>
          <div v-if="vital.spo2">
            <span class="text-steel-500">SpO2:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.spo2 }}%</span>
          </div>
          <div v-if="vital.glucose">
            <span class="text-steel-500">Glukose:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.glucose }} mg/dl</span>
          </div>
          <div v-if="vital.weight">
            <span class="text-steel-500">Gewicht:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.weight }} kg</span>
          </div>
          <div v-if="vital.height">
            <span class="text-steel-500">Größe:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.height }} cm</span>
          </div>
          <div v-if="vital.pain_scale">
            <span class="text-steel-500">Schmerz:</span>
            <span class="text-steel-700 font-medium ml-1">{{ vital.pain_scale }}/10</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vital Modal (TODO: Implementieren) -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { PhPlus, PhPencil, PhTrash } from '@phosphor-icons/vue';
import { patientApi } from '@/services/api';

const props = defineProps<{
  patientId: string;
}>();

const queryClient = useQueryClient();
const showVitalModal = ref(false);

const { data: vitals = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-vitals', props.patientId],
  queryFn: () => patientApi.getVitals(props.patientId)
});

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE');
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function editVital(vital: any) {
  // TODO: Implementieren
  console.log('Edit vital', vital);
}

function deleteVital(vital: any) {
  if (!confirm('Möchten Sie diese Vitalwerte wirklich löschen?')) return;
  // TODO: Implementieren
  console.log('Delete vital', vital);
}
</script>

<style scoped>
.vitals-tab {
  display: flex;
  flex-direction: column;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-icon {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
</style>

