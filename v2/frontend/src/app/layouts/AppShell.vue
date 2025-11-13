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
  <div class="shell-surface flex-1 relative">
    <header class="flex-none">
      <slot name="header" />
    </header>

    <div class="relative flex min-h-0 flex-1 gap-6 overflow-visible bg-transparent">
      <!-- Context-Panel links -->
      <section
        class="glass-card relative flex-none flex-col overflow-hidden hidden lg:flex w-80"
      >
        <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-6 scrollbar-hide">
          <slot name="context" />
        </div>
      </section>

      <!-- Main-Panel rechts (nimmt restlichen Raum ein) -->
      <main
        class="glass-card relative flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div class="flex min-h-0 flex-1 flex-col gap-8 overflow-auto p-6 lg:p-8 scrollbar-hide">
          <slot />
        </div>
      </main>
    </div>

    <footer class="flex-none">
      <slot name="footer" />
    </footer>
  </div>
</template>

