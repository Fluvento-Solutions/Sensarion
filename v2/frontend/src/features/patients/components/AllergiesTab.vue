<template>
  <div class="allergies-tab">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-steel-700">Allergien</h3>
      <button @click="showModal = true" class="btn-primary">
        <PhPlus :size="16" weight="regular" />
        <span>Allergie hinzufügen</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else-if="allergies.length === 0" class="text-center py-8 text-steel-500">
      Keine Allergien erfasst
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="allergy in allergies"
        :key="allergy.id"
        class="glass-card p-4"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="font-semibold text-steel-700 mb-1">{{ allergy.substance }}</div>
            <div class="text-sm text-steel-600">
              <span class="font-medium">Schweregrad:</span> {{ allergy.severity }}
            </div>
            <div v-if="allergy.notes" class="text-sm text-steel-600 mt-1">
              {{ allergy.notes }}
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="editAllergy(allergy)" class="btn-icon">
              <PhPencil :size="16" weight="regular" />
            </button>
            <button @click="deleteAllergy(allergy)" class="btn-icon text-red-600">
              <PhTrash :size="16" weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Allergy Modal -->
    <AllergyModal
      :open="showModal"
      :patient-id="patientId"
      :allergy="editingAllergy"
      @close="handleCloseModal"
      @success="handleModalSuccess"
    />

    <!-- Delete Modal -->
    <DeleteModal
      :open="showDeleteModal"
      title="Allergie löschen"
      :item-name="deletingAllergy?.substance || ''"
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
import AllergyModal from './AllergyModal.vue';
import DeleteModal from '@/shared/components/DeleteModal.vue';

const props = defineProps<{
  patientId: string;
}>();

const queryClient = useQueryClient();
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingAllergy = ref<any | null>(null);
const deletingAllergy = ref<any | null>(null);

const { data: allergies = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-allergies', props.patientId],
  queryFn: () => patientApi.getAllergies(props.patientId)
});

const deleteMutation = useMutation({
  mutationFn: ({ allergyId, reason }: { allergyId: string; reason: string }) =>
    patientApi.deleteAllergy(props.patientId, allergyId, reason),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-allergies', props.patientId] });
    showDeleteModal.value = false;
    deletingAllergy.value = null;
  },
  onError: (err) => {
    alert(err instanceof Error ? err.message : 'Fehler beim Löschen der Allergie');
  }
});

function handleCloseModal() {
  showModal.value = false;
  editingAllergy.value = null;
}

function handleModalSuccess() {
  // Modal wird bereits geschlossen
}

function editAllergy(allergy: any) {
  editingAllergy.value = allergy;
  showModal.value = true;
}

function deleteAllergy(allergy: any) {
  deletingAllergy.value = allergy;
  showDeleteModal.value = true;
}

function handleDeleteConfirm(reason: string) {
  if (!deletingAllergy.value || !reason.trim()) {
    alert('Bitte geben Sie einen Grund für die Löschung an');
    return;
  }
  deleteMutation.mutate({ allergyId: deletingAllergy.value.id, reason: reason.trim() });
}
</script>

<style scoped>
.allergies-tab {
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

