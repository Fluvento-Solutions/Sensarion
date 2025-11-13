<template>
  <div class="settings-tab">
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-steel-700">Praxis-Einstellungen</h2>
      <p class="text-sm text-steel-500">Verwalten Sie die Einstellungen Ihrer Praxis</p>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else class="space-y-4">
      <div class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Allgemeine Einstellungen</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-steel-600">Praxis-Name:</span>
            <span class="text-steel-700 font-medium">{{ settings?.name || 'Nicht gesetzt' }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-steel-600">Praxis-Code:</span>
            <span class="text-steel-700 font-medium">{{ settings?.code || 'Nicht gesetzt' }}</span>
          </div>
        </div>
      </div>

      <div class="glass-card p-4">
        <h3 class="text-sm font-semibold text-steel-700 mb-3">Admin-Passwort</h3>
        <div class="text-sm text-steel-600">
          <p v-if="hasAdminPassword">Admin-Passwort ist gesetzt</p>
          <p v-else>Kein Admin-Passwort gesetzt</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { adminApi } from '@/services/api';

const { data: settings, isLoading, isError, error } = useQuery({
  queryKey: ['admin-settings'],
  queryFn: () => adminApi.getSettings()
});

const hasAdminPassword = ref(false); // TODO: Get from settings
</script>

<style scoped>
.settings-tab {
  display: flex;
  flex-direction: column;
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
</style>

