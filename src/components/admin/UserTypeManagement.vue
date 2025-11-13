<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PhPlus, PhPencil, PhTrash, PhUser } from '@phosphor-icons/vue';
import {
  getUserTypes,
  createUserType,
  updateUserType,
  deleteUserType,
  type UserType
} from '@/services/api';

const userTypes = ref<UserType[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedUserType = ref<UserType | null>(null);

const formData = ref({
  name: '',
  description: '',
  defaultPermissions: [] as string[]
});

const loadUserTypes = async () => {
  loading.value = true;
  error.value = null;
  try {
    userTypes.value = await getUserTypes();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Usertypen';
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  formData.value = { name: '', description: '', defaultPermissions: [] };
  showCreateModal.value = true;
};

const handleEdit = (userType: UserType) => {
  selectedUserType.value = userType;
  formData.value = {
    name: userType.name,
    description: userType.description || '',
    defaultPermissions: userType.defaultPermissions || []
  };
  showEditModal.value = true;
};

const handleDelete = (userType: UserType) => {
  selectedUserType.value = userType;
  showDeleteModal.value = true;
};

const submitCreate = async () => {
  if (!formData.value.name) {
    error.value = 'Bitte geben Sie einen Namen ein';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    await createUserType(formData.value);
    showCreateModal.value = false;
    await loadUserTypes();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Usertyps';
  } finally {
    loading.value = false;
  }
};

const submitEdit = async () => {
  if (!selectedUserType.value || !formData.value.name) {
    error.value = 'Bitte geben Sie einen Namen ein';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    await updateUserType(selectedUserType.value.id, formData.value);
    showEditModal.value = false;
    selectedUserType.value = null;
    await loadUserTypes();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Usertyps';
  } finally {
    loading.value = false;
  }
};

const submitDelete = async () => {
  if (!selectedUserType.value) return;

  loading.value = true;
  error.value = null;
  try {
    await deleteUserType(selectedUserType.value.id);
    showDeleteModal.value = false;
    selectedUserType.value = null;
    await loadUserTypes();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen des Usertyps';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadUserTypes();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-steel-700">Usertypen</h2>
        <p class="text-sm text-steel-500">Verwalten Sie Benutzertypen und deren Standard-Berechtigungen</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-sky/90"
        @click="handleCreate"
      >
        <PhPlus :size="18" weight="regular" />
        <span>Neuer Usertyp</span>
      </button>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error }}</div>

    <div v-if="loading && userTypes.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton-block h-16 w-full" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="userType in userTypes"
        :key="userType.id"
        class="glass-card flex items-center justify-between rounded-xl border border-white/55 p-4"
      >
        <div class="flex items-center gap-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-sky/10">
            <PhUser :size="20" weight="regular" class="text-accent-sky" />
          </div>
          <div>
            <div class="font-semibold text-steel-700">{{ userType.name }}</div>
            <div v-if="userType.description" class="text-sm text-steel-500">{{ userType.description }}</div>
            <div v-if="userType.defaultPermissions && userType.defaultPermissions.length > 0" class="text-xs text-steel-400">
              {{ userType.defaultPermissions.length }} Standard-Berechtigungen
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/65 bg-white/40 p-2 text-steel-600 transition-all hover:bg-white/70"
            @click="handleEdit(userType)"
          >
            <PhPencil :size="18" weight="regular" />
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-all hover:bg-red-100"
            @click="handleDelete(userType)"
          >
            <PhTrash :size="18" weight="regular" />
          </button>
        </div>
      </div>

      <div v-if="userTypes.length === 0" class="py-12 text-center text-steel-500">
        <PhUser :size="48" weight="regular" class="mx-auto mb-4 opacity-50" />
        <p>Keine Usertypen gefunden</p>
      </div>
    </div>

    <!-- Modals ähnlich wie UserManagement -->
    <div
      v-if="showCreateModal || showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showCreateModal = false; showEditModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold text-steel-700">
          {{ showCreateModal ? 'Neuer Usertyp' : 'Usertyp bearbeiten' }}
        </h3>
        <form @submit.prevent="showCreateModal ? submitCreate() : submitEdit()" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              required
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium text-steel-600">Beschreibung</label>
            <textarea
              v-model="formData.description"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-steel-700 focus:border-accent-sky/60 focus:outline-none focus:ring-4 focus:ring-accent-sky/25"
              rows="3"
            />
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-xl border border-white/65 bg-white/40 px-4 py-2.5 text-sm font-semibold text-steel-600"
              @click="showCreateModal = false; showEditModal = false"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="flex-1 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
              :disabled="loading"
            >
              {{ showCreateModal ? 'Erstellen' : 'Speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="showDeleteModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold text-steel-700">Usertyp löschen</h3>
        <p class="mb-6 text-sm text-steel-600">
          Möchten Sie den Usertyp <strong>{{ selectedUserType?.name }}</strong> wirklich löschen?
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

