<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PhPlus, PhPencil, PhTrash, PhHouse } from '@phosphor-icons/vue';
import {
  getAdminRooms,
  createAdminRoom,
  updateAdminRoom,
  deleteAdminRoom,
  getRoomTypes,
  type AdminRoom,
  type RoomType
} from '@/services/api';

const rooms = ref<AdminRoom[]>([]);
const roomTypes = ref<RoomType[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const selectedRoom = ref<AdminRoom | null>(null);

const formData = ref({ name: '', description: '', roomTypeId: '' });

const loadData = async () => {
  loading.value = true;
  try {
    [rooms.value, roomTypes.value] = await Promise.all([getAdminRooms(), getRoomTypes()]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden';
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  formData.value = { name: '', description: '', roomTypeId: '' };
  showCreateModal.value = true;
};

const handleEdit = (room: AdminRoom) => {
  selectedRoom.value = room;
  formData.value = {
    name: room.name,
    description: room.description || '',
    roomTypeId: room.roomTypeId || ''
  };
  showEditModal.value = true;
};

const handleDelete = (room: AdminRoom) => {
  selectedRoom.value = room;
  showDeleteModal.value = true;
};

const submitCreate = async () => {
  if (!formData.value.name) {
    error.value = 'Bitte geben Sie einen Namen ein';
    return;
  }
  loading.value = true;
  try {
    await createAdminRoom({
      name: formData.value.name,
      description: formData.value.description || undefined,
      roomTypeId: formData.value.roomTypeId || undefined
    });
    showCreateModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler';
  } finally {
    loading.value = false;
  }
};

const submitEdit = async () => {
  if (!selectedRoom.value || !formData.value.name) return;
  loading.value = true;
  try {
    await updateAdminRoom(selectedRoom.value.id, {
      name: formData.value.name,
      description: formData.value.description || undefined,
      roomTypeId: formData.value.roomTypeId || null
    });
    showEditModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler';
  } finally {
    loading.value = false;
  }
};

const submitDelete = async () => {
  if (!selectedRoom.value) return;
  loading.value = true;
  try {
    await deleteAdminRoom(selectedRoom.value.id);
    showDeleteModal.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler';
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
        <h2 class="text-xl font-semibold text-steel-700">Raumverwaltung</h2>
        <p class="text-sm text-steel-500">Verwalten Sie Räume und deren Typen</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-xl bg-accent-sky px-4 py-2.5 text-sm font-semibold text-white"
        @click="handleCreate"
      >
        <PhPlus :size="18" />
        <span>Neuer Raum</span>
      </button>
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 p-4 text-sm text-red-600">{{ error }}</div>

    <div v-if="loading && rooms.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="skeleton-block h-16 w-full" />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="glass-card flex items-center justify-between rounded-xl border border-white/55 p-4"
      >
        <div class="flex items-center gap-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-sky/10">
            <PhHouse :size="20" class="text-accent-sky" />
          </div>
          <div>
            <div class="font-semibold text-steel-700">{{ room.name }}</div>
            <div v-if="room.description" class="text-sm text-steel-500">{{ room.description }}</div>
            <div v-if="room.roomType" class="text-xs text-steel-400">{{ room.roomType.name }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-white/65 bg-white/40 p-2 text-steel-600"
            @click="handleEdit(room)"
          >
            <PhPencil :size="18" />
          </button>
          <button
            type="button"
            class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600"
            @click="handleDelete(room)"
          >
            <PhTrash :size="18" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modals ähnlich wie oben -->
    <div
      v-if="showCreateModal || showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showCreateModal = false; showEditModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">{{ showCreateModal ? 'Neuer Raum' : 'Raum bearbeiten' }}</h3>
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
          <div>
            <label class="mb-2 block text-sm font-medium">Raumtyp</label>
            <select
              v-model="formData.roomTypeId"
              class="w-full rounded-xl border border-white/65 bg-white/40 px-4 py-2.5"
            >
              <option value="">Kein Typ</option>
              <option v-for="type in roomTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
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
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showDeleteModal = false"
    >
      <div class="glass-card w-full max-w-md rounded-3xl border border-white/55 p-6">
        <h3 class="mb-4 text-xl font-semibold">Raum löschen</h3>
        <p class="mb-6 text-sm">Möchten Sie den Raum <strong>{{ selectedRoom?.name }}</strong> wirklich löschen?</p>
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

