<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { PhGear, PhUsers, PhUser, PhUsersThree, PhHouse, PhShield, PhLock } from '@phosphor-icons/vue';
import { useAuthStore } from '@/composables/useAuthStore';
import { useViewState } from '@/composables/useViewState';
import AdminPasswordDialog from '@/components/admin/AdminPasswordDialog.vue';
import UserManagement from '@/components/admin/UserManagement.vue';
import UserTypeManagement from '@/components/admin/UserTypeManagement.vue';
import TeamManagement from '@/components/admin/TeamManagement.vue';
import RoomManagement from '@/components/admin/RoomManagement.vue';
import RoomTypeManagement from '@/components/admin/RoomTypeManagement.vue';
import PermissionManagement from '@/components/admin/PermissionManagement.vue';
import PracticeSettings from '@/components/admin/PracticeSettings.vue';

const auth = useAuthStore();
const { setActiveView } = useViewState();
const currentUser = computed(() => auth.state.user);
const isPracticeAdmin = computed(() => currentUser.value?.isPracticeAdmin ?? false);

const activeTab = ref('users');
const showPasswordDialog = ref(false);
const hasAdminAccess = ref(isPracticeAdmin.value);

const tabs = [
  { id: 'users', label: 'Benutzer', icon: PhUsers },
  { id: 'user-types', label: 'Usertypen', icon: PhUser },
  { id: 'teams', label: 'Teams', icon: PhUsersThree },
  { id: 'rooms', label: 'Räume', icon: PhHouse },
  { id: 'room-types', label: 'Raumtypen', icon: PhHouse },
  { id: 'permissions', label: 'Berechtigungen', icon: PhShield },
  { id: 'settings', label: 'Einstellungen', icon: PhGear }
];

onMounted(() => {
  if (!isPracticeAdmin.value) {
    showPasswordDialog.value = true;
  }
});

const handlePasswordVerified = () => {
  hasAdminAccess.value = true;
  showPasswordDialog.value = false;
};

const handlePasswordDialogClose = () => {
  if (!hasAdminAccess.value) {
    // Wenn kein Zugriff, zurück zur Übersicht
    setActiveView('overview');
  }
};
</script>

<template>
  <div class="flex h-full flex-col">
    <AdminPasswordDialog
      :open="showPasswordDialog"
      @close="handlePasswordDialogClose"
      @verified="handlePasswordVerified"
    />

    <div v-if="!hasAdminAccess" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <PhLock :size="48" weight="regular" class="mx-auto mb-4 text-steel-400" />
        <h2 class="text-xl font-semibold text-steel-700">Admin-Zugang erforderlich</h2>
        <p class="mt-2 text-sm text-steel-500">Bitte geben Sie das Admin-Passwort ein</p>
      </div>
    </div>

    <div v-else class="flex h-full flex-col">
      <!-- Header -->
      <div class="glass-card mb-4 rounded-2xl border border-white/55 p-6">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-sky/10">
            <PhGear :size="24" weight="regular" class="text-accent-sky" />
          </div>
          <div>
            <h1 class="text-2xl font-semibold text-steel-700">Verwaltung</h1>
            <p class="text-sm text-steel-500">Praxis-Einstellungen und Benutzerverwaltung</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="[
            'flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'border-accent-sky/80 bg-white/80 text-accent-sky shadow-[0_4px_12px_rgba(13,86,132,0.15)]'
              : 'border-white/65 bg-white/40 text-steel-600 hover:border-accent-sky/60 hover:bg-white/70'
          ]"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="18" weight="regular" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto">
        <UserManagement v-if="activeTab === 'users'" />
        <UserTypeManagement v-else-if="activeTab === 'user-types'" />
        <TeamManagement v-else-if="activeTab === 'teams'" />
        <RoomManagement v-else-if="activeTab === 'rooms'" />
        <RoomTypeManagement v-else-if="activeTab === 'room-types'" />
        <PermissionManagement v-else-if="activeTab === 'permissions'" />
        <PracticeSettings v-else-if="activeTab === 'settings'" />
      </div>
    </div>
  </div>
</template>

