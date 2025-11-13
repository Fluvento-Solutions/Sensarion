<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PhCheckCircle, PhXCircle, PhSpinner, PhUpload, PhPalette } from '@phosphor-icons/vue';
import {
  getSetupStatus,
  initSetup,
  testPostgresConnection,
  testOllamaConnection,
  getOllamaModels,
  updateWhitelabel,
  type InitSetupData,
  type OllamaModel
} from '@/services/api';

const currentStep = ref(1);
const totalSteps = 5;
const isLoading = ref(false);
const error = ref<string | null>(null);
const installationComplete = ref(false);

// Step 1: System-Tests
const postgresStatus = ref<'pending' | 'success' | 'error'>('pending');
const ollamaStatus = ref<'pending' | 'success' | 'error'>('pending');
const models = ref<OllamaModel[]>([]);

// Step 2: Initial Setup
const initForm = ref<InitSetupData>({
  practiceName: '',
  practiceCode: '',
  adminEmail: '',
  adminPassword: '',
  adminDisplayName: '',
  adminShortName: ''
});

// Step 3: Whitelabel
const whitelabelForm = ref({
  practiceId: '',
  logoUrl: '',
  primaryColor: '#0ea5e9'
});

// Step 4: Review
const setupComplete = ref(false);

const progress = computed(() => (currentStep.value / totalSteps) * 100);

const testConnections = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Test PostgreSQL
    try {
      await testPostgresConnection();
      postgresStatus.value = 'success';
    } catch {
      postgresStatus.value = 'error';
    }

    // Test Ollama
    try {
      await testOllamaConnection();
      ollamaStatus.value = 'success';
      
      // Lade Modelle
      models.value = await getOllamaModels();
    } catch {
      ollamaStatus.value = 'error';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Testen der Verbindungen';
  } finally {
    isLoading.value = false;
  }
};

const handleInit = async () => {
  if (!initForm.value.practiceName.trim() || 
      !initForm.value.practiceCode.trim() || 
      !initForm.value.adminEmail.trim() || 
      !initForm.value.adminPassword.trim() || 
      !initForm.value.adminDisplayName.trim()) {
    error.value = 'Bitte füllen Sie alle Felder aus';
    return;
  }

  if (initForm.value.adminPassword.length < 8) {
    error.value = 'Passwort muss mindestens 8 Zeichen lang sein';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const result = await initSetup(initForm.value);
    whitelabelForm.value.practiceId = result.practice.id;
    setupComplete.value = true;
    currentStep.value = 3;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler bei der Initialisierung';
  } finally {
    isLoading.value = false;
  }
};

const handleWhitelabel = async () => {
  if (!whitelabelForm.value.practiceId) {
    error.value = 'Praxis-ID fehlt';
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    await updateWhitelabel({
      practiceId: whitelabelForm.value.practiceId,
      logoUrl: whitelabelForm.value.logoUrl || undefined,
      primaryColor: whitelabelForm.value.primaryColor || undefined
    });
    currentStep.value = 4;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Whitelabel-Einstellungen';
  } finally {
    isLoading.value = false;
  }
};

const handleLogoUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Konvertiere zu Data URL (für Demo)
  const reader = new FileReader();
  reader.onload = (e) => {
    whitelabelForm.value.logoUrl = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const finishSetup = () => {
  installationComplete.value = true;
  // Reload page to show login
  window.location.reload();
};

onMounted(async () => {
  // Prüfe Setup-Status
  try {
    const status = await getSetupStatus();
    installationComplete.value = status.installationComplete;
    
    if (!status.installationComplete) {
      // Starte mit System-Tests
      await testConnections();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden des Setup-Status';
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-steel-50 to-steel-100 p-4">
    <div class="glass-card w-full max-w-4xl p-8">
      <div v-if="installationComplete" class="text-center">
        <PhCheckCircle :size="64" weight="regular" class="mx-auto text-green-500" />
        <h1 class="mt-4 text-2xl font-semibold text-steel-700">Installation abgeschlossen</h1>
        <p class="mt-2 text-steel-500">Das System ist bereit zur Nutzung.</p>
        <button
          @click="finishSetup"
          class="mt-6 rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-6 py-3 text-sm font-semibold text-white shadow-pane transition hover:brightness-110"
        >
          Zum Login
        </button>
      </div>

      <div v-else>
        <!-- Progress Bar -->
        <div class="mb-8">
          <div class="mb-2 flex items-center justify-between text-sm text-steel-600">
            <span>Schritt {{ currentStep }} von {{ totalSteps }}</span>
            <span>{{ Math.round(progress) }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-white/40">
            <div
              class="h-full bg-gradient-to-r from-accent-sky to-accent-teal transition-all duration-300"
              :style="{ width: `${progress}%` }"
            />
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {{ error }}
        </div>

        <!-- Step 1: System-Tests -->
        <div v-if="currentStep === 1" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-steel-700">System-Verbindungen prüfen</h2>
            <p class="mt-1 text-sm text-steel-500">Prüfe ob PostgreSQL und Ollama erreichbar sind</p>
          </div>

          <div class="space-y-4">
            <!-- PostgreSQL Status -->
            <div class="flex items-center justify-between rounded-xl border border-white/60 bg-white/40 p-4">
              <div class="flex items-center gap-3">
                <PhSpinner v-if="postgresStatus === 'pending'" :size="24" weight="regular" class="animate-spin text-steel-400" />
                <PhCheckCircle v-else-if="postgresStatus === 'success'" :size="24" weight="regular" class="text-green-500" />
                <PhXCircle v-else :size="24" weight="regular" class="text-red-500" />
                <span class="font-medium text-steel-700">PostgreSQL</span>
              </div>
              <span
                :class="{
                  'text-steel-400': postgresStatus === 'pending',
                  'text-green-600': postgresStatus === 'success',
                  'text-red-600': postgresStatus === 'error'
                }"
                class="text-sm font-medium"
              >
                {{ postgresStatus === 'pending' ? 'Prüfe...' : postgresStatus === 'success' ? 'Verbunden' : 'Fehler' }}
              </span>
            </div>

            <!-- Ollama Status -->
            <div class="flex items-center justify-between rounded-xl border border-white/60 bg-white/40 p-4">
              <div class="flex items-center gap-3">
                <PhSpinner v-if="ollamaStatus === 'pending'" :size="24" weight="regular" class="animate-spin text-steel-400" />
                <PhCheckCircle v-else-if="ollamaStatus === 'success'" :size="24" weight="regular" class="text-green-500" />
                <PhXCircle v-else :size="24" weight="regular" class="text-red-500" />
                <span class="font-medium text-steel-700">Ollama</span>
              </div>
              <span
                :class="{
                  'text-steel-400': ollamaStatus === 'pending',
                  'text-green-600': ollamaStatus === 'success',
                  'text-red-600': ollamaStatus === 'error'
                }"
                class="text-sm font-medium"
              >
                {{ ollamaStatus === 'pending' ? 'Prüfe...' : ollamaStatus === 'success' ? 'Verbunden' : 'Fehler' }}
              </span>
            </div>

            <!-- Verfügbare Modelle -->
            <div v-if="models.length > 0" class="rounded-xl border border-white/60 bg-white/40 p-4">
              <p class="mb-2 text-sm font-medium text-steel-700">Verfügbare Modelle:</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="model in models"
                  :key="model.name"
                  class="rounded-lg bg-accent-sky/10 px-3 py-1 text-xs font-medium text-accent-sky"
                >
                  {{ model.name }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="testConnections"
              :disabled="isLoading"
              class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60 disabled:opacity-60"
            >
              Erneut prüfen
            </button>
            <button
              @click="currentStep = 2"
              :disabled="postgresStatus !== 'success' || ollamaStatus !== 'success'"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Weiter
            </button>
          </div>
        </div>

        <!-- Step 2: Initial Setup -->
        <div v-if="currentStep === 2" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-steel-700">Erste Praxis & Admin-Benutzer</h2>
            <p class="mt-1 text-sm text-steel-500">Erstellen Sie die erste Praxis und den Administrator-Benutzer</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Praxis-Name <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="initForm.practiceName"
                type="text"
                placeholder="z.B. Praxis Dr. Mustermann"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Praxis-Code <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="initForm.practiceCode"
                type="text"
                placeholder="z.B. MUSTERMANN"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Admin-E-Mail <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="initForm.adminEmail"
                  type="email"
                  placeholder="admin@praxis.de"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Admin-Passwort <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="initForm.adminPassword"
                  type="password"
                  placeholder="Mindestens 8 Zeichen"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Anzeigename <span class="text-accent-sky">*</span>
                </label>
                <input
                  v-model="initForm.adminDisplayName"
                  type="text"
                  placeholder="z.B. Dr. Max Mustermann"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                  Kurzname (optional)
                </label>
                <input
                  v-model="initForm.adminShortName"
                  type="text"
                  placeholder="z.B. Max"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="currentStep = 1"
              class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            >
              Zurück
            </button>
            <button
              @click="handleInit"
              :disabled="isLoading"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PhSpinner v-if="isLoading" :size="16" weight="regular" class="animate-spin" />
              <span v-else>Erstellen</span>
            </button>
          </div>
        </div>

        <!-- Step 3: Whitelabel -->
        <div v-if="currentStep === 3" class="space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-steel-700">Whitelabel-Design</h2>
            <p class="mt-1 text-sm text-steel-500">Konfigurieren Sie das Erscheinungsbild Ihrer Praxis</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Logo
              </label>
              <div class="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleLogoUpload"
                  class="hidden"
                  id="logo-upload"
                />
                <label
                  for="logo-upload"
                  class="flex cursor-pointer items-center gap-2 rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
                >
                  <PhUpload :size="16" weight="regular" />
                  Logo hochladen
                </label>
                <img
                  v-if="whitelabelForm.logoUrl"
                  :src="whitelabelForm.logoUrl"
                  alt="Logo"
                  class="h-12 w-auto rounded-lg"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Primärfarbe
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model="whitelabelForm.primaryColor"
                  type="color"
                  class="h-10 w-20 cursor-pointer rounded-lg border border-white/60"
                />
                <input
                  v-model="whitelabelForm.primaryColor"
                  type="text"
                  placeholder="#0ea5e9"
                  class="flex-1 rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button
              @click="currentStep = 2"
              class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            >
              Zurück
            </button>
            <button
              @click="handleWhitelabel"
              :disabled="isLoading"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PhSpinner v-if="isLoading" :size="16" weight="regular" class="animate-spin" />
              <span v-else>Speichern</span>
            </button>
          </div>
        </div>

        <!-- Step 4: Review -->
        <div v-if="currentStep === 4" class="space-y-6">
          <div class="text-center">
            <PhCheckCircle :size="64" weight="regular" class="mx-auto text-green-500" />
            <h2 class="mt-4 text-xl font-semibold text-steel-700">Installation abgeschlossen!</h2>
            <p class="mt-2 text-steel-500">Das System ist bereit zur Nutzung.</p>
          </div>

          <div class="rounded-xl border border-white/60 bg-white/40 p-6">
            <h3 class="mb-4 text-sm font-semibold text-steel-700">Zusammenfassung</h3>
            <div class="space-y-2 text-sm text-steel-600">
              <div class="flex justify-between">
                <span>Praxis:</span>
                <span class="font-medium text-steel-700">{{ initForm.practiceName }}</span>
              </div>
              <div class="flex justify-between">
                <span>Admin-E-Mail:</span>
                <span class="font-medium text-steel-700">{{ initForm.adminEmail }}</span>
              </div>
              <div class="flex justify-between">
                <span>PostgreSQL:</span>
                <span class="font-medium text-green-600">Verbunden</span>
              </div>
              <div class="flex justify-between">
                <span>Ollama:</span>
                <span class="font-medium text-green-600">Verbunden</span>
              </div>
            </div>
          </div>

          <div class="flex justify-center">
            <button
              @click="finishSetup"
              class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-6 py-3 text-sm font-semibold text-white shadow-pane transition hover:brightness-110"
            >
              Zum Login
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

