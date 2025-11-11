<script setup lang="ts">
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue';
import { useSidebarState } from '@/composables/useSidebarState';

const { state, toggleContext } = useSidebarState();
</script>

<template>
  <div class="flex h-full flex-col">
    <button
      type="button"
      class="mb-4 flex h-8 w-full items-center justify-center rounded-lg border border-white/60 bg-white/40 text-steel-600 transition-all hover:border-accent-sky/60 hover:bg-white/70 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/25"
      @click="toggleContext"
    >
      <PhCaretRight v-if="!state.contextCollapsed" :size="16" weight="regular" />
      <PhCaretLeft v-else :size="16" weight="regular" />
    </button>
    <div
      v-if="!state.contextCollapsed"
      class="flex flex-1 flex-col gap-5 overflow-auto"
    >
      <div class="flex flex-col gap-3">
        <p class="text-xs uppercase tracking-[0.28em] text-steel-200">Live Status</p>
        <div class="skeleton-block h-24 w-full" />
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs uppercase tracking-[0.28em] text-steel-200">Alerts</p>
        <div class="flex flex-col gap-3">
          <div class="skeleton-block h-16 w-full" />
          <div class="skeleton-block h-16 w-full" />
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <p class="text-xs uppercase tracking-[0.28em] text-steel-200"> Aufgabenliste</p>
        <div class="flex flex-col gap-3">
          <div class="skeleton-block h-12 w-full" />
          <div class="skeleton-block h-12 w-full" />
          <div class="skeleton-block h-12 w-full" />
        </div>
      </div>
    </div>
  </div>
</template>

