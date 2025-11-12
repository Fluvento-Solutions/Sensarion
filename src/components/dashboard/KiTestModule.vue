<script setup lang="ts">
import { useViewState } from '@/composables/useViewState';

const { kiTestContext, kiTestResult, setKiTestContext } = useViewState();
</script>

<template>
  <div class="flex h-full flex-col gap-6">
    <!-- Kontext-Eingabe (oben, 50%) -->
    <div class="flex flex-1 flex-col gap-3">
      <label class="text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
        Kontext
      </label>
      <textarea
        :value="kiTestContext"
        placeholder="Kontext für den Prompt eingeben..."
        class="flex-1 resize-none rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-sm font-medium text-steel-700 shadow-[0_18px_40px_rgba(12,31,47,0.15)] outline-none transition focus:border-accent-sky/80 focus:shadow-[0_22px_46px_rgba(26,127,216,0.22)] focus:ring-4 focus:ring-accent-sky/20 scrollbar-hide"
        @input="(e) => setKiTestContext((e.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Ausgabe (unten, 50%) -->
    <div class="flex flex-1 flex-col gap-3">
      <label class="text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
        Ausgabe
      </label>
      <div
        class="flex-1 overflow-auto rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-sm font-medium text-steel-700 shadow-[0_18px_40px_rgba(12,31,47,0.15)] scrollbar-hide"
      >
        <p v-if="kiTestResult" class="whitespace-pre-wrap">{{ kiTestResult }}</p>
        <p v-else class="text-steel-400 italic">Keine Ausgabe vorhanden. Gib einen Prompt in der Leiste unten ein.</p>
      </div>
    </div>
  </div>
</template>

