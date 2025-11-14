<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="handleClose"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button @click="handleClose" class="modal-close">
            <PhX :size="20" weight="regular" />
          </button>
        </div>

        <div class="modal-body">
          <p class="warning-text">
            Möchten Sie <strong>{{ itemName }}</strong> wirklich löschen?
          </p>
          <p class="warning-subtitle">Diese Aktion kann nicht rückgängig gemacht werden.</p>

          <div class="form-group">
            <label>Grund für die Löschung *</label>
            <textarea
              v-model="reason"
              rows="3"
              placeholder="Bitte geben Sie einen Grund für die Löschung an"
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
            <button
              type="button"
              @click="handleConfirm"
              :disabled="!reason.trim() || isDeleting"
              class="btn-danger"
            >
              {{ isDeleting ? 'Löschen...' : 'Löschen' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { PhX } from '@phosphor-icons/vue';

const props = defineProps<{
  open: boolean;
  title: string;
  itemName: string;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', reason: string): void;
}>();

const reason = ref('');
const error = ref<string | null>(null);
const isDeleting = ref(false);

watch(() => props.open, (open) => {
  if (!open) {
    reason.value = '';
    error.value = null;
    isDeleting.value = false;
  }
});

function handleClose() {
  emit('close');
}

function handleConfirm() {
  if (!reason.value.trim()) {
    error.value = 'Bitte geben Sie einen Grund für die Löschung an';
    return;
  }
  isDeleting.value = true;
  emit('confirm', reason.value.trim());
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
  max-width: 500px;
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

.warning-text {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #334155;
}

.warning-subtitle {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: #64748b;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
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

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

