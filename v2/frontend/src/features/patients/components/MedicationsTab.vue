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

    <!-- Medication Modal -->
    <MedicationModal
      :open="showModal"
      :patient-id="patientId"
      :medication="editingMedication"
      @close="handleCloseModal"
      @success="handleModalSuccess"
    />

    <!-- Delete Modal -->
    <DeleteModal
      :open="showDeleteModal"
      title="Medikation löschen"
      :item-name="deletingMedication?.name || ''"
      @close="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { PhPlus, PhPencil, PhTrash } from '@phosphor-icons/vue';
import { patientApi } from '@/services/api';
import MedicationModal from './MedicationModal.vue';
import DeleteModal from '@/shared/components/DeleteModal.vue';

const props = defineProps<{
  patientId: string;
}>();

const queryClient = useQueryClient();
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingMedication = ref<any | null>(null);
const deletingMedication = ref<any | null>(null);

const { data: medications = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-medications', props.patientId],
  queryFn: () => patientApi.getMedications(props.patientId)
});

const deleteMutation = useMutation({
  mutationFn: ({ medicationId, reason }: { medicationId: string; reason: string }) =>
    patientApi.deleteMedication(props.patientId, medicationId, reason),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-medications', props.patientId] });
    showDeleteModal.value = false;
    deletingMedication.value = null;
  },
  onError: (err) => {
    alert(err instanceof Error ? err.message : 'Fehler beim Löschen der Medikation');
  }
});

function handleCloseModal() {
  showModal.value = false;
  editingMedication.value = null;
}

function handleModalSuccess() {
  // Modal wird bereits geschlossen
}

function editMedication(medication: any) {
  editingMedication.value = medication;
  showModal.value = true;
}

function deleteMedication(medication: any) {
  deletingMedication.value = medication;
  showDeleteModal.value = true;
}

function handleDeleteConfirm(reason: string) {
  if (!deletingMedication.value || !reason.trim()) {
    alert('Bitte geben Sie einen Grund für die Löschung an');
    return;
  }
  deleteMutation.mutate({ medicationId: deletingMedication.value.id, reason: reason.trim() });
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

