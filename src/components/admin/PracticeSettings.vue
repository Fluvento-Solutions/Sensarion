<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { PhGear, PhLock } from '@phosphor-icons/vue';
import {
  getPracticeSettings,
  updatePracticeSettings,
  setAdminPassword,
  type PracticeSettings
} from '@/services/api';

const settings = ref<PracticeSettings | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showPasswordModal = ref(false);
const passwordForm = ref({ password: '', confirmPassword: '' });
const settingsJsonText = ref('{}');

const settingsJson = computed({
  get: () => settings.value ? JSON.stringify(settings.value.settings, null, 2) : '{}',
  set: (value: string) => {
    settingsJsonText.value = value;
    if (settings.value) {
      try {
        settings.value.settings = JSON.parse(value);
      } catch {
        // Invalid JSON, ignore
      }
    }
  }
});

const loadSettings = async () => {
  loading.value = true;
  try {
    settings.value = await getPracticeSettings();
    settingsJsonText.value = JSON.stringify(settings.value.settings, null, 2);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden';
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  if (!settings.value) return;
  loading.value = true;
  try {
    const parsed = JSON.parse(settingsJsonText.value);
    await updatePracticeSettings(parsed);
    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Speichern - Ungültiges JSON';
  } finally {
    loading.value = false;
  }
};

const handleSetPassword = async () => {
  if (passwordForm.value.password !== passwordForm.value.confirmPassword) {
    error.value = 'Passwörter stimmen nicht überein';
    return;
  }
  if (passwordForm.value.password.length < 8) {
    error.value = 'Passwort muss mindestens 8 Zeichen lang sein';
    return;
  }
  loading.value = true;
  try {
    await setAdminPassword(passwordForm.value.password);
    showPasswordModal.value = false;
    passwordForm.value = { password: '', confirmPassword: '' };
    await loadSettings();
    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Setzen des Passworts';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-steel-700">Praxis-Einstellungen</h2>
      <p class="text-sm text-steel-500">Verwalten Sie praxis-spezifische Einstellungen</p>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error }}</div>

    <div v-if="loading && !settings" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton-block h-16 w-full" />
    </div>

    <div v-else-if="settings" class="space-y-4">
      <!-- Admin Password -->
      <div class="glass-card rounded-xl border border-white/55 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-steel-700">Admin-Passwort</h3>
            <p class="text-sm text-steel-500">
              {{ settings.hasAdminPassword ? 'Passwort ist gesetzt' : 'Kein Passwort gesetzt' }}
            </p>
          </div>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
            @click="showPasswordModal = true"
          >
            <PhLock :size="18" />
            <span>{{ settings.hasAdminPassword ? 'Passwort ändern' : 'Passwort setzen' }}</span>
          </button>
        </div>
      </div>

      <!-- Practice Settings (JSON Editor) -->
      <div class="glass-card rounded-xl border border-white/55 p-4">
        <h3 class="mb-4 font-semibold text-steel-700">Einstellungen</h3>
        <textarea
          v-model="settingsJsonText"
          class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-3 font-mono text-sm"
          rows="10"
          placeholder='{"key": "value"}'
        />
        <button
          type="button"
          class="mt-4 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
          @click="saveSettings"
        >
          Einstellungen speichern
        </button>
      </div>
    </div>

    <!-- Password Modal -->
    <div
      v-if="showPasswordModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showPasswordModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">Admin-Passwort {{ settings?.hasAdminPassword ? 'ändern' : 'setzen' }}</h3>
        <form @submit.prevent="handleSetPassword" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium">Neues Passwort *</label>
            <input
              v-model="passwordForm.password"
              type="password"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              required
              minlength="8"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Passwort bestätigen *</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              required
              minlength="8"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              @click="showPasswordModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-white"
              :disabled="loading"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>


