<script setup lang="ts">
import { computed } from 'vue';

import type { UserProfile } from '@/services/api';

const props = defineProps<{
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}>();

const initials = computed(() => {
  if (!props.user) return '??';
  const parts = props.user.displayName.split(' ');
  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
});
</script>

<template>
  <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-sky/80 to-accent-teal/80 shadow-pane">
          <div
            class="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-white"
          >
            {{ initials }}
          </div>
        </div>

        <div class="flex flex-col">
          <p class="text-xs uppercase tracking-[0.32em] text-steel-200">Sensarion Praxis</p>
          <h1 class="text-2xl font-semibold text-steel-700">
            {{ user?.practice.name ?? 'Praxis wird geladen...' }}
          </h1>
        </div>
      </div>

      <div v-if="user" class="flex flex-wrap items-center gap-2 text-sm text-steel-500">
        <span class="rounded-full border border-white/60 bg-white/80 px-3 py-1">Code:
          <strong class="font-medium text-steel-700">{{ user.practice.code }}</strong>
        </span>
        <span class="rounded-full border border-white/60 bg-white/80 px-3 py-1">
          Teams: {{ user.teams.length }}
        </span>
        <span v-if="user.isPracticeAdmin" class="rounded-full border border-accent-sky/40 bg-accent-sky/10 px-3 py-1 text-accent-sky">
          Praxis-Admin
        </span>
      </div>

      <div v-else-if="loading" class="flex gap-2">
        <div class="skeleton-block h-6 w-32" />
        <div class="skeleton-block h-6 w-24" />
      </div>

      <div v-else-if="error" class="text-sm text-accent-sky">
        {{ error }}
      </div>
    </div>

    <button
      class="group relative flex h-14 items-center gap-3 rounded-2xl border border-white/55 bg-white/85 px-4 pr-12 shadow-[0_20px_45px_rgba(15,46,70,0.15)] transition hover:shadow-[0_26px_52px_rgba(15,46,70,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/25"
      type="button"
      aria-label="Profil öffnen"
    >
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-sky to-accent-teal text-white shadow-pane">
        {{ initials }}
      </div>
      <div class="flex flex-col items-start">
        <span class="text-sm font-medium text-steel-700">
          {{ user?.displayName ?? 'Benutzer lädt...' }}
        </span>
        <span class="text-xs uppercase tracking-[0.22em] text-steel-200">
          {{ user?.shortName ?? '' }}
        </span>
      </div>
      <span
        class="absolute right-3 top-1/2 inline-flex -translate-y-1/2 rounded-full border border-white/50 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-steel-200 transition group-hover:border-accent-sky/40 group-hover:text-accent-sky"
      >
        Profil
      </span>
    </button>
  </div>
</template>

