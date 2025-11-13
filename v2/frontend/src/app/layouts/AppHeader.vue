<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  PhCalendar,
  PhChartBar,
  PhUser,
  PhGear,
  PhBell,
  PhSignOut,
  PhSquaresFour,
  PhSparkle,
  PhStethoscope
} from '@phosphor-icons/vue';

// @ts-ignore - Image imports
import placeholderLogo from '@/assets/media/image/example_logo.png';
// @ts-ignore - Image imports
import userAvatar from '@/assets/media/image/maxmuster.png';
import { useViewState } from '@/app/composables/useViewState';
import { useAuthStore } from '@/features/identity/useAuthStore';

const { activeView, setActiveView } = useViewState();
const authStore = useAuthStore();

const shortcutIcons = [
  PhSquaresFour,  // Shortcut 1: Overview
  PhSparkle,      // Shortcut 2: KI-Test
  PhStethoscope,  // Shortcut 3: Patientenakte
  PhCalendar,
  PhChartBar,
  PhUser,
  PhGear,
  PhBell
];

const handleShortcutClick = (index: number) => {
  if (index === 0) {
    // Shortcut 1: Overview
    setActiveView('overview');
  } else if (index === 1) {
    // Shortcut 2: KI-Test
    setActiveView('ki-test');
  } else if (index === 2) {
    // Shortcut 3: Patientenakte
    setActiveView('patients');
  } else if (index === 3) {
    // Shortcut 4: Kalender
    setActiveView('calendar');
  } else if (index === 6) {
    // Shortcut 7: Admin
    setActiveView('admin');
  } else {
    console.log(`Shortcut ${index + 1} clicked`);
  }
};

const user = computed(() => authStore.state.user);
const loading = computed(() => false); // TODO: Loading state from auth store
const error = computed(() => null); // TODO: Error state from auth store

const emit = defineEmits<{
  (event: 'logout'): void;
}>();

const practiceSubtitle = computed(() => {
  if (!user.value) return 'Praxis wird geladen...';
  // TODO: Teams aus User-Daten holen, wenn verfügbar
  return 'TEAM';
});

const practiceName = computed(() => {
  // TODO: Praxis-Name aus User/Tenant-Daten holen
  return 'Praxis Dr. Mustermann';
});

const practiceLogoUrl = computed(() => {
  // TODO: Logo-URL aus Tenant-Daten holen
  return null;
});

const displayLogoUrl = computed(() => {
  return practiceLogoUrl.value ?? placeholderLogo;
});

const logoLoadError = ref(false);

const handleLogoError = () => {
  logoLoadError.value = true;
};

watch(
  () => practiceLogoUrl.value,
  () => {
    logoLoadError.value = false;
  }
);

const handleLogout = () => {
  emit('logout');
};
</script>

<template>
  <div class="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-stretch lg:gap-6">
    <section
      class="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/55 bg-gradient-to-br from-white via-[#f3f7fc] to-white/55 px-6 py-6 shadow-[0_32px_60px_rgba(18,52,82,0.12)] ring-1 ring-white/35 backdrop-blur-xl"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-white/80 via-white/40 to-white/15" aria-hidden="true" />
      <div class="relative flex h-full flex-col gap-6">
        <template v-if="user">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex flex-1 flex-col gap-4">
              <div class="flex items-center gap-4">
                <div
                  class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(13,86,132,0.25)]"
                  aria-hidden="true"
                >
                  <img
                    v-if="!logoLoadError"
                    :src="displayLogoUrl"
                    :alt="practiceLogoUrl ? `${practiceName} Logo` : `${practiceName} Logo (Platzhalter)`"
                    loading="lazy"
                    class="h-full w-full object-contain p-2"
                    @error="handleLogoError"
                  />
                  <span
                    v-else
                    class="text-lg font-semibold uppercase text-steel-400"
                  >
                    ??
                  </span>
                </div>
                <div>
                  <p class="text-[11px] uppercase tracking-[0.38em] text-steel-200">Sensarion Praxis</p>
                  <h1 class="text-2xl font-semibold text-steel-700">
                    {{ practiceName }}
                  </h1>
                  <p class="text-xs font-medium uppercase tracking-[0.26em] text-steel-300">
                    {{ practiceSubtitle }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex w-full justify-center lg:w-auto lg:justify-end">
              <div class="grid w-full max-w-[240px] grid-cols-4 gap-3">
                <button
                  v-for="(Icon, index) in shortcutIcons"
                  :key="`practice-shortcut-${index}`"
                  type="button"
                  :class="[
                    'flex h-12 w-12 items-center justify-center rounded-full border text-steel-600 transition-all hover:scale-110 hover:shadow-[0_8px_24px_rgba(13,86,132,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/25 active:scale-95',
                    (index === 0 && activeView === 'overview') || (index === 1 && activeView === 'ki-test') || (index === 2 && activeView === 'patients') || (index === 3 && activeView === 'calendar') || (index === 6 && activeView === 'admin')
                      ? 'border-accent-sky/80 bg-white/80 shadow-[0_8px_24px_rgba(13,86,132,0.2)]'
                      : 'border-white/65 bg-white/40 hover:border-accent-sky/60 hover:bg-white/70'
                  ]"
                  @click="handleShortcutClick(index)"
                >
                  <component :is="Icon" :size="20" weight="regular" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="loading">
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <div class="skeleton-block h-14 w-14" />
              <div class="flex flex-col gap-2">
                <div class="skeleton-block h-4 w-32" />
                <div class="skeleton-block h-6 w-48" />
                <div class="skeleton-block h-3 w-40" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="slot in 6" :key="`loading-shortcut-${slot}`" class="skeleton-block h-12 w-12 rounded-full" />
            </div>
          </div>
        </template>

        <template v-else-if="error">
          <p class="text-sm text-accent-sky">
            {{ error }}
          </p>
        </template>
      </div>
    </section>

    <section
      class="glass-card relative flex h-full flex-col justify-between overflow-hidden px-5 py-5 text-left shadow-[0_24px_48px_rgba(12,42,70,0.18)]"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-white/80 via-white/45 to-white/20" aria-hidden="true" />
      <div class="relative flex items-start gap-4">
        <div
          class="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-white shadow-pane"
          aria-hidden="true"
        >
          <img
            :src="userAvatar"
            :alt="user ? `${user.displayName} Profilbild` : 'Profilbild'"
            loading="lazy"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="flex flex-1 flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-steel-700">
              {{ user?.displayName ?? (loading ? 'Benutzer lädt…' : 'Unbekannt') }}
            </span>
            <span
              v-if="user?.roles?.includes('admin')"
              class="rounded-full border border-accent-sky/40 bg-accent-sky/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-accent-sky"
            >
              Admin
            </span>
          </div>
          <span class="text-[8px] font-medium uppercase tracking-[0.28em] text-steel-300">
            {{ user?.email ?? '' }}
          </span>
        </div>
      </div>

      <button
        class="relative mt-auto inline-flex h-9 w-auto items-center justify-center gap-2 rounded-2xl border border-white/65 bg-white/40 px-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-steel-600 transition-all hover:border-accent-sky/60 hover:bg-white/70 hover:scale-105 hover:shadow-[0_8px_24px_rgba(13,86,132,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/25 active:scale-95 disabled:opacity-40"
        type="button"
        @click="handleLogout"
        :disabled="!user || loading"
      >
        <PhSignOut :size="16" weight="regular" />
        <span>Logout</span>
      </button>
    </section>
  </div>
</template>

