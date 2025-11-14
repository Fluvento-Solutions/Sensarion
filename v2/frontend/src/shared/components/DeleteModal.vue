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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.modal-content {
  @apply glass-card;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
}

.modal-close {
  @apply glass-card p-2 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7d8f);
  border-radius: 8px;
  transition: all 0.2s;
}

.modal-close:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.modal-body {
  padding: 1.5rem;
}

.warning-text {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--color-text, #0c1f2f);
}

.warning-subtitle {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7d8f);
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
  color: var(--color-text, #0c1f2f);
}

.form-input {
  @apply glass-card px-4 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  font-size: 0.875rem;
  color: var(--color-text, #0c1f2f);
  transition: all 0.2s;
  font-family: inherit;
  resize: vertical;
}

.form-input:focus {
  @apply bg-white/50 border-white/60;
  outline: none;
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.form-input::placeholder {
  color: var(--color-text-secondary, #6b7d8f);
}

.error-message {
  @apply glass-card p-4 border border-red-200/50 bg-red-50/30 backdrop-blur-xl;
  color: var(--color-error, #ef4444);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
}

.btn-secondary:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.btn-danger {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

