<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { PanelId } from '@/composables/usePanelLayout';

const props = defineProps<{
  leftPanelId: PanelId;
  rightPanelId: PanelId;
}>();

const emit = defineEmits<{
  (event: 'resize', deltaPercent: number): void;
}>();

const isResizing = ref(false);
const startX = ref(0);
const containerWidth = ref(0);

const getContainerWidth = (): number => {
  const container = document.querySelector('.relative.flex.min-h-0.flex-1.gap-6') as HTMLElement;
  return container ? container.offsetWidth : 0;
};

const handleStart = (clientX: number) => {
  isResizing.value = true;
  startX.value = clientX;
  containerWidth.value = getContainerWidth();
  
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.body.style.pointerEvents = 'none';
};

const handleMove = (clientX: number) => {
  if (!isResizing.value || containerWidth.value === 0) return;
  
  const deltaPixels = clientX - startX.value;
  // Convert pixel delta to percentage delta with damping factor (0.5 = weniger empfindlich)
  const deltaPercent = (deltaPixels / containerWidth.value) * 100 * 0.5;
  
  emit('resize', deltaPercent);
};

const handleEnd = () => {
  if (!isResizing.value) return;
  
  isResizing.value = false;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.body.style.pointerEvents = '';
};

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  handleStart(e.clientX);
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Re-enable pointer events on the resize handle
  const handle = e.currentTarget as HTMLElement;
  if (handle) {
    handle.style.pointerEvents = 'auto';
  }
};

const handleMouseMove = (e: MouseEvent) => {
  handleMove(e.clientX);
};

const handleMouseUp = () => {
  handleEnd();
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};

const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.touches.length === 1) {
    handleStart(e.touches[0].clientX);
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }
};

const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    handleMove(e.touches[0].clientX);
  }
};

const handleTouchEnd = () => {
  handleEnd();
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
};

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  document.body.style.pointerEvents = '';
});
</script>

<template>
  <div
    class="resize-handle group flex items-center justify-center cursor-col-resize transition-all touch-none"
    :class="{
      'opacity-100': isResizing,
      'opacity-70 hover:opacity-100': !isResizing
    }"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
    title="Breite anpassen"
  >
    <!-- Symbol: Vertikaler Balken mit zwei Dreiecken -->
    <svg
      width="24"
      height="48"
      viewBox="0 0 24 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="text-steel-500 group-hover:text-steel-700 transition-colors"
    >
      <!-- Linkes Dreieck -->
      <path
        d="M6 24 L2 20 L2 28 Z"
        fill="currentColor"
      />
      <!-- Vertikaler Balken -->
      <rect
        x="11"
        y="12"
        width="2"
        height="24"
        rx="1"
        fill="currentColor"
      />
      <!-- Rechtes Dreieck -->
      <path
        d="M18 24 L22 20 L22 28 Z"
        fill="currentColor"
      />
    </svg>
  </div>
</template>

<style scoped>
.resize-handle {
  width: 24px;
  flex-shrink: 0;
  min-height: 100%;
}
</style>

