<script setup lang="ts">
import { ref } from 'vue';
import { PhLock, PhX } from '@phosphor-icons/vue';
import { verifyAdminPassword } from '@/services/api';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'verified'): void;
}>();

const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

const handleSubmit = async () => {
  if (!password.value.trim()) {
    error.value = 'Bitte geben Sie ein Passwort ein';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const result = await verifyAdminPassword(password.value);
    if (result.valid) {
      emit('verified');
      password.value = '';
      emit('close');
    } else {
      error.value = 'Ungültiges Passwort';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Verifizieren des Passworts';
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  password.value = '';
  error.value = null;
  emit('close');
};
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="handleClose"
  >
    <div class="glass-card relative w-full max-w-md rounded-3xl border border-white/55 p-6 shadow-2xl">
      <button
        type="button"
        class="absolute right-4 top-4 text-steel-400 transition-colors hover:text-steel-600"
        @click="handleClose"
      >
        <PhX :size="20" weight="regular" />
      </button>

      <div class="mb-6">
        <div class="mb-4 flex items-center justify-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-accent-sky/10">
            <PhLock :size="32" weight="regular" class="text-accent-sky" />
          </div>
        </div>
        <h2 class="text-center text-2xl font-semibold text-steel-700">Admin-Zugang</h2>
        <p class="mt-2 text-center text-sm text-steel-500">
          Bitte geben Sie das Admin-Passwort ein, um fortzufahren
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="admin-password" class="mb-2 block text-sm font-medium text-steel-600">
            Admin-Passwort
          </label>
          <input
            id="admin-password"
            v-model="password"
            type="password"
            class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-3 text-steel-700 placeholder-steel-400 transition-all focus:border-accent-sky/60 focus:bg-white/70 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
            placeholder="Passwort eingeben"
            :disabled="loading"
            autofocus
          />
        </div>

        <div v-if="error" class="rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>

        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-3 text-sm font-semibold text-steel-600 transition-all hover:border-accent-sky/60 hover:bg-white/70"
            :disabled="loading"
            @click="handleClose"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            class="flex-1 rounded-xl bg-accent-sky px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-sky/90 disabled:opacity-50"
            :disabled="loading || !password.trim()"
          >
            {{ loading ? 'Prüfe...' : 'Bestätigen' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

