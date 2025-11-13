<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PhShield, PhShieldCheck } from '@phosphor-icons/vue';
import {
  getAdminUsers,
  getAdminTeams,
  getAvailablePermissions,
  getUserPermissions,
  updateUserPermissions,
  type AdminUser,
  type AdminTeam
} from '@/services/api';

const users = ref<AdminUser[]>([]);
const teams = ref<AdminTeam[]>([]);
const permissions = ref<string[]>([]);
const selectedUserId = ref<string | null>(null);
const selectedMembershipId = ref<string | null>(null);
const userPermissions = ref<string[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const loadData = async () => {
  loading.value = true;
  try {
    [users.value, teams.value, permissions.value] = await Promise.all([
      getAdminUsers(),
      getAdminTeams(),
      getAvailablePermissions()
    ]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden';
  } finally {
    loading.value = false;
  }
};

const handleUserSelect = async (userId: string) => {
  selectedUserId.value = userId;
  loading.value = true;
  try {
    userPermissions.value = await getUserPermissions(userId);
    // Find membership ID from teams
    const team = teams.value.find(t => t.members.some(m => m.userId === userId));
    if (team) {
      const member = team.members.find(m => m.userId === userId);
      if (member) {
        selectedMembershipId.value = member.id;
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler';
  } finally {
    loading.value = false;
  }
};

const togglePermission = (permission: string) => {
  if (userPermissions.value.includes(permission)) {
    userPermissions.value = userPermissions.value.filter(p => p !== permission);
  } else {
    userPermissions.value.push(permission);
  }
};

const savePermissions = async () => {
  if (!selectedUserId.value || !selectedMembershipId.value) {
    error.value = 'Bitte wählen Sie einen Benutzer und ein Team aus';
    return;
  }

  loading.value = true;
  try {
    await updateUserPermissions(selectedUserId.value, {
      membershipId: selectedMembershipId.value,
      permissions: userPermissions.value
    });
    error.value = null;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Speichern';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-xl font-semibold text-steel-700">Berechtigungen</h2>
      <p class="text-sm text-steel-500">Verwalten Sie Benutzer-Berechtigungen</p>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error }}</div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- User Selection -->
      <div class="glass-card rounded-xl border border-white/55 p-4">
        <h3 class="mb-4 font-semibold text-steel-700">Benutzer auswählen</h3>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          <button
            v-for="user in users"
            :key="user.id"
            type="button"
            :class="[
              'w-full rounded-lg border p-3 text-left transition-all',
              selectedUserId === user.id
                ? 'border-accent-sky bg-accent-sky/10'
                : 'border-white/65 bg-white/40 hover:bg-white/70'
            ]"
            @click="handleUserSelect(user.id)"
          >
            <div class="font-medium text-steel-700">{{ user.displayName }}</div>
            <div class="text-xs text-steel-500">{{ user.email }}</div>
          </button>
        </div>
      </div>

      <!-- Permissions -->
      <div class="glass-card rounded-xl border border-white/55 p-4">
        <h3 class="mb-4 font-semibold text-steel-700">Berechtigungen</h3>
        <div v-if="!selectedUserId" class="py-12 text-center text-steel-500">
          <PhShield :size="48" class="mx-auto mb-4 opacity-50" />
          <p>Bitte wählen Sie einen Benutzer aus</p>
        </div>
        <div v-else class="space-y-2 max-h-96 overflow-y-auto">
          <label
            v-for="permission in permissions"
            :key="permission"
            class="flex items-center gap-3 rounded-lg border border-white/65 bg-white/40 p-3 cursor-pointer hover:bg-white/70"
          >
            <input
              type="checkbox"
              :checked="userPermissions.includes(permission)"
              @change="togglePermission(permission)"
              class="rounded border-white/65"
            />
            <span class="text-sm text-steel-700">{{ permission }}</span>
          </label>
          <button
            type="button"
            class="mt-4 w-full rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
            :disabled="loading"
            @click="savePermissions"
          >
            Berechtigungen speichern
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

