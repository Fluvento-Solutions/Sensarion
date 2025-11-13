<template>
  <div class="patient-card" @click="$emit('click')">
    <div class="patient-name">
      {{ patient.name.given.join(' ') }} {{ patient.name.family }}
    </div>
    <div class="patient-info">
      <div>Geboren: {{ formatDate(patient.birthDate) }}</div>
      <div v-if="patient.gender">Geschlecht: {{ formatGender(patient.gender) }}</div>
      <div v-if="patient.tags.length > 0" class="tags">
        <span v-for="tag in patient.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Patient } from '@/services/api';

defineProps<{
  patient: Patient;
}>();

defineEmits<{
  click: [];
}>();

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE');
}

function formatGender(gender: string): string {
  const map: Record<string, string> = {
    m: 'Männlich',
    w: 'Weiblich',
    d: 'Divers'
  };
  return map[gender] || gender;
}
</script>

<style scoped>
.patient-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.patient-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.patient-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.patient-info {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.tags {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  background: var(--color-surface);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>

