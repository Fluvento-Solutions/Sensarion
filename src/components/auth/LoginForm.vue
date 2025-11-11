<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

const props = defineProps<{
  loading?: boolean;
  error?: string | null;
  rememberedEmail?: string | null;
}>();

const emit = defineEmits<{
  (
    event: 'submit',
    payload: { email: string; password: string; remember: boolean; useDevLogin: boolean }
  ): void;
}>();

type FormState = {
  email: string;
  password: string;
  remember: boolean;
  useDevLogin: boolean;
  touched: boolean;
  localError: string | null;
};

const state = reactive<FormState>({
  email: props.rememberedEmail ?? '',
  password: '',
  remember: !!props.rememberedEmail,
  useDevLogin: false,
  touched: false,
  localError: null
});

watch(
  () => props.rememberedEmail,
  (value) => {
    if (!state.touched && value) {
      state.email = value;
      state.remember = true;
    }
  }
);

const disableSubmit = computed(() => props.loading || !state.email || !state.password);

const onSubmit = () => {
  state.touched = true;
  state.localError = null;

  if (!state.email || !state.password) {
    state.localError = 'Bitte gib E-Mail und Passwort ein.';
    return;
  }

  emit('submit', {
    email: state.email.trim(),
    password: state.password,
    remember: state.remember,
    useDevLogin: state.useDevLogin
  });
};
</script>

<template>
  <form
    class="flex flex-col gap-6 rounded-[32px] border border-white/50 bg-white/70 px-8 py-10 shadow-[0_32px_80px_rgba(15,52,86,0.18)] backdrop-blur-2xl"
    @submit.prevent="onSubmit"
  >
    <header class="flex flex-col gap-2 text-center">
      <p class="text-[11px] uppercase tracking-[0.38em] text-steel-200">Sensarion Praxis</p>
      <h1 class="text-[1.75rem] font-semibold text-steel-700">Willkommen zurück</h1>
      <p class="text-sm text-steel-400">
        Logge dich mit deiner Praxis-E-Mail und dem persönlichen Passwort ein.
      </p>
    </header>

    <div class="flex flex-col gap-5">
      <label class="flex flex-col gap-2 text-left text-xs font-medium uppercase tracking-[0.24em] text-steel-300">
        E-Mail
        <input
          v-model="state.email"
          type="email"
          autocomplete="email"
          required
          placeholder="max.mustermann@sensarion.local"
          class="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-steel-700 shadow-[0_16px_32px_rgba(9,36,60,0.08)] outline-none transition focus:border-accent-sky focus:shadow-[0_20px_46px_rgba(20,96,152,0.18)] focus:ring-4 focus:ring-accent-sky/20"
          @input="state.touched = true"
        />
      </label>

      <label class="flex flex-col gap-2 text-left text-xs font-medium uppercase tracking-[0.24em] text-steel-300">
        Passwort
        <input
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="Passwort"
          class="w-full rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm text-steel-700 shadow-[0_16px_32px_rgba(9,36,60,0.08)] outline-none transition focus:border-accent-sky focus:shadow-[0_20px_46px_rgba(20,96,152,0.18)] focus:ring-4 focus:ring-accent-sky/20"
          @input="state.touched = true"
        />
      </label>
    </div>

    <div class="flex flex-col gap-2 text-sm text-steel-400">
      <label class="inline-flex items-center gap-2">
        <input
          v-model="state.remember"
          type="checkbox"
          class="h-4 w-4 rounded border border-steel-200 text-accent-sky focus:ring-accent-sky/30"
        />
        E-Mail merken (Passwort ist trotzdem Pflicht)
      </label>
      <label class="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-steel-300">
        <input
          v-model="state.useDevLogin"
          type="checkbox"
          class="h-4 w-4 rounded border border-steel-200 text-accent-sky focus:ring-accent-sky/30"
        />
        Dev-Login verwenden (lokales Default-Passwort)
      </label>
    </div>

    <div v-if="state.localError || error" class="rounded-2xl border border-accent-sky/40 bg-accent-sky/5 px-4 py-3 text-sm text-accent-sky">
      {{ state.localError ?? error }}
    </div>

    <button
      type="submit"
      class="inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-accent-sky to-accent-teal px-6 py-3 text-sm font-semibold uppercase tracking-[0.36em] text-white shadow-[0_26px_52px_rgba(17,92,148,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-sky/40 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="disableSubmit"
    >
      {{ loading ? 'Anmeldung...' : 'Anmelden' }}
    </button>
  </form>
</template>

