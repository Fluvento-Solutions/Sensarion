<template>
  <div class="flex h-full flex-1 flex-col gap-5 overflow-auto scrollbar-hide">
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
</template>

