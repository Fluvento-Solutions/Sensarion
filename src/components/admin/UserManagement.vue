<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PhPlus, PhPencil, PhTrash, PhShield, PhShieldCheck } from '@phosphor-icons/vue';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser
} from '@/services/api';

const users = ref<AdminUser[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedUser = ref<AdminUser | null>(null);

const formData = ref({
  email: '',
  password: '',
  displayName: '',
  shortName: '',
  isPracticeAdmin: false
});

const loadUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    users.value = await getAdminUsers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Benutzer';
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  formData.value = {
    email: '',
    password: '',
    displayName: '',
    shortName: '',
    isPracticeAdmin: false
  };
  showCreateModal.value = true;
};

const handleEdit = (user: AdminUser) => {
  selectedUser.value = user;
  formData.value = {
    email: user.email,
    password: '',
    displayName: user.displayName,
    shortName: user.shortName,
    isPracticeAdmin: user.isPracticeAdmin
  };
  showEditModal.value = true;
};

const handleDelete = (user: AdminUser) => {
  selectedUser.value = user;
  showDeleteModal.value = true;
};

const submitCreate = async () => {
  if (!formData.value.email || !formData.value.password || !formData.value.displayName || !formData.value.shortName) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder aus';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    await createAdminUser(formData.value);
    showCreateModal.value = false;
    await loadUsers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Benutzers';
  } finally {
    loading.value = false;
  }
};

const submitEdit = async () => {
  if (!selectedUser.value || !formData.value.email || !formData.value.displayName || !formData.value.shortName) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder aus';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const updateData: any = {
      email: formData.value.email,
      displayName: formData.value.displayName,
      shortName: formData.value.shortName,
      isPracticeAdmin: formData.value.isPracticeAdmin
    };
    if (formData.value.password) {
      updateData.password = formData.value.password;
    }
    await updateAdminUser(selectedUser.value.id, updateData);
    showEditModal.value = false;
    selectedUser.value = null;
    await loadUsers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Benutzers';
  } finally {
    loading.value = false;
  }
};

const submitDelete = async () => {
  if (!selectedUser.value) return;

  loading.value = true;
  error.value = null;
  try {
    await deleteAdminUser(selectedUser.value.id);
    showDeleteModal.value = false;
    selectedUser.value = null;
    await loadUsers();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen des Benutzers';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-steel-700">Benutzerverwaltung</h2>
        <p class="text-sm text-steel-500">Verwalten Sie Benutzer und deren Berechtigungen</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-sky/90"
        @click="handleCreate"
      >
        <PhPlus :size="18" weight="regular" />
        <span>Neuer Benutzer</span>
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading && users.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton-block h-16 w-full" />
    </div>

    <!-- Users List -->
    <div v-else class="space-y-2">
      <div
        v-for="user in users"
        :key="user.id"
        class="glass-card flex items-center justify-between rounded-xl border border-white/55 p-4"
      >
        <div class="flex items-center gap-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-sky/10">
            <PhShield :size="20" weight="regular" class="text-accent-sky" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-steel-700">{{ user.displayName }}</span>
              <span v-if="user.isPracticeAdmin" class="rounded-full bg-accent-sky/10 px-2 py-0.5 text-xs font-semibold text-accent-sky">
                Admin
              </span>
            </div>
            <div class="text-sm text-steel-500">{{ user.email }}</div>
            <div class="text-xs text-steel-400">{{ user.shortName }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/65 bg-white/40 p-2 text-steel-600 transition-all hover:bg-white/70"
            @click="handleEdit(user)"
          >
            <PhPencil :size="18" weight="regular" />
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-all hover:bg-red-100"
            @click="handleDelete(user)"
          >
            <PhTrash :size="18" weight="regular" />
          </button>
        </div>
      </div>

      <div v-if="users.length === 0" class="py-12 text-center text-steel-500">
        <PhShield :size="48" weight="regular" class="mx-auto mb-4 opacity-50" />
        <p>Keine Benutzer gefunden</p>
      </div>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showCreateModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold text-steel-700">Neuer Benutzer</h3>
        <form @submit.prevent="submitCreate" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">E-Mail *</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Passwort *</label>
            <input
              v-model="formData.password"
              type="password"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Anzeigename *</label>
            <input
              v-model="formData.displayName"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Kurzname *</label>
            <input
              v-model="formData.shortName"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="formData.isPracticeAdmin"
              type="checkbox"
              id="isAdmin"
              class="rounded border-white/65"
            />
            <label for="isAdmin" class="text-sm text-steel-600">Praxis-Administrator</label>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-sm font-semibold text-steel-600"
              @click="showCreateModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
              :disabled="loading"
            >
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showEditModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold text-steel-700">Benutzer bearbeiten</h3>
        <form @submit.prevent="submitEdit" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">E-Mail *</label>
            <input
              v-model="formData.email"
              type="email"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Neues Passwort (leer lassen, um nicht zu ändern)</label>
            <input
              v-model="formData.password"
              type="password"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Anzeigename *</label>
            <input
              v-model="formData.displayName"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Kurzname *</label>
            <input
              v-model="formData.shortName"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="formData.isPracticeAdmin"
              type="checkbox"
              id="isAdminEdit"
              class="rounded border-white/65"
            />
            <label for="isAdminEdit" class="text-sm text-steel-600">Praxis-Administrator</label>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-sm font-semibold text-steel-600"
              @click="showEditModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
              :disabled="loading"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showDeleteModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold text-steel-700">Benutzer löschen</h3>
        <p class="mb-6 text-sm text-steel-600">
          Möchten Sie den Benutzer <strong>{{ selectedUser?.displayName }}</strong> wirklich löschen?
          Diese Aktion kann nicht rückgängig gemacht werden.
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-sm font-semibold text-steel-600"
            @click="showDeleteModal = false"
          >
            Abbrechen
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white"
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

