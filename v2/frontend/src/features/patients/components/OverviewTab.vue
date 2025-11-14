<template>
  <div class="overview-tab">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <!-- Basis-Daten -->
      <div class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Basis-Daten</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-steel-500">Geburtsdatum:</span>
            <span class="text-steel-700">{{ formatDate(patient.birthDate) }}</span>
          </div>
          <div v-if="patient.gender" class="flex justify-between">
            <span class="text-steel-500">Geschlecht:</span>
            <span class="text-steel-700">{{ formatGender(patient.gender) }}</span>
          </div>
          <div v-if="patient.tags && patient.tags.length > 0" class="flex justify-between">
            <span class="text-steel-500">Tags:</span>
            <span class="text-steel-700">{{ patient.tags.join(', ') }}</span>
          </div>
        </div>
      </div>

      <!-- Kontakt -->
      <div v-if="patient.contact" class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Kontakt</h3>
        <div class="space-y-2 text-sm">
          <div v-if="patient.contact.phone" class="flex justify-between">
            <span class="text-steel-500">Telefon:</span>
            <span class="text-steel-700">{{ patient.contact.phone }}</span>
          </div>
          <div v-if="patient.contact.mobile" class="flex justify-between">
            <span class="text-steel-500">Mobil:</span>
            <span class="text-steel-700">{{ patient.contact.mobile }}</span>
          </div>
          <div v-if="patient.contact.email" class="flex justify-between">
            <span class="text-steel-500">E-Mail:</span>
            <span class="text-steel-700">{{ patient.contact.email }}</span>
          </div>
        </div>
      </div>

      <!-- Adresse -->
      <div v-if="patient.address" class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Adresse</h3>
        <div class="space-y-2 text-sm">
          <div v-if="patient.address.street" class="text-steel-700">{{ patient.address.street }}</div>
          <div v-if="patient.address.zip || patient.address.city" class="text-steel-700">
            {{ patient.address.zip }} {{ patient.address.city }}
          </div>
          <div v-if="patient.address.country" class="text-steel-700">{{ patient.address.country }}</div>
        </div>
      </div>

      <!-- Versicherung -->
      <div v-if="patient.insurance" class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Versicherung</h3>
        <div class="space-y-2 text-sm">
          <div v-if="patient.insurance.number" class="flex justify-between">
            <span class="text-steel-500">Versicherungsnummer:</span>
            <span class="text-steel-700">{{ patient.insurance.number }}</span>
          </div>
          <div v-if="patient.insurance.type" class="flex justify-between">
            <span class="text-steel-500">Typ:</span>
            <span class="text-steel-700">{{ patient.insurance.type }}</span>
          </div>
          <div v-if="patient.insurance.provider" class="flex justify-between">
            <span class="text-steel-500">Kasse:</span>
            <span class="text-steel-700">{{ patient.insurance.provider }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Patient } from '@/services/api';

defineProps<{
  patient: Patient;
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
.overview-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

