<script setup lang="ts">
import { PhCaretLeft, PhCaretRight, PhMinus } from '@phosphor-icons/vue';
import type { PanelId } from '@/composables/usePanelLayout';

const props = defineProps<{
  panelId: PanelId;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}>();

const emit = defineEmits<{
  (event: 'move-left'): void;
  (event: 'minimize'): void;
  (event: 'move-right'): void;
}>();

const handleMoveLeft = () => {
  emit('move-left');
};

const handleMinimize = () => {
  emit('minimize');
};

const handleMoveRight = () => {
  emit('move-right');
};
</script>

<template>
  <div class="panel-controls flex w-full items-center justify-between border-b border-white/30 px-4 py-2">
    <button
      v-if="canMoveLeft"
      type="button"
      class="flex cursor-pointer items-center justify-center text-steel-400 transition-all hover:text-steel-600 active:scale-95"
      title="Nach links verschieben"
      @click="handleMoveLeft"
    >
      <PhCaretLeft :size="16" weight="regular" />
    </button>
    <div v-else class="w-4" />

    <button
      type="button"
      class="flex cursor-pointer items-center justify-center text-steel-400 transition-all hover:text-steel-600 active:scale-95"
      title="Minimieren"
      @click="handleMinimize"
    >
      <PhMinus :size="16" weight="regular" />
    </button>

    <button
      v-if="canMoveRight"
      type="button"
      class="flex cursor-pointer items-center justify-center text-steel-400 transition-all hover:text-steel-600 active:scale-95"
      title="Nach rechts verschieben"
      @click="handleMoveRight"
    >
      <PhCaretRight :size="16" weight="regular" />
    </button>
    <div v-else class="w-4" />
  </div>
</template>

