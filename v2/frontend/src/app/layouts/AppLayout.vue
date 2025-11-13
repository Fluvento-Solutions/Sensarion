<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/features/identity/useAuthStore';
import AppShell from './AppShell.vue';
import AppHeader from './AppHeader.vue';
import ContextPanel from './ContextPanel.vue';
import FooterConsole from './FooterConsole.vue';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = () => {
  authStore.clearSession();
  router.push({ name: 'login' });
};
</script>

<template>
  <AppShell>
    <template #header>
      <AppHeader @logout="handleLogout" />
    </template>

    <template #context>
      <ContextPanel />
    </template>

    <template #default>
      <RouterView />
    </template>

    <template #footer>
      <FooterConsole />
    </template>
  </AppShell>
</template>

