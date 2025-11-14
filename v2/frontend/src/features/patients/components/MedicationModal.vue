<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="handleClose"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEdit ? 'Medikation bearbeiten' : 'Medikation hinzufügen' }}</h3>
          <button @click="handleClose" class="modal-close">
            <PhX :size="20" weight="regular" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-group">
            <label>Medikamentenname *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="z.B. Aspirin"
              class="form-input"
              required
            />
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>Dosis morgens</label>
              <input
                v-model="form.dose_morning"
                type="text"
                placeholder="z.B. 1 Tablette"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Dosis mittags</label>
              <input
                v-model="form.dose_midday"
                type="text"
                placeholder="z.B. 1 Tablette"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Dosis abends</label>
              <input
                v-model="form.dose_evening"
                type="text"
                placeholder="z.B. 1 Tablette"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Dosis nachts</label>
              <input
                v-model="form.dose_night"
                type="text"
                placeholder="z.B. 1 Tablette"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Notizen</label>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="Zusätzliche Informationen"
              class="form-input"
            />
          </div>

          <div v-if="isEdit" class="form-group">
            <label>Grund für Änderung *</label>
            <textarea
              v-model="reason"
              rows="2"
              placeholder="Bitte geben Sie einen Grund für die Änderung an"
              class="form-input"
              required
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="handleClose" class="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" :disabled="isSubmitting" class="btn-primary">
              {{ isSubmitting ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Medikation hinzufügen' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { PhX } from '@phosphor-icons/vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { patientApi } from '@/services/api';

const props = defineProps<{
  open: boolean;
  patientId: string;
  medication?: any | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'success'): void;
}>();

const queryClient = useQueryClient();
const isEdit = computed(() => !!props.medication);

const form = ref({
  name: '',
  dose_morning: '',
  dose_midday: '',
  dose_evening: '',
  dose_night: '',
  notes: ''
});

const reason = ref('');
const error = ref<string | null>(null);

watch(() => props.medication, (medication) => {
  if (medication) {
    form.value = {
      name: medication.name || '',
      dose_morning: medication.dose_morning || medication.dose || '',
      dose_midday: medication.dose_midday || '',
      dose_evening: medication.dose_evening || '',
      dose_night: medication.dose_night || '',
      notes: medication.notes || ''
    };
  } else {
    form.value = {
      name: '',
      dose_morning: '',
      dose_midday: '',
      dose_evening: '',
      dose_night: '',
      notes: ''
    };
    reason.value = '';
  }
}, { immediate: true });

watch(() => props.open, (open) => {
  if (!open) {
    error.value = null;
    if (!isEdit.value) {
      form.value = {
        name: '',
        dose_morning: '',
        dose_midday: '',
        dose_evening: '',
        dose_night: '',
        notes: ''
      };
    }
  }
});

const createMutation = useMutation({
  mutationFn: (data: any) => patientApi.createMedication(props.patientId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-medications', props.patientId] });
    emit('success');
    handleClose();
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen der Medikation';
  }
});

const updateMutation = useMutation({
  mutationFn: ({ medicationId, data }: { medicationId: string; data: any }) =>
    patientApi.updateMedication(props.patientId, medicationId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-medications', props.patientId] });
    emit('success');
    handleClose();
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Medikation';
  }
});

const isSubmitting = computed(() => createMutation.isPending.value || updateMutation.isPending.value);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  error.value = null;

  if (!form.value.name.trim()) {
    error.value = 'Bitte geben Sie den Medikamentennamen ein';
    return;
  }

  // Mindestens eine Dosierung muss angegeben sein
  if (!form.value.dose_morning && !form.value.dose_midday && 
      !form.value.dose_evening && !form.value.dose_night) {
    error.value = 'Bitte geben Sie mindestens eine Dosierung an';
    return;
  }

  if (isEdit.value) {
    if (!reason.value.trim()) {
      error.value = 'Bitte geben Sie einen Grund für die Änderung an';
      return;
    }

    updateMutation.mutate({
      medicationId: props.medication!.id,
      data: {
        name: form.value.name.trim(),
        dose_morning: form.value.dose_morning.trim() || undefined,
        dose_midday: form.value.dose_midday.trim() || undefined,
        dose_evening: form.value.dose_evening.trim() || undefined,
        dose_night: form.value.dose_night.trim() || undefined,
        notes: form.value.notes.trim() || undefined,
        reason: reason.value.trim()
      }
    });
  } else {
    createMutation.mutate({
      name: form.value.name.trim(),
      dose_morning: form.value.dose_morning.trim() || undefined,
      dose_midday: form.value.dose_midday.trim() || undefined,
      dose_evening: form.value.dose_evening.trim() || undefined,
      dose_night: form.value.dose_night.trim() || undefined,
      notes: form.value.notes.trim() || undefined
    });
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
}

.modal-close {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #334155;
}

.modal-body {
  padding: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}

.form-input {
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.error-message {
  padding: 0.75rem;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

