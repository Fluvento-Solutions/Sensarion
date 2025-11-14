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
  @apply glass-card p-6;
  cursor: pointer;
  transition: all 0.2s;
}

.patient-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 127, 216, 0.2);
  background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.9), rgba(243, 246, 251, 0.9), rgba(236, 242, 248, 0.9));
}

.patient-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
  margin-bottom: 0.5rem;
}

.patient-info {
  color: var(--color-text-secondary, #6b7d8f);
  font-size: 0.875rem;
}

.tags {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  @apply glass-card px-3 py-1 border border-white/40 bg-white/30 backdrop-blur-xl;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
}

.tag:hover {
  @apply bg-white/50 border-white/60;
}
</style>

