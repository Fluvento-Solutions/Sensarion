<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="handleClose"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEdit ? 'Vitalwerte bearbeiten' : 'Vitalwerte hinzufügen' }}</h3>
          <button @click="handleClose" class="modal-close">
            <PhX :size="20" weight="regular" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>RR Systolisch (mmHg)</label>
              <input
                v-model.number="form.bp_systolic"
                type="number"
                placeholder="z.B. 120"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>RR Diastolisch (mmHg)</label>
              <input
                v-model.number="form.bp_diastolic"
                type="number"
                placeholder="z.B. 80"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Puls (bpm)</label>
              <input
                v-model.number="form.hr"
                type="number"
                placeholder="z.B. 72"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Temperatur (°C)</label>
              <input
                v-model.number="form.temperature"
                type="number"
                step="0.1"
                placeholder="z.B. 36.5"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>SpO2 (%)</label>
              <input
                v-model.number="form.spo2"
                type="number"
                placeholder="z.B. 98"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Glukose (mg/dl)</label>
              <input
                v-model.number="form.glucose"
                type="number"
                placeholder="z.B. 100"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Gewicht (kg)</label>
              <input
                v-model.number="form.weight"
                type="number"
                step="0.1"
                placeholder="z.B. 75"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Größe (cm)</label>
              <input
                v-model.number="form.height"
                type="number"
                step="0.1"
                placeholder="z.B. 175"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label>Schmerzskala (1-10)</label>
              <input
                v-model.number="form.pain_scale"
                type="number"
                min="1"
                max="10"
                placeholder="z.B. 3"
                class="form-input"
              />
            </div>
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
              {{ isSubmitting ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Vitalwerte hinzufügen' }}
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
  vital?: any | null;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'success'): void;
}>();

const queryClient = useQueryClient();
const isEdit = computed(() => !!props.vital);

const form = ref({
  bp_systolic: undefined as number | undefined,
  bp_diastolic: undefined as number | undefined,
  hr: undefined as number | undefined,
  temperature: undefined as number | undefined,
  spo2: undefined as number | undefined,
  glucose: undefined as number | undefined,
  weight: undefined as number | undefined,
  height: undefined as number | undefined,
  pain_scale: undefined as number | undefined
});

const reason = ref('');
const error = ref<string | null>(null);

// Formular mit Vital-Daten füllen beim Edit
watch(() => props.vital, (vital) => {
  if (vital) {
    form.value = {
      bp_systolic: vital.bp_systolic,
      bp_diastolic: vital.bp_diastolic,
      hr: vital.hr,
      temperature: vital.temperature,
      spo2: vital.spo2,
      glucose: vital.glucose,
      weight: vital.weight,
      height: vital.height,
      pain_scale: vital.pain_scale
    };
  } else {
    // Reset form
    form.value = {
      bp_systolic: undefined,
      bp_diastolic: undefined,
      hr: undefined,
      temperature: undefined,
      spo2: undefined,
      glucose: undefined,
      weight: undefined,
      height: undefined,
      pain_scale: undefined
    };
    reason.value = '';
  }
}, { immediate: true });

// Reset form when modal closes
watch(() => props.open, (open) => {
  if (!open) {
    error.value = null;
    if (!isEdit.value) {
      form.value = {
        bp_systolic: undefined,
        bp_diastolic: undefined,
        hr: undefined,
        temperature: undefined,
        spo2: undefined,
        glucose: undefined,
        weight: undefined,
        height: undefined,
        pain_scale: undefined
      };
    }
  }
});

const createMutation = useMutation({
  mutationFn: (data: any) => patientApi.createVital(props.patientId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-vitals', props.patientId] });
    emit('success');
    handleClose();
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen der Vitalwerte';
  }
});

const updateMutation = useMutation({
  mutationFn: ({ vitalId, data }: { vitalId: string; data: any }) =>
    patientApi.updateVital(props.patientId, vitalId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['patient-vitals', props.patientId] });
    emit('success');
    handleClose();
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Vitalwerte';
  }
});

const isSubmitting = computed(() => createMutation.isPending.value || updateMutation.isPending.value);

function handleClose() {
  emit('close');
}

function handleSubmit() {
  error.value = null;

  if (isEdit.value) {
    if (!reason.value.trim()) {
      error.value = 'Bitte geben Sie einen Grund für die Änderung an';
      return;
    }

    // Berechne BMI falls Gewicht und Größe vorhanden
    const bmi = form.value.weight && form.value.height
      ? form.value.weight / Math.pow(form.value.height / 100, 2)
      : undefined;

    updateMutation.mutate({
      vitalId: props.vital!.id,
      data: {
        ...form.value,
        bmi,
        reason: reason.value.trim()
      }
    });
  } else {
    // Berechne BMI falls Gewicht und Größe vorhanden
    const bmi = form.value.weight && form.value.height
      ? form.value.weight / Math.pow(form.value.height / 100, 2)
      : undefined;

    createMutation.mutate({
      ...form.value,
      bmi
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
  margin-bottom: 1.5rem;
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

