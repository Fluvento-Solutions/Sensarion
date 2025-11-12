<script setup lang="ts">
import { ref } from 'vue';
import { PhSpinner } from '@phosphor-icons/vue';
import { generateWithOllama } from '@/services/api';
import { useViewState } from '@/composables/useViewState';

const { kiTestContext, setKiTestResult } = useViewState();

const prompt = ref('');
const isLoading = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async () => {
  if (!prompt.value.trim() || isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  try {
    const result = await generateWithOllama({
      prompt: prompt.value,
      model: 'gemma3:12b',
      context: kiTestContext.value || undefined
    });

    setKiTestResult(result);
    prompt.value = ''; // Clear prompt after successful submission
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unbekannter Fehler';
    setKiTestResult('');
  } finally {
    isLoading.value = false;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSubmit();
  }
};
</script>

<template>
  <div
    class="flex flex-col gap-3 transition-all"
    :class="{
      'opacity-50 grayscale': isLoading
    }"
  >
    <div class="flex items-center justify-between">
      <p class="text-xs uppercase tracking-[0.32em] text-steel-200">
        KI-Verbindung
      </p>
      <div v-if="isLoading" class="flex items-center gap-2">
        <PhSpinner :size="16" weight="regular" class="animate-spin text-accent-sky" />
        <span class="text-xs text-steel-400">Verarbeitung...</span>
      </div>
    </div>

    <div class="relative w-full">
      <input
        v-model="prompt"
        type="text"
        placeholder="was kann ich für dich tun?"
        :disabled="isLoading"
        class="w-full rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-lg font-medium text-steel-700 shadow-[0_18px_40px_rgba(12,31,47,0.15)] outline-none transition focus:border-accent-sky/80 focus:shadow-[0_22px_46px_rgba(26,127,216,0.22)] focus:ring-4 focus:ring-accent-sky/20 disabled:cursor-not-allowed disabled:opacity-60"
        @keydown="handleKeyDown"
      />
      <button
        type="button"
        :disabled="isLoading || !prompt.trim()"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-accent-sky to-accent-teal px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-pane transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/40 disabled:cursor-not-allowed disabled:opacity-60"
        @click="handleSubmit"
      >
        <span v-if="!isLoading">Senden</span>
        <PhSpinner v-else :size="16" weight="regular" class="animate-spin" />
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-accent-sky/40 bg-accent-sky/5 px-4 py-2 text-sm text-accent-sky">
      {{ error }}
    </div>
  </div>
</template>

