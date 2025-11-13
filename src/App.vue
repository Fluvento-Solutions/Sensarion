<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import LoginForm from '@/components/auth/LoginForm.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppShell from '@/components/layout/AppShell.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ContextPanel from '@/components/layout/ContextPanel.vue';
import FooterConsole from '@/components/layout/FooterConsole.vue';
import OverviewPanel from '@/components/dashboard/OverviewPanel.vue';
import KiTestModule from '@/components/dashboard/KiTestModule.vue';
import PatientsModule from '@/components/dashboard/PatientsModule.vue';
import CalendarModule from '@/components/dashboard/CalendarModule.vue';
import AdminModule from '@/components/dashboard/AdminModule.vue';
import SetupWizard from '@/components/admin/SetupWizard.vue';
import { devLogin, fetchProfile, login, logout, getSetupStatus } from '@/services/api';
import { useAuthStore } from '@/composables/useAuthStore';
import { useViewState } from '@/composables/useViewState';

const { setActiveView } = useViewState();

const auth = useAuthStore();
const { activeView } = useViewState();

const loadingProfile = ref(false);
const profileError = ref<string | null>(null);
const rememberedEmail = ref<string | null>(localStorage.getItem('sensarion-last-email'));
const showSetup = ref(false);
const checkingSetup = ref(true);

const currentUser = computed(() => auth.state.user);
const token = computed(() => auth.state.token);
const isAuthenticated = computed(() => !!token.value && !!currentUser.value);

const loadProfile = async () => {
  if (!token.value || !auth.state.user) {
    return;
  }

  try {
    loadingProfile.value = true;
    profileError.value = null;
    const user = await fetchProfile(auth.state.user.id, token.value);
    auth.setSession(token.value, user);
  } catch (error) {
    profileError.value = error instanceof Error ? error.message : 'Profil konnte nicht geladen werden';
  } finally {
    loadingProfile.value = false;
  }
};

const handleLogin = async (payload: {
  email: string;
  password: string;
  remember: boolean;
  useDevLogin: boolean;
}) => {
  profileError.value = null;
  loadingProfile.value = true;

  try {
    const authResponse = payload.useDevLogin
      ? await devLogin(payload.email, payload.password)
      : await login(payload.email, payload.password);

    auth.setSession(authResponse.token, authResponse.user);
    if (payload.remember) {
      localStorage.setItem('sensarion-last-email', payload.email);
      rememberedEmail.value = payload.email;
    } else {
      localStorage.removeItem('sensarion-last-email');
      rememberedEmail.value = null;
    }
  } catch (error) {
    profileError.value =
      error instanceof Error ? error.message : 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
  } finally {
    loadingProfile.value = false;
  }
};

const handleLogout = async () => {
  if (token.value) {
    try {
      await logout(token.value);
    } catch (error) {
      console.warn('Logout fehlgeschlagen', error);
    }
  }

  auth.clearSession();
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Shortcut "7" für Admin
  if (event.key === '7' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    const target = event.target as HTMLElement;
    // Ignoriere wenn in einem Input-Feld
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    if (isAuthenticated.value) {
      setActiveView('admin');
    }
  }
};

onMounted(async () => {
  // Keyboard-Shortcut-Listener hinzufügen
  window.addEventListener('keydown', handleKeyDown);

  // Prüfe Setup-Status
  try {
    const status = await getSetupStatus();
    showSetup.value = !status.installationComplete;
  } catch (error) {
    // Wenn Setup-API nicht erreichbar, gehe von abgeschlossener Installation aus
    showSetup.value = false;
  } finally {
    checkingSetup.value = false;
  }

  if (token.value && currentUser.value && !showSetup.value) {
    await loadProfile();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <SetupWizard v-if="!checkingSetup && showSetup" />

  <div v-else-if="!isAuthenticated" class="auth-surface">
    <div class="glass-card mx-auto w-full max-w-lg">
      <LoginForm
        :loading="loadingProfile"
        :error="profileError"
        :remembered-email="rememberedEmail"
        @submit="handleLogin"
      />
    </div>
  </div>

  <AppShell v-else>
    <template #header>
      <AppHeader
        :user="currentUser"
        :loading="loadingProfile"
        :error="profileError"
        @logout="handleLogout"
      />
    </template>

    <template #sidebar>
      <AppSidebar />
    </template>

    <template #default>
      <div v-if="profileError" class="flex flex-1 items-center justify-center">
        <div class="max-w-sm text-center text-steel-500">
          <p class="text-sm uppercase tracking-[0.28em] text-steel-200">Anmeldung</p>
          <h2 class="mt-2 text-xl font-semibold text-steel-700">Profil konnte nicht geladen werden</h2>
          <p class="mt-3 text-sm leading-relaxed">
            {{ profileError }}. Bitte stelle sicher, dass der API-Server läuft und die Datenbank migriert wurde.
          </p>
        </div>
      </div>
      <KiTestModule v-else-if="activeView === 'ki-test'" />
      <PatientsModule v-else-if="activeView === 'patients'" />
      <CalendarModule v-else-if="activeView === 'calendar'" />
      <AdminModule v-else-if="activeView === 'admin'" />
      <OverviewPanel v-else />
    </template>

    <template #context>
      <ContextPanel />
    </template>

    <template #footer>
      <FooterConsole />
    </template>
  </AppShell>
</template>

