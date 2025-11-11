<script setup lang="ts">
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue';
import { useSidebarState } from '@/composables/useSidebarState';

const { state, toggleSidebar } = useSidebarState();
</script>

<template>
  <div class="flex h-full flex-col">
    <button
      type="button"
      class="mb-4 flex h-8 w-full items-center justify-center rounded-lg border border-white/60 bg-white/40 text-steel-600 transition-all hover:border-accent-sky/60 hover:bg-white/70 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/25"
      @click="toggleSidebar"
    >
      <PhCaretLeft v-if="!state.sidebarCollapsed" :size="16" weight="regular" />
      <PhCaretRight v-else :size="16" weight="regular" />
    </button>
    <nav
      v-if="!state.sidebarCollapsed"
      class="flex flex-1 flex-col gap-4 overflow-auto"
    >
      <div class="flex flex-col gap-3">
        <p class="text-xs uppercase tracking-[0.28em] text-steel-200">Navigation</p>
        <div class="flex flex-col gap-3">
          <div class="skeleton-block h-11 w-full" />
          <div class="skeleton-block h-11 w-full" />
          <div class="skeleton-block h-11 w-full" />
        </div>
      </div>

      <div class="flex flex-col gap-3 pt-6">
        <p class="text-xs uppercase tracking-[0.28em] text-steel-200">Module</p>
        <div class="flex flex-col gap-3">
          <div class="skeleton-block h-14 w-full" />
          <div class="skeleton-block h-14 w-full" />
          <div class="skeleton-block h-14 w-full" />
          <div class="skeleton-block h-14 w-full" />
        </div>
      </div>
    </nav>
  </div>
</template>

