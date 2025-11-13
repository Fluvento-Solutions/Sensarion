<template>
  <div class="medications-tab">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-steel-700">Medikationen</h3>
      <button @click="showModal = true" class="btn-primary">
        <PhPlus :size="16" weight="regular" />
        <span>Medikation hinzufügen</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else-if="medications.length === 0" class="text-center py-8 text-steel-500">
      Keine Medikationen erfasst
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="medication in medications"
        :key="medication.id"
        class="glass-card p-4"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-steel-700 mb-2">{{ medication.name }}</div>
            <div class="text-sm text-steel-600 space-y-1">
              <div v-if="medication.dose_morning">
                <span class="font-medium">Morgens:</span> {{ medication.dose_morning }}
              </div>
              <div v-if="medication.dose_midday">
                <span class="font-medium">Mittags:</span> {{ medication.dose_midday }}
              </div>
              <div v-if="medication.dose_evening">
                <span class="font-medium">Abends:</span> {{ medication.dose_evening }}
              </div>
              <div v-if="medication.dose_night">
                <span class="font-medium">Nachts:</span> {{ medication.dose_night }}
              </div>
              <div v-if="medication.dose">
                <span class="font-medium">Dosis:</span> {{ medication.dose }}
              </div>
              <div v-if="medication.notes" class="mt-2 text-steel-500">
                {{ medication.notes }}
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="editMedication(medication)" class="btn-icon">
              <PhPencil :size="16" weight="regular" />
            </button>
            <button @click="deleteMedication(medication)" class="btn-icon text-red-600">
              <PhTrash :size="16" weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal (TODO: Implementieren) -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { PhPlus, PhPencil, PhTrash } from '@phosphor-icons/vue';
import { patientApi } from '@/services/api';

const props = defineProps<{
  patientId: string;
}>();

const showModal = ref(false);

const { data: medications = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-medications', props.patientId],
  queryFn: () => patientApi.getMedications(props.patientId)
});

function editMedication(medication: any) {
  // TODO: Implementieren
  console.log('Edit medication', medication);
}

function deleteMedication(medication: any) {
  if (!confirm('Möchten Sie diese Medikation wirklich löschen?')) return;
  // TODO: Implementieren
  console.log('Delete medication', medication);
}
</script>

<style scoped>
.medications-tab {
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

