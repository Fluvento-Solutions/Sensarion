<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <p class="text-xs uppercase tracking-[0.32em] text-steel-200">
        KI-Verbindung
      </p>
      <!-- <div class="skeleton-block h-8 w-24" /> -->
    </div>

    <div class="relative w-full">
      <input
        type="text"
        placeholder="was kann ich für dich tun?"
        class="w-full rounded-2xl border border-white/60 bg-white/80 px-5 py-4 text-lg font-medium text-steel-700 shadow-[0_18px_40px_rgba(12,31,47,0.15)] outline-none transition focus:border-accent-sky/80 focus:shadow-[0_22px_46px_rgba(26,127,216,0.22)] focus:ring-4 focus:ring-accent-sky/20"
      />
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-accent-sky to-accent-teal px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-pane transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/40"
      >
        Senden
      </button>
    </div>

    <!-- <div class="flex flex-wrap gap-2">
      <div class="skeleton-block h-6 w-24 rounded-xl" />
      <div class="skeleton-block h-6 w-20 rounded-xl" />
      <div class="skeleton-block h-6 w-28 rounded-xl" />
    </div> -->
  </div>
</template>

