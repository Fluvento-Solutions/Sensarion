<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="handleClose"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Notiz hinzufügen</h3>
          <button @click="handleClose" class="modal-close">
            <PhX :size="20" weight="regular" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-group">
            <label>Notiz *</label>
            <textarea
              v-model="form.text"
              rows="6"
              placeholder="Notiz eingeben..."
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
              {{ isSubmitting ? 'Speichern...' : 'Notiz hinzufügen' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { PhX } from '@phosphor-icons/vue';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { patientApi } from '@/services/api';

const props = defineProps<{
  open: boolean;
  patientId: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'success'): void;
}>();

const queryClient = useQueryClient();

const form = ref({
  text: ''
});

const error = ref<string | null>(null);

watch(() => props.open, (open) => {
  if (!open) {
    form.value = { text: '' };
    error.value = null;
  }
});

const createMutation = useMutation({
  mutationFn: (data: any) => patientApi.createNote(props.patientId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-notes', props.patientId] });
    queryClient.invalidateQueries({ queryKey: ['patient-audit-logs', props.patientId] });
    emit('success');
    handleClose();
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen der Notiz';
  }
});

const isSubmitting = computed(() => createMutation.isPending.value);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  error.value = null;

  if (!form.value.text.trim()) {
    error.value = 'Bitte geben Sie eine Notiz ein';
    return;
  }

  createMutation.mutate({
    text: form.value.text.trim()
  });
}
</script>

<script lang="ts">
import { computed } from 'vue';
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

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
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

