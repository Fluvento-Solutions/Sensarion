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
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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

.btn-icon {
  @apply glass-card p-2 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--color-text-secondary, #6b7d8f);
}

.btn-icon:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}
</style>

