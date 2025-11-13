<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PhPlus, PhPencil, PhTrash, PhUsersThree } from '@phosphor-icons/vue';
import {
  getAdminTeams,
  createAdminTeam,
  updateAdminTeam,
  deleteAdminTeam,
  getAdminUsers,
  addTeamMember,
  removeTeamMember,
  type AdminTeam,
  type AdminUser
} from '@/services/api';

const teams = ref<AdminTeam[]>([]);
const users = ref<AdminUser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showAddMemberModal = ref(false);
const selectedTeam = ref<AdminTeam | null>(null);

const formData = ref({ name: '', description: '' });
const memberFormData = ref({ userId: '', role: 'PHYSICIAN' as const });

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    [teams.value, users.value] = await Promise.all([getAdminTeams(), getAdminUsers()]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  formData.value = { name: '', description: '' };
  showCreateModal.value = true;
};

const handleEdit = (team: AdminTeam) => {
  selectedTeam.value = team;
  formData.value = { name: team.name, description: team.description || '' };
  showEditModal.value = true;
};

const handleDelete = (team: AdminTeam) => {
  selectedTeam.value = team;
  showDeleteModal.value = true;
};

const handleAddMember = (team: AdminTeam) => {
  selectedTeam.value = team;
  memberFormData.value = { userId: '', role: 'PHYSICIAN' };
  showAddMemberModal.value = true;
};

const submitCreate = async () => {
  if (!formData.value.name) {
    error.value = 'Bitte geben Sie einen Namen ein';
    return;
  }
  loading.value = true;
  try {
    await createAdminTeam(formData.value);
    showCreateModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen';
  } finally {
    loading.value = false;
  }
};

const submitEdit = async () => {
  if (!selectedTeam.value || !formData.value.name) return;
  loading.value = true;
  try {
    await updateAdminTeam(selectedTeam.value.id, formData.value);
    showEditModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren';
  } finally {
    loading.value = false;
  }
};

const submitDelete = async () => {
  if (!selectedTeam.value) return;
  loading.value = true;
  try {
    await deleteAdminTeam(selectedTeam.value.id);
    showDeleteModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen';
  } finally {
    loading.value = false;
  }
};

const submitAddMember = async () => {
  if (!selectedTeam.value || !memberFormData.value.userId) return;
  loading.value = true;
  try {
    await addTeamMember(selectedTeam.value.id, memberFormData.value);
    showAddMemberModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Hinzufügen';
  } finally {
    loading.value = false;
  }
};

const handleRemoveMember = async (teamId: string, userId: string) => {
  if (!confirm('Mitglied wirklich entfernen?')) return;
  loading.value = true;
  try {
    await removeTeamMember(teamId, userId);
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Entfernen';
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
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-steel-700">Teamverwaltung</h2>
        <p class="text-sm text-steel-500">Verwalten Sie Teams und deren Mitglieder</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
        @click="handleCreate"
      >
        <PhPlus :size="18" />
        <span>Neues Team</span>
      </button>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error }}</div>

    <div v-if="loading && teams.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton-block h-16 w-full" />
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="team in teams"
        :key="team.id"
        class="glass-card rounded-xl border border-white/55 p-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-sky/10">
              <PhUsersThree :size="20" class="text-accent-sky" />
            </div>
            <div>
              <div class="font-semibold text-steel-700">{{ team.name }}</div>
              <div v-if="team.description" class="text-sm text-steel-500">{{ team.description }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-white/65 bg-white/40 p-2 text-steel-600"
              @click="handleAddMember(team)"
            >
              <PhPlus :size="18" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/65 bg-white/40 p-2 text-steel-600"
              @click="handleEdit(team)"
            >
              <PhPencil :size="18" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"
              @click="handleDelete(team)"
            >
              <PhTrash :size="18" />
            </button>
          </div>
        </div>
        <div v-if="team.members.length > 0" class="mt-3 space-y-2">
          <div
            v-for="member in team.members"
            :key="member.id"
            class="flex items-center justify-between rounded-lg bg-white/40 p-2"
          >
            <div>
              <div class="text-sm font-medium text-steel-700">{{ member.user.displayName }}</div>
              <div class="text-xs text-steel-500">{{ member.role }}</div>
            </div>
            <button
              type="button"
              class="text-red-600 hover:text-red-700"
              @click="handleRemoveMember(team.id, member.userId)"
            >
              <PhTrash :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals (vereinfacht) -->
    <div
      v-if="showCreateModal || showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCreateModal = false; showEditModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">{{ showCreateModal ? 'Neues Team' : 'Team bearbeiten' }}</h3>
        <form @submit.prevent="showCreateModal ? submitCreate() : submitEdit()" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Beschreibung</label>
            <textarea
              v-model="formData.description"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              rows="3"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              @click="showCreateModal = false; showEditModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-white"
              :disabled="loading"
            >
              {{ showCreateModal ? 'Erstellen' : 'Speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showAddMemberModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showAddMemberModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">Mitglied hinzufügen</h3>
        <form @submit.prevent="submitAddMember" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium">Benutzer *</label>
            <select
              v-model="memberFormData.userId"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              required
            >
              <option value="">Bitte wählen</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.displayName }} ({{ user.email }})
              </option>
            </select>
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Rolle *</label>
            <select
              v-model="memberFormData.role"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              required
            >
              <option value="PHYSICIAN">Arzt</option>
              <option value="MFA">MFA</option>
              <option value="ADMINISTRATION">Verwaltung</option>
              <option value="PRACTICE_ADMIN">Praxis-Admin</option>
              <option value="CUSTOM">Benutzerdefiniert</option>
            </select>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
              @click="showAddMemberModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-white"
              :disabled="loading"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showDeleteModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">Team löschen</h3>
        <p class="mb-6 text-sm">Möchten Sie das Team <strong>{{ selectedTeam?.name }}</strong> wirklich löschen?</p>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
            @click="showDeleteModal = false"
          >
            Abbrechen
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-white"
            :disabled="loading"
            @click="submitDelete"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

