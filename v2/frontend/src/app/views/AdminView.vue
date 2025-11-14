<template>
  <div class="admin-view">
    <div class="header">
      <div class="flex items-center gap-4">
        <div class="icon-wrapper">
          <PhGear :size="24" weight="regular" />
        </div>
        <div>
          <h1 class="title">Verwaltung</h1>
          <p class="subtitle">Praxis-Einstellungen und Benutzerverwaltung</p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="18" weight="regular" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Content -->
    <div class="tab-content">
      <UserManagementTab v-if="activeTab === 'users'" />
      <div v-else-if="activeTab === 'user-types'" class="placeholder">
        <p>Usertypen-Verwaltung wird in Kürze verfügbar sein.</p>
      </div>
      <div v-else-if="activeTab === 'teams'" class="placeholder">
        <p>Team-Verwaltung wird in Kürze verfügbar sein.</p>
      </div>
      <div v-else-if="activeTab === 'rooms'" class="placeholder">
        <p>Raum-Verwaltung wird in Kürze verfügbar sein.</p>
      </div>
      <div v-else-if="activeTab === 'room-types'" class="placeholder">
        <p>Raumtyp-Verwaltung wird in Kürze verfügbar sein.</p>
      </div>
      <div v-else-if="activeTab === 'permissions'" class="placeholder">
        <p>Berechtigungs-Verwaltung wird in Kürze verfügbar sein.</p>
      </div>
      <SettingsTab v-else-if="activeTab === 'settings'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  PhGear,
  PhUsers,
  PhUser,
  PhUsersThree,
  PhHouse,
  PhShield
} from '@phosphor-icons/vue';
import UserManagementTab from '@/features/admin/components/UserManagementTab.vue';
import SettingsTab from '@/features/admin/components/SettingsTab.vue';

const activeTab = ref<'users' | 'user-types' | 'teams' | 'rooms' | 'room-types' | 'permissions' | 'settings'>('users');

const tabs = [
  { id: 'users' as const, label: 'Benutzer', icon: PhUsers },
  { id: 'user-types' as const, label: 'Usertypen', icon: PhUser },
  { id: 'teams' as const, label: 'Teams', icon: PhUsersThree },
  { id: 'rooms' as const, label: 'Räume', icon: PhHouse },
  { id: 'room-types' as const, label: 'Raumtypen', icon: PhHouse },
  { id: 'permissions' as const, label: 'Berechtigungen', icon: PhShield },
  { id: 'settings' as const, label: 'Einstellungen', icon: PhGear }
];
</script>

<style scoped>
.admin-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.header {
  @apply glass-card p-6;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(26, 127, 216, 0.12);
  color: var(--color-primary, #1a7fd8);
  backdrop-filter: blur(8px);
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7d8f);
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0;
  scrollbar-width: none;
}

.tabs-nav::-webkit-scrollbar {
  display: none;
}

.tab-button {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7d8f);
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-button:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.tab-button.active {
  @apply bg-white/70 border-white/80;
  color: var(--color-primary, #1a7fd8);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.placeholder {
  @apply glass-card;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary, #6b7d8f);
}
</style>


