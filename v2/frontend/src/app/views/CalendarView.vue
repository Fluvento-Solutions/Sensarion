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
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #334155;
}

.subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.btn-icon {
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.7);
  color: #334155;
}

.btn-text {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #334155;
  transition: all 0.2s;
}

.btn-text:hover {
  background: rgba(255, 255, 255, 0.7);
}

.view-selector {
  display: flex;
  gap: 0.5rem;
  padding: 0 1.5rem;
}

.view-button {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #64748b;
  transition: all 0.2s;
}

.view-button:hover {
  background: rgba(255, 255, 255, 0.7);
}

.view-button.active {
  background: white;
  border-color: #3b82f6;
  color: #3b82f6;
  box-shadow: 0 4px 12px rgba(13, 86, 132, 0.15);
}

.calendar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem 1.5rem;
}

.calendar-grid {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.weekday {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: #64748b;
  text-transform: uppercase;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day-cell {
  min-height: 120px;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem;
}

.day-cell.other-month {
  background: #f8fafc;
  color: #94a3b8;
}

.day-number {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #334155;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.event-item {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: white;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.week-header,
.week-body {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
}

.time-column {
  background: #f8fafc;
  border-right: 2px solid #e2e8f0;
}

.day-column {
  border-right: 1px solid #e2e8f0;
}

.day-column.today {
  background: rgba(59, 130, 246, 0.05);
}

.day-header {
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
}

.day-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #64748b;
  text-transform: uppercase;
}

.day-date {
  font-size: 1.25rem;
  font-weight: 600;
  color: #334155;
  margin-top: 0.25rem;
}

.hour-cell {
  min-height: 60px;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem;
  position: relative;
  cursor: pointer;
}

.hour-cell:hover {
  background: rgba(59, 130, 246, 0.05);
}

.event-block {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  color: white;
  cursor: pointer;
  z-index: 1;
}

.day-header-large {
  padding: 1.5rem;
  text-align: center;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.day-name-large {
  font-size: 1.5rem;
  font-weight: 600;
  color: #334155;
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
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 100;
}

.fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
}
</style>


