<template>
  <div class="history-tab">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-steel-700">Verlauf</h3>
      <div class="flex gap-2">
        <button @click="showNoteModal = true" class="btn-primary">
          <PhPlus :size="16" weight="regular" />
          <span>Notiz</span>
        </button>
        <button @click="showEncounterModal = true" class="btn-primary">
          <PhPlus :size="16" weight="regular" />
          <span>Kontakt</span>
        </button>
        <select v-model="filterType" class="select-input">
          <option value="all">Alle</option>
          <option value="note">Notizen</option>
          <option value="encounter">Kontakte</option>
          <option value="audit">Audit-Logs</option>
        </select>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Suchen..."
          class="input-search"
        />
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
    <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
    <div v-else class="space-y-3">
      <div
        v-for="item in filteredHistory"
        :key="item.id"
        class="glass-card p-4"
      >
        <div class="flex gap-3">
          <div class="flex-shrink-0">
            <component :is="item.icon" :size="20" :class="item.color" />
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-start mb-1">
              <div class="font-semibold text-steel-700">{{ item.title }}</div>
              <div class="text-xs text-steel-500">{{ formatDateTime(item.timestamp) }}</div>
            </div>
            <div class="text-sm text-steel-600">{{ item.content }}</div>
            <div v-if="item.author" class="text-xs text-steel-500 mt-1">
              von {{ item.author }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredHistory.length === 0" class="text-center py-8 text-steel-500">
        Keine Einträge gefunden
      </div>
    </div>

    <!-- Note Modal -->
    <NoteModal
      :open="showNoteModal"
      :patient-id="patientId"
      @close="showNoteModal = false"
      @success="handleModalSuccess"
    />

    <!-- Encounter Modal -->
    <EncounterModal
      :open="showEncounterModal"
      :patient-id="patientId"
      @close="showEncounterModal = false"
      @success="handleModalSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { PhFileText, PhCalendar, PhCheckCircle, PhPencilSimple, PhTrashSimple, PhPlus, PhXCircle } from '@phosphor-icons/vue';
import { patientApi } from '@/services/api';
import NoteModal from './NoteModal.vue';
import EncounterModal from './EncounterModal.vue';

const props = defineProps<{
  patientId: string;
}>();

const queryClient = useQueryClient();
const showNoteModal = ref(false);
const showEncounterModal = ref(false);
const filterType = ref<'all' | 'note' | 'encounter' | 'audit'>('all');
const searchQuery = ref('');

const { data: notes = [], isLoading: notesLoading } = useQuery({
  queryKey: ['patient-notes', props.patientId],
  queryFn: () => patientApi.getNotes(props.patientId)
});

const { data: encounters = [], isLoading: encountersLoading } = useQuery({
  queryKey: ['patient-encounters', props.patientId],
  queryFn: () => patientApi.getEncounters(props.patientId)
});

const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
  queryKey: ['patient-audit-logs', props.patientId],
  queryFn: () => patientApi.getAuditLogs(props.patientId)
});

const isLoading = computed(() => notesLoading.value || encountersLoading.value || auditLoading.value);
const isError = computed(() => false); // TODO: Error handling
const error = computed(() => null);

type HistoryItem = {
  id: string;
  type: 'note' | 'encounter' | 'audit';
  timestamp: string;
  title: string;
  content: string;
  author?: string;
  icon: any;
  color: string;
};

const historyItems = computed((): HistoryItem[] => {
  const items: HistoryItem[] = [];

  // Notes
  notes.value.forEach((note: any) => {
    items.push({
      id: note.id,
      type: 'note',
      timestamp: note.createdAt,
      title: 'Notiz',
      content: note.text,
      author: note.authorId, // TODO: Get author name
      icon: PhFileText,
      color: 'text-steel-600'
    });
  });

  // Encounters
  encounters.value.forEach((encounter: any) => {
    items.push({
      id: encounter.id,
      type: 'encounter',
      timestamp: encounter.date,
      title: encounter.reason || 'Kontakt',
      content: encounter.summary || encounter.location || '',
      icon: PhCalendar,
      color: 'text-steel-600'
    });
  });

  // Audit Logs
  auditLogs.value.forEach((log: any) => {
    const actionLabels: Record<string, string> = {
      create: 'Erstellt',
      update: 'Geändert',
      delete: 'Gelöscht',
      add: 'Hinzugefügt',
      remove: 'Entfernt'
    };

    const entityLabels: Record<string, string> = {
      patient: 'Patient',
      vital: 'Vitalwerte',
      allergy: 'Allergie',
      medication: 'Medikation',
      note: 'Notiz',
      encounter: 'Kontakt'
    };

    const iconMap: Record<string, any> = {
      create: PhCheckCircle,
      update: PhPencilSimple,
      delete: PhTrashSimple,
      add: PhPlus,
      remove: PhXCircle
    };

    items.push({
      id: log.id,
      type: 'audit',
      timestamp: log.timestamp,
      title: `${actionLabels[log.action] || log.action} - ${entityLabels[log.entityType] || log.entityType}`,
      content: log.description || '',
      author: log.userId, // TODO: Get user name
      icon: iconMap[log.action] || PhFileText,
      color: log.action === 'delete' || log.action === 'remove' ? 'text-red-600' : log.action === 'create' || log.action === 'add' ? 'text-green-600' : 'text-steel-600'
    });
  });

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});

const filteredHistory = computed(() => {
  let filtered = [...historyItems.value];

  if (filterType.value !== 'all') {
    filtered = filtered.filter(item => item.type === filterType.value);
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.author?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function handleModalSuccess() {
  // Cache wird bereits invalidiert
}
</script>

<style scoped>
.history-tab {
  display: flex;
  flex-direction: column;
}

.btn-primary {
  @apply glass-card px-4 py-2 border border-white/40 bg-white/30 backdrop-blur-xl;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
  background: linear-gradient(135deg, #1a7fd8 0%, #18b4a6 100%);
  border: 2px solid rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.3);
}

.select-input,
.input-search {
  @apply glass-card px-4 py-2 border border-white/40 bg-white/30 backdrop-blur-xl;
  font-size: 0.875rem;
  color: var(--color-text, #0c1f2f);
  transition: all 0.2s;
}

.select-input:focus,
.input-search:focus {
  @apply bg-white/50 border-white/60;
  outline: none;
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.input-search {
  min-width: 200px;
}

.input-search::placeholder {
  color: var(--color-text-secondary, #6b7d8f);
}
</style>

