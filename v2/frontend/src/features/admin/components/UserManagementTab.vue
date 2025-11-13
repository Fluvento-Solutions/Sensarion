<template>
  <div class="user-management">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h2 class="text-xl font-semibold text-steel-700">Benutzerverwaltung</h2>
        <p class="text-sm text-steel-500">Verwalten Sie Benutzer und deren Berechtigungen</p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">
        <PhPlus :size="16" weight="regular" />
        <span>Neuer Benutzer</span>
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else-if="users.length === 0" class="text-center py-8 text-steel-500">
      Keine Benutzer vorhanden
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="user in users"
        :key="user.id"
        class="glass-card p-4"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <div class="font-semibold text-steel-700">{{ user.displayName }}</div>
              <span
                v-if="user.roles.includes('admin')"
                class="rounded-full border border-accent-sky/40 bg-accent-sky/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent-sky"
              >
                Admin
              </span>
            </div>
            <div class="text-sm text-steel-600">{{ user.email }}</div>
            <div class="text-xs text-steel-500 mt-1">
              Kurzname: {{ user.shortName || '–' }}
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="editUser(user)" class="btn-icon">
              <PhPencil :size="16" weight="regular" />
            </button>
            <button @click="deleteUser(user)" class="btn-icon text-red-600">
              <PhTrash :size="16" weight="regular" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal (TODO: Implementieren) -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { PhPlus, PhPencil, PhTrash } from '@phosphor-icons/vue';
import { adminApi } from '@/services/api';

const queryClient = useQueryClient();
const showCreateModal = ref(false);

const { data: users = [], isLoading, isError, error } = useQuery({
  queryKey: ['admin-users'],
  queryFn: () => adminApi.getUsers()
});

function editUser(user: any) {
  // TODO: Implementieren
  console.log('Edit user', user);
}

function deleteUser(user: any) {
  if (!confirm(`Möchten Sie den Benutzer "${user.displayName}" wirklich löschen?`)) return;
  // TODO: Implementieren
  console.log('Delete user', user);
}
</script>

<style scoped>
.user-management {
  display: flex;
  flex-direction: column;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-icon {
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}
</style>

