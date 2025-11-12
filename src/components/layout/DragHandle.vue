<script setup lang="ts">
import { PhDotsSixVertical } from '@phosphor-icons/vue';
import type { PanelId } from '@/composables/usePanelLayout';

const props = defineProps<{
  panelId: PanelId;
}>();

const emit = defineEmits<{
  (event: 'dragstart', panelId: PanelId): void;
  (event: 'dragend'): void;
}>();

const handleDragStart = (e: DragEvent) => {
  if (!e.dataTransfer) return;
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', props.panelId);
  
  emit('dragstart', props.panelId);
};

const handleDragEnd = () => {
  emit('dragend');
};
</script>

<template>
  <div
    class="drag-handle absolute right-2 top-2 z-30 flex cursor-grab items-center justify-center rounded-lg bg-white/60 p-1.5 text-steel-400 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 hover:text-steel-600 hover:shadow-md active:cursor-grabbing active:scale-95"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    title="Panel verschieben"
  >
    <PhDotsSixVertical :size="14" weight="regular" />
  </div>
</template>

