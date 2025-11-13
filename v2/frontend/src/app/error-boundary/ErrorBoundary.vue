<template>
  <div v-if="error" class="error-boundary">
    <h1>Ein Fehler ist aufgetreten</h1>
    <p>{{ error.message }}</p>
    <button @click="handleReset">Erneut versuchen</button>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err;
  console.error('Error caught by boundary:', err);
  return false; // Verhindert weitere Propagation
});

const handleReset = () => {
  error.value = null;
};
</script>

<style scoped>
.error-boundary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
}
</style>

