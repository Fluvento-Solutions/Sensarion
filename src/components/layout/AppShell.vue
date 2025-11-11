<script setup lang="ts">
import { computed } from 'vue';
import { useSidebarState } from '@/composables/useSidebarState';

defineSlots<{
  header?: () => unknown;
  sidebar?: () => unknown;
  default?: () => unknown;
  context?: () => unknown;
  footer?: () => unknown;
}>();

const { state: sidebarState } = useSidebarState();

const sidebarWidth = computed(() => (sidebarState.sidebarCollapsed ? 'w-16' : 'w-64'));
const contextWidth = computed(() => (sidebarState.contextCollapsed ? 'w-16' : 'w-80'));
</script>

<template>
  <div class="shell-surface flex-1 relative">
    <header class="flex-none">
      <slot name="header" />
    </header>

    <div class="relative flex min-h-0 flex-1 gap-6 overflow-visible bg-transparent">
      <aside
        v-if="!sidebarState.sidebarCollapsed"
        :class="[
          'glass-card flex-none flex-col gap-6 overflow-hidden p-6 transition-all duration-300 ease-in-out',
          'hidden lg:flex',
          sidebarWidth
        ]"
      >
        <slot name="sidebar" />
      </aside>

      <aside
        v-if="sidebarState.sidebarCollapsed"
        :class="[
          'glass-card absolute -left-20 top-0 z-50 flex h-full w-16 flex-col gap-6 overflow-hidden p-6 transition-all duration-300 ease-in-out'
        ]"
      >
        <slot name="sidebar" />
      </aside>

      <main
        class="glass-card flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out"
      >
        <div class="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-6 lg:p-8">
          <slot />
        </div>
      </main>

      <section
        v-if="!sidebarState.contextCollapsed"
        :class="[
          'glass-card flex-none flex-col gap-6 overflow-hidden p-6 transition-all duration-300 ease-in-out',
          'hidden lg:flex',
          contextWidth
        ]"
      >
        <slot name="context" />
      </section>

      <section
        v-if="sidebarState.contextCollapsed"
        :class="[
          'glass-card absolute -right-20 top-0 z-50 flex h-full w-16 flex-col gap-6 overflow-hidden p-6 transition-all duration-300 ease-in-out'
        ]"
      >
        <slot name="context" />
      </section>
    </div>

    <footer class="flex-none">
      <slot name="footer" />
    </footer>
  </div>
</template>

