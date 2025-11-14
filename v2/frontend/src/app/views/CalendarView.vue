<template>
  <div class="calendar-view">
    <div class="header">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="icon-wrapper">
            <PhCalendar :size="24" weight="regular" />
          </div>
          <div>
            <h1 class="title">Kalender</h1>
            <p class="subtitle">Termine und Kontakte verwalten</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="previousPeriod" class="btn-icon">
            <PhCaretLeft :size="20" weight="regular" />
          </button>
          <button @click="today" class="btn-text">{{ formatDate(currentDate) }}</button>
          <button @click="nextPeriod" class="btn-icon">
            <PhCaretRight :size="20" weight="regular" />
          </button>
        </div>
      </div>
    </div>

    <!-- View Selector -->
    <div class="view-selector">
      <button
        v-for="view in views"
        :key="view.id"
        :class="['view-button', { active: currentView === view.id }]"
        @click="currentView = view.id"
      >
        {{ view.label }}
      </button>
    </div>

    <!-- Calendar Content -->
    <div class="calendar-content">
      <div v-if="isLoading" class="text-center py-8 text-steel-500">Lädt...</div>
      <div v-else-if="isError" class="text-center py-8 text-red-600">{{ error?.message }}</div>
      <div v-else class="calendar-grid">
        <!-- Month View -->
        <div v-if="currentView === 'month'" class="month-view">
          <div class="weekdays">
            <div v-for="day in weekDays" :key="day" class="weekday">
              {{ formatWeekday(day) }}
            </div>
          </div>
          <div class="days-grid">
            <div
              v-for="day in monthDays"
              :key="day.toISOString()"
              :class="['day-cell', { 'other-month': !isSameMonth(day, currentDate) }]"
            >
              <div class="day-number">{{ formatDay(day) }}</div>
              <div class="day-events">
                <div
                  v-for="event in getEventsForDay(day)"
                  :key="event.id"
                  class="event-item"
                  :style="{ backgroundColor: event.calendar.color || '#3b82f6' }"
                >
                  {{ event.title }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week View -->
        <div v-else-if="currentView === 'week'" class="week-view">
          <div class="week-header">
            <div class="time-column"></div>
            <div
              v-for="day in weekDays"
              :key="day.toISOString()"
              :class="['day-column', { today: isToday(day) }]"
            >
              <div class="day-header">
                <div class="day-name">{{ formatWeekday(day) }}</div>
                <div class="day-date">{{ formatDay(day) }}</div>
              </div>
            </div>
          </div>
          <div class="week-body">
            <div class="time-column">
              <div v-for="hour in hours" :key="hour" class="hour-cell">
                {{ formatHour(hour) }}
              </div>
            </div>
            <div
              v-for="day in weekDays"
              :key="day.toISOString()"
              class="day-column"
            >
              <div
                v-for="hour in hours"
                :key="hour"
                class="hour-cell"
                @click="createEventAt(day, hour)"
              >
                <div
                  v-for="event in getEventsForDayHour(day, hour)"
                  :key="event.id"
                  class="event-block"
                  :style="{ backgroundColor: event.calendar.color || '#3b82f6' }"
                >
                  {{ event.title }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Day View -->
        <div v-else class="day-view">
          <div class="day-header-large">
            <div class="day-name-large">{{ formatDateLong(currentDate) }}</div>
          </div>
          <div class="day-body">
            <div class="time-column">
              <div v-for="hour in hours" :key="hour" class="hour-cell">
                {{ formatHour(hour) }}
              </div>
            </div>
            <div class="day-column">
              <div
                v-for="hour in hours"
                :key="hour"
                class="hour-cell"
                @click="createEventAt(currentDate, hour)"
              >
                <div
                  v-for="event in getEventsForDayHour(currentDate, hour)"
                  :key="event.id"
                  class="event-block"
                  :style="{ backgroundColor: event.calendar.color || '#3b82f6' }"
                >
                  {{ event.title }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Event Button -->
    <button @click="showCreateModal = true" class="fab">
      <PhPlus :size="24" weight="regular" />
    </button>

    <!-- Event Modal (TODO: Implementieren) -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  PhCalendar,
  PhPlus,
  PhCaretLeft,
  PhCaretRight
} from '@phosphor-icons/vue';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  startOfDay,
  setHours,
  setMinutes,
  parseISO
} from 'date-fns';
import { de } from 'date-fns/locale';
import { calendarApi } from '@/services/api';

const currentView = ref<'month' | 'week' | 'day'>('month');
const currentDate = ref(new Date());
const showCreateModal = ref(false);

const views = [
  { id: 'month' as const, label: 'Monat' },
  { id: 'week' as const, label: 'Woche' },
  { id: 'day' as const, label: 'Tag' }
];

const monthStart = computed(() => startOfMonth(currentDate.value));
const monthEnd = computed(() => endOfMonth(currentDate.value));
const weekStart = computed(() => startOfWeek(currentDate.value, { weekStartsOn: 1 }));
const weekEnd = computed(() => endOfWeek(currentDate.value, { weekStartsOn: 1 }));

const monthDays = computed(() => {
  const start = startOfWeek(monthStart.value, { weekStartsOn: 1 });
  const end = endOfWeek(monthEnd.value, { weekStartsOn: 1 });
  const days: Date[] = [];
  let current = start;
  while (current <= end) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
});

const weekDays = computed(() => {
  const days: Date[] = [];
  let current = weekStart.value;
  for (let i = 0; i < 7; i++) {
    days.push(new Date(current));
    current = addDays(current, 1);
  }
  return days;
});

const hours = computed(() => {
  const h: number[] = [];
  for (let i = 0; i < 24; i++) {
    h.push(i);
  }
  return h;
});

const { data: events = [], isLoading, isError, error } = useQuery({
  queryKey: ['calendar-events', currentView, currentDate],
  queryFn: () => {
    let start: Date, end: Date;
    if (currentView.value === 'month') {
      start = monthStart.value;
      end = monthEnd.value;
    } else if (currentView.value === 'week') {
      start = weekStart.value;
      end = weekEnd.value;
    } else {
      start = startOfDay(currentDate.value);
      end = addDays(start, 1);
    }
    return calendarApi.getEvents({
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  }
});

function previousPeriod() {
  if (currentView.value === 'month') {
    currentDate.value = subMonths(currentDate.value, 1);
  } else if (currentView.value === 'week') {
    currentDate.value = subWeeks(currentDate.value, 1);
  } else {
    currentDate.value = addDays(currentDate.value, -1);
  }
}

function nextPeriod() {
  if (currentView.value === 'month') {
    currentDate.value = addMonths(currentDate.value, 1);
  } else if (currentView.value === 'week') {
    currentDate.value = addWeeks(currentDate.value, 1);
  } else {
    currentDate.value = addDays(currentDate.value, 1);
  }
}

function today() {
  currentDate.value = new Date();
}

function formatDate(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: de });
}

function formatDateLong(date: Date): string {
  return format(date, 'EEEE, d. MMMM yyyy', { locale: de });
}

function formatWeekday(date: Date): string {
  return format(date, 'EEE', { locale: de });
}

function formatDay(date: Date): string {
  return format(date, 'd');
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function getEventsForDay(day: Date): any[] {
  return events.value.filter(event => {
    const eventStart = parseISO(event.startTime);
    return isSameDay(eventStart, day);
  });
}

function getEventsForDayHour(day: Date, hour: number): any[] {
  const dayStart = setHours(startOfDay(day), hour);
  const dayEnd = setHours(startOfDay(day), hour + 1);
  
  return events.value.filter(event => {
    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);
    return eventStart < dayEnd && eventEnd > dayStart;
  });
}

function createEventAt(day: Date, hour: number) {
  // TODO: Implementieren
  console.log('Create event at', day, hour);
}
</script>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
}

.header {
  @apply glass-card p-6;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: rgba(26, 127, 216, 0.12);
  color: var(--color-primary, #1a7fd8);
  backdrop-filter: blur(8px);
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7d8f);
}

.btn-icon,
.btn-text {
  @apply glass-card px-4 py-2 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
}

.btn-icon {
  padding: 0.5rem;
}

.btn-icon:hover,
.btn-text:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.view-selector {
  display: flex;
  gap: 0.5rem;
  padding: 0;
}

.view-button {
  @apply glass-card px-6 py-3 border border-white/40 bg-white/30 backdrop-blur-xl;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7d8f);
  transition: all 0.2s;
}

.view-button:hover {
  @apply bg-white/50 border-white/60;
  color: var(--color-text, #0c1f2f);
  transform: translateY(-1px);
}

.view-button.active {
  @apply bg-white/70 border-white/80;
  color: var(--color-primary, #1a7fd8);
  box-shadow: 0 4px 16px rgba(26, 127, 216, 0.2);
}

.calendar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.calendar-grid {
  @apply glass-card overflow-hidden;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}

.weekday {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7d8f);
  text-transform: uppercase;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(255, 255, 255, 0.2);
}

.day-cell {
  min-height: 120px;
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s;
}

.day-cell:hover {
  background: rgba(255, 255, 255, 0.2);
}

.day-cell.other-month {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text-secondary, #8fa3b8);
}

.day-number {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text, #0c1f2f);
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.event-item {
  padding: 0.375rem 0.625rem;
  border-radius: 8px;
  font-size: 0.75rem;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.event-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.week-header,
.week-body {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
}

.time-column {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  border-right: 1px solid rgba(255, 255, 255, 0.4);
}

.day-column {
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.day-column.today {
  background: rgba(26, 127, 216, 0.1);
  backdrop-filter: blur(8px);
}

.day-header {
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}

.day-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7d8f);
  text-transform: uppercase;
}

.day-date {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
  margin-top: 0.25rem;
}

.hour-cell {
  min-height: 60px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.hour-cell:hover {
  background: rgba(26, 127, 216, 0.08);
  backdrop-filter: blur(4px);
}

.event-block {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  color: white;
  cursor: pointer;
  z-index: 1;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
}

.event-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.day-header-large {
  padding: 1.5rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}

.day-name-large {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text, #0c1f2f);
}

.day-body {
  display: grid;
  grid-template-columns: 80px 1fr;
}

.fab {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a7fd8 0%, #18b4a6 100%);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(26, 127, 216, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.fab:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 12px 32px rgba(26, 127, 216, 0.4);
}
</style>


