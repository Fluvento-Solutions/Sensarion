<template>
  <div class="shell-surface">
    <header class="glass-card flex-none p-6 lg:p-8">
      <slot name="header" />
    </header>

    <div class="flex flex-1 gap-6 overflow-hidden">
      <aside class="glass-card hidden w-64 flex-none flex-col gap-6 overflow-hidden p-6 lg:flex">
        <slot name="sidebar" />
      </aside>

      <main class="glass-card flex-1 overflow-hidden">
        <div class="flex h-full flex-col overflow-auto p-6 lg:p-8">
          <slot />
        </div>
      </main>

      <section class="glass-card hidden w-80 flex-none flex-col gap-6 overflow-hidden p-6 lg:flex">
        <slot name="context" />
      </section>
    </div>

    <footer class="glass-card flex-none p-4 lg:p-6">
      <slot name="footer" />
    </footer>
  </div>
</template>

