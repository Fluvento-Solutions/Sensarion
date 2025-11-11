<script setup lang="ts">
defineSlots<{
  header?: () => unknown;
  sidebar?: () => unknown;
  default?: () => unknown;
  context?: () => unknown;
  footer?: () => unknown;
}>();
</script>

<template>
  <div class="shell-surface flex-1 ">
    <header class="flex-none">
      <slot name="header" />
    </header>

    <div class="flex min-h-0 flex-1 gap-6 overflow-hidden bg-transparent">
      <aside class="glass-card hidden w-64 flex-none flex-col gap-6 overflow-auto p-6 lg:flex">
        <slot name="sidebar" />
      </aside>

      <main class="glass-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-6 lg:p-8">
          <slot />
        </div>
      </main>

      <section class="glass-card hidden w-80 flex-none flex-col gap-6 overflow-auto p-6 lg:flex">
        <slot name="context" />
      </section>
    </div>

    <footer class="glass-card flex-none p-4 lg:p-6">
      <slot name="footer" />
    </footer>
  </div>
</template>

