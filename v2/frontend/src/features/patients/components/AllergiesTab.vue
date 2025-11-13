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

const { data: allergies = [], isLoading, isError, error } = useQuery({
  queryKey: ['patient-allergies', props.patientId],
  queryFn: () => patientApi.getAllergies(props.patientId)
});

function editAllergy(allergy: any) {
  // TODO: Implementieren
  console.log('Edit allergy', allergy);
}

function deleteAllergy(allergy: any) {
  if (!confirm('Möchten Sie diese Allergie wirklich löschen?')) return;
  // TODO: Implementieren
  console.log('Delete allergy', allergy);
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

