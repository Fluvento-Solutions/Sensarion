<template>
  <div class="diagnoses-tab">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-steel-700">Diagnosen</h3>
      <button @click="showModal = true" class="btn-primary">
        <PhPlus :size="16" weight="regular" />
        <span>Diagnose hinzufügen</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else-if="diagnoses.length === 0" class="text-center py-8 text-steel-500">
      Keine Diagnosen erfasst
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="diagnosis in diagnoses"
        :key="diagnosis.id"
        class="glass-card p-4"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="text-steel-700">{{ diagnosis.text }}</div>
            <div v-if="diagnosis.created_at" class="text-xs text-steel-500 mt-1">
              {{ formatDate(diagnosis.created_at) }}
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="editDiagnosis(diagnosis)" class="btn-icon">
              <PhPencil :size="16" weight="regular" />
            </button>
            <button @click="deleteDiagnosis(diagnosis)" class="btn-icon text-red-600">
              <PhTrash :size="16" weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Diagnosis Modal -->
    <DiagnosisModal
      :open="showModal"
      :patient-id="patientId"
      :diagnosis="editingDiagnosis"
      @close="handleCloseModal"
      @success="handleModalSuccess"
    />

    <!-- Delete Modal -->
    <DeleteModal
      :open="showDeleteModal"
      title="Diagnose löschen"
      :item-name="deletingDiagnosis?.text || ''"
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
import DiagnosisModal from './DiagnosisModal.vue';
import DeleteModal from '@/shared/components/DeleteModal.vue';

const props = defineProps<{
  patientId: string;
}>();

const queryClient = useQueryClient();
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingDiagnosis = ref<any | null>(null);
const deletingDiagnosis = ref<any | null>(null);

const { data: diagnoses = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-diagnoses', props.patientId],
  queryFn: () => patientApi.getDiagnoses(props.patientId)
});

const deleteMutation = useMutation({
  mutationFn: ({ diagnosisId, reason }: { diagnosisId: string; reason: string }) =>
    patientApi.deleteDiagnosis(props.patientId, diagnosisId, reason),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-diagnoses', props.patientId] });
    showDeleteModal.value = false;
    deletingDiagnosis.value = null;
  },
  onError: (err) => {
    alert(err instanceof Error ? err.message : 'Fehler beim Löschen der Diagnose');
  }
});

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE');
}

function handleCloseModal() {
  showModal.value = false;
  editingDiagnosis.value = null;
}

function handleModalSuccess() {
  // Modal wird bereits geschlossen
}

function editDiagnosis(diagnosis: any) {
  editingDiagnosis.value = diagnosis;
  showModal.value = true;
}

function deleteDiagnosis(diagnosis: any) {
  deletingDiagnosis.value = diagnosis;
  showDeleteModal.value = true;
}

function handleDeleteConfirm(reason: string) {
  if (!deletingDiagnosis.value || !reason.trim()) {
    alert('Bitte geben Sie einen Grund für die Löschung an');
    return;
  }
  deleteMutation.mutate({ diagnosisId: deletingDiagnosis.value.id, reason: reason.trim() });
}
</script>

<style scoped>
.diagnoses-tab {
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

