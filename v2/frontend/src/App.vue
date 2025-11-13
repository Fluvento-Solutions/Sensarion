<template>
  <ErrorBoundary>
    <RouterView />
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import ErrorBoundary from './app/error-boundary/ErrorBoundary.vue';
import { useAuthStore } from './features/identity/useAuthStore';
import { useViewState } from './app/composables/useViewState';

const authStore = useAuthStore();
const { setActiveView } = useViewState();

const isAuthenticated = computed(() => authStore.isAuthenticated);

// Keyboard-Shortcut für Admin (Taste "7")
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === '7' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    const target = event.target as HTMLElement;
    // Ignoriere wenn in einem Input-Feld
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    if (isAuthenticated.value) {
      setActiveView('admin');
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

