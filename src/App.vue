<script setup lang="ts">
import { onMounted, ref } from 'vue';

import AppHeader from '@/components/layout/AppHeader.vue';
import AppShell from '@/components/layout/AppShell.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ContextPanel from '@/components/layout/ContextPanel.vue';
import FooterConsole from '@/components/layout/FooterConsole.vue';
import OverviewPanel from '@/components/dashboard/OverviewPanel.vue';
import type { UserProfile } from '@/services/api';
import { devLogin } from '@/services/api';

const user = ref<UserProfile | null>(null);
const loadingProfile = ref(true);
const profileError = ref<string | null>(null);

onMounted(async () => {
  try {
    const authenticatedUser = await devLogin('max.mustermann@sensarion.local');
    user.value = authenticatedUser;
  } catch (error) {
    profileError.value = error instanceof Error ? error.message : 'Unbekannter Fehler';
  } finally {
    loadingProfile.value = false;
  }
});
</script>

<template>
  <AppShell>
    <template #header>
      <AppHeader :user="user" :loading="loadingProfile" :error="profileError" />
    </template>

    <template #sidebar>
      <AppSidebar />
    </template>

    <OverviewPanel />

    <template #context>
      <ContextPanel />
    </template>

    <template #footer>
      <FooterConsole />
    </template>
  </AppShell>
</template>

