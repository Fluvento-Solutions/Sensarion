<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  PhCalendar,
  PhPlus,
  PhX,
  PhPencil,
  PhTrash,
  PhCaretLeft,
  PhCaretRight,
  PhCalendarBlank,
  PhClock,
  PhMapPin,
  PhUsers,
  PhUser,
  PhWarning,
  PhCheckCircle,
  PhArrowClockwise
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
  isSameMonth,
  isSameDay,
  startOfDay,
  endOfDay,
  addWeeks,
  subWeeks,
  subDays,
  parseISO,
  isAfter,
  isBefore,
  setHours,
  setMinutes
} from 'date-fns';
import { de } from 'date-fns/locale';
import {
  getCalendars,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  checkEventConflicts,
  getPatients,
  getRooms,
  getCalendarUsers,
  addEventParticipant,
  removeEventParticipant,
  type Calendar,
  type CalendarEvent,
  type CalendarConflict,
  type Patient,
  type Room,
  type CalendarUser
} from '@/services/api';
import { useAuthStore } from '@/composables/useAuthStore';

const auth = useAuthStore();
const currentUser = computed(() => auth.state.user);

// State
const calendars = ref<Calendar[]>([]);
const events = ref<CalendarEvent[]>([]);
const patients = ref<Patient[]>([]);
const rooms = ref<Room[]>([]);
const users = ref<CalendarUser[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const tooltipEvent = ref<CalendarEvent | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

// View state
type ViewType = 'month' | 'week' | '3day' | 'day';
const currentView = ref<ViewType>('month');
const currentDate = ref(new Date());

// Calendar selection
const selectedCalendarIds = ref<string[]>([]);

// Event modal
const showEventModal = ref(false);
const showCalendarModal = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const editingCalendar = ref<Calendar | null>(null);
const eventForm = ref({
  calendarId: '',
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  location: '',
  patientId: '',
  participantIds: [] as string[],
  recurrenceType: '' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | '',
  recurrenceEndType: 'never' as 'never' | 'after' | 'date',
  recurrenceEndAfter: 10,
  recurrenceEndDate: ''
});
const calendarForm = ref({
  name: '',
  type: 'PERSONAL' as 'PERSONAL' | 'ROOM' | 'PURPOSE',
  roomId: '',
  purpose: '',
  color: '#3b82f6'
});

// Conflicts
const conflicts = ref<CalendarConflict[]>([]);
const showConflictWarning = ref(false);

// Computed
const monthStart = computed(() => startOfMonth(currentDate.value));
const monthEnd = computed(() => endOfMonth(currentDate.value));
const weekStart = computed(() => startOfWeek(currentDate.value, { weekStartsOn: 1 }));
const weekEnd = computed(() => endOfWeek(currentDate.value, { weekStartsOn: 1 }));
const dayStart = computed(() => startOfDay(currentDate.value));
const dayEnd = computed(() => endOfDay(currentDate.value));

const visibleEvents = computed(() => {
  let start: Date, end: Date;
  
  switch (currentView.value) {
    case 'month':
      start = monthStart.value;
      end = monthEnd.value;
      break;
    case 'week':
      start = weekStart.value;
      end = weekEnd.value;
      break;
    case '3day':
      start = startOfDay(currentDate.value);
      end = endOfDay(addDays(currentDate.value, 2));
      break;
    case 'day':
      start = dayStart.value;
      end = dayEnd.value;
      break;
    default:
      start = monthStart.value;
      end = monthEnd.value;
  }

  return events.value.filter(event => {
    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);
    return (
      (selectedCalendarIds.value.length === 0 || selectedCalendarIds.value.includes(event.calendarId)) &&
      (eventStart <= end && eventEnd >= start)
    );
  });
});

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

const threeDayDays = computed(() => {
  const days: Date[] = [];
  for (let i = 0; i < 3; i++) {
    days.push(new Date(addDays(currentDate.value, i)));
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

// Functions
const loadCalendars = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    calendars.value = await getCalendars();
    if (selectedCalendarIds.value.length === 0 && calendars.value.length > 0) {
      selectedCalendarIds.value = calendars.value.map(c => c.id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Kalender';
  } finally {
    isLoading.value = false;
  }
};

const loadEvents = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    
    let start: Date, end: Date;
    switch (currentView.value) {
      case 'month':
        start = startOfWeek(monthStart.value, { weekStartsOn: 1 });
        end = endOfWeek(monthEnd.value, { weekStartsOn: 1 });
        break;
      case 'week':
        start = weekStart.value;
        end = weekEnd.value;
        break;
      case '3day':
        start = startOfDay(currentDate.value);
        end = endOfDay(addDays(currentDate.value, 2));
        break;
      case 'day':
        start = dayStart.value;
        end = dayEnd.value;
        break;
      default:
        start = monthStart.value;
        end = monthEnd.value;
    }

    events.value = await getCalendarEvents({
      calendarIds: selectedCalendarIds.value.length > 0 ? selectedCalendarIds.value : undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Termine';
  } finally {
    isLoading.value = false;
  }
};

const loadPatients = async () => {
  try {
    patients.value = await getPatients();
  } catch (err) {
    console.error('Fehler beim Laden der Patienten', err);
  }
};

const loadRooms = async () => {
  try {
    rooms.value = await getRooms();
  } catch (err) {
    console.error('Fehler beim Laden der Räume', err);
  }
};

const loadUsers = async () => {
  try {
    users.value = await getCalendarUsers();
  } catch (err) {
    console.error('Fehler beim Laden der Benutzer', err);
  }
};

const addParticipant = (userId: string) => {
  if (!eventForm.value.participantIds.includes(userId)) {
    eventForm.value.participantIds.push(userId);
  }
};

const removeParticipant = (userId: string) => {
  const index = eventForm.value.participantIds.indexOf(userId);
  if (index > -1) {
    eventForm.value.participantIds.splice(index, 1);
  }
};

const showTooltip = (event: CalendarEvent, e: MouseEvent) => {
  tooltipEvent.value = event;
  tooltipPosition.value = { x: e.clientX, y: e.clientY };
};

const hideTooltip = () => {
  tooltipEvent.value = null;
};

const getEventsForDay = (day: Date) => {
  return visibleEvents.value.filter(event => {
    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);
    return isSameDay(eventStart, day) || (eventStart <= day && eventEnd >= day);
  });
};

// Group overlapping events and calculate positions for side-by-side display
const getEventLayout = (events: CalendarEvent[]) => {
  if (events.length === 0) return [];

  // Sort events by start time
  const sorted = [...events].sort((a, b) => 
    parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
  );

  // Group overlapping events
  const groups: CalendarEvent[][] = [];
  const processed = new Set<string>();

  for (const event of sorted) {
    if (processed.has(event.id)) continue;

    const group: CalendarEvent[] = [event];
    processed.add(event.id);
    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);

    // Find all overlapping events
    for (const other of sorted) {
      if (processed.has(other.id)) continue;
      
      const otherStart = parseISO(other.startTime);
      const otherEnd = parseISO(other.endTime);
      
      // Check if events overlap
      if (eventStart < otherEnd && otherStart < eventEnd) {
        group.push(other);
        processed.add(other.id);
      }
    }

    groups.push(group);
  }

  // Calculate positions for each event
  const layouts: Array<{
    event: CalendarEvent;
    left: number;
    width: number;
    zIndex: number;
  }> = [];

  for (const group of groups) {
    const groupSize = group.length;
    const widthPercent = 100 / groupSize;

    group.forEach((event, index) => {
      layouts.push({
        event,
        left: index * widthPercent,
        width: widthPercent,
        zIndex: groupSize - index
      });
    });
  }

  return layouts;
};

const getEventsForHour = (day: Date, hour: number) => {
  const hourStart = setMinutes(setHours(day, hour), 0);
  const hourEnd = setMinutes(setHours(day, hour), 59);
  
  return visibleEvents.value.filter(event => {
    const eventStart = parseISO(event.startTime);
    const eventEnd = parseISO(event.endTime);
    return (
      isSameDay(eventStart, day) &&
      eventStart <= hourEnd &&
      eventEnd >= hourStart
    );
  });
};

const openEventModal = (event?: CalendarEvent, day?: Date) => {
  if (event) {
    editingEvent.value = event;
    eventForm.value = {
      calendarId: event.calendarId,
      title: event.title,
      description: event.description || '',
      startTime: format(parseISO(event.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(parseISO(event.endTime), "yyyy-MM-dd'T'HH:mm"),
      location: event.location || '',
      patientId: event.patientId || '',
      participantIds: event.participants.map(p => p.userId),
      recurrenceType: event.recurrenceRule?.type || '',
      recurrenceEndType: event.recurrenceRule?.endAfter ? 'after' : event.recurrenceEndDate ? 'date' : 'never',
      recurrenceEndAfter: event.recurrenceRule?.endAfter || 10,
      recurrenceEndDate: event.recurrenceEndDate ? format(parseISO(event.recurrenceEndDate), "yyyy-MM-dd'T'HH:mm") : ''
    };
  } else {
    editingEvent.value = null;
    const start = day ? setHours(day, new Date().getHours()) : new Date();
    const end = addDays(start, 1);
    eventForm.value = {
      calendarId: calendars.value[0]?.id || '',
      title: '',
      description: '',
      startTime: format(start, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      patientId: '',
      participantIds: [],
      recurrenceType: '',
      recurrenceEndType: 'never',
      recurrenceEndAfter: 10,
      recurrenceEndDate: ''
    };
  }
  showEventModal.value = true;
  conflicts.value = [];
  showConflictWarning.value = false;
};

const closeEventModal = () => {
  showEventModal.value = false;
  editingEvent.value = null;
  conflicts.value = [];
  showConflictWarning.value = false;
};

const checkConflicts = async () => {
  if (!eventForm.value.startTime || !eventForm.value.endTime) return;
  
  try {
    const result = await checkEventConflicts({
      startTime: new Date(eventForm.value.startTime).toISOString(),
      endTime: new Date(eventForm.value.endTime).toISOString(),
      location: eventForm.value.location || undefined,
      participantIds: eventForm.value.participantIds.length > 0 ? eventForm.value.participantIds : undefined,
      excludeEventId: editingEvent.value?.id
    });
    
    conflicts.value = result.conflicts;
    showConflictWarning.value = result.hasConflicts;
  } catch (err) {
    console.error('Fehler beim Prüfen der Konflikte', err);
  }
};

const saveEvent = async () => {
  if (!eventForm.value.title || !eventForm.value.calendarId || !eventForm.value.startTime || !eventForm.value.endTime) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder aus';
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    const recurrenceRule = eventForm.value.recurrenceType ? {
      type: eventForm.value.recurrenceType,
      ...(eventForm.value.recurrenceEndType === 'after' && { endAfter: eventForm.value.recurrenceEndAfter }),
      ...(eventForm.value.recurrenceEndType === 'date' && { endDate: new Date(eventForm.value.recurrenceEndDate).toISOString() })
    } : undefined;

    const recurrenceEndDate = eventForm.value.recurrenceType && eventForm.value.recurrenceEndType === 'date'
      ? new Date(eventForm.value.recurrenceEndDate).toISOString()
      : undefined;

    if (editingEvent.value) {
      await updateCalendarEvent(editingEvent.value.id, {
        calendarId: eventForm.value.calendarId,
        title: eventForm.value.title,
        description: eventForm.value.description || undefined,
        startTime: new Date(eventForm.value.startTime).toISOString(),
        endTime: new Date(eventForm.value.endTime).toISOString(),
        location: eventForm.value.location || undefined,
        patientId: eventForm.value.patientId || undefined,
        recurrenceRule,
        recurrenceEndDate
      });
    } else {
      await createCalendarEvent({
        calendarId: eventForm.value.calendarId,
        title: eventForm.value.title,
        description: eventForm.value.description || undefined,
        startTime: new Date(eventForm.value.startTime).toISOString(),
        endTime: new Date(eventForm.value.endTime).toISOString(),
        location: eventForm.value.location || undefined,
        patientId: eventForm.value.patientId || undefined,
        recurrenceRule,
        recurrenceEndDate,
        participantIds: eventForm.value.participantIds
      });
    }

    await loadEvents();
    closeEventModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Speichern des Termins';
  } finally {
    isLoading.value = false;
  }
};

const deleteEvent = async (event: CalendarEvent) => {
  if (!confirm('Möchten Sie diesen Termin wirklich löschen?')) return;
  
  try {
    isLoading.value = true;
    error.value = null;
    await deleteCalendarEvent(event.id);
    await loadEvents();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen des Termins';
  } finally {
    isLoading.value = false;
  }
};

const openCalendarModal = (calendar?: Calendar) => {
  if (calendar) {
    editingCalendar.value = calendar;
    calendarForm.value = {
      name: calendar.name,
      type: calendar.type,
      roomId: calendar.roomId || '',
      purpose: calendar.purpose || '',
      color: calendar.color || '#3b82f6'
    };
  } else {
    editingCalendar.value = null;
    calendarForm.value = {
      name: '',
      type: 'PERSONAL',
      roomId: '',
      purpose: '',
      color: '#3b82f6'
    };
  }
  showCalendarModal.value = true;
};

const closeCalendarModal = () => {
  showCalendarModal.value = false;
  editingCalendar.value = null;
};

const saveCalendar = async () => {
  if (!calendarForm.value.name) {
    error.value = 'Bitte geben Sie einen Namen ein';
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;

    if (editingCalendar.value) {
      await updateCalendar(editingCalendar.value.id, {
        name: calendarForm.value.name,
        type: calendarForm.value.type,
        roomId: calendarForm.value.roomId || undefined,
        purpose: calendarForm.value.purpose || undefined,
        color: calendarForm.value.color
      });
    } else {
      await createCalendar({
        name: calendarForm.value.name,
        type: calendarForm.value.type,
        roomId: calendarForm.value.roomId || undefined,
        purpose: calendarForm.value.purpose || undefined,
        color: calendarForm.value.color
      });
    }

    await loadCalendars();
    closeCalendarModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Speichern des Kalenders';
  } finally {
    isLoading.value = false;
  }
};

const deleteCalendarAction = async (calendar: Calendar) => {
  if (!confirm('Möchten Sie diesen Kalender wirklich löschen? Alle Termine werden gelöscht.')) return;
  
  try {
    isLoading.value = true;
    error.value = null;
    await deleteCalendar(calendar.id);
    await loadCalendars();
    await loadEvents();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen des Kalenders';
  } finally {
    isLoading.value = false;
  }
};

const toggleCalendar = (calendarId: string) => {
  const index = selectedCalendarIds.value.indexOf(calendarId);
  if (index > -1) {
    selectedCalendarIds.value.splice(index, 1);
  } else {
    selectedCalendarIds.value.push(calendarId);
  }
  loadEvents();
};

const navigateDate = (direction: 'prev' | 'next') => {
  switch (currentView.value) {
    case 'month':
      currentDate.value = direction === 'prev' ? subMonths(currentDate.value, 1) : addMonths(currentDate.value, 1);
      break;
    case 'week':
      currentDate.value = direction === 'prev' ? subWeeks(currentDate.value, 1) : addWeeks(currentDate.value, 1);
      break;
    case '3day':
      currentDate.value = direction === 'prev' ? subDays(currentDate.value, 1) : addDays(currentDate.value, 1);
      break;
    case 'day':
      currentDate.value = direction === 'prev' ? subDays(currentDate.value, 1) : addDays(currentDate.value, 1);
      break;
  }
  loadEvents();
};

const goToToday = () => {
  currentDate.value = new Date();
  loadEvents();
};

const formatPatientName = (patient: Patient) => {
  const name = patient.name as { given?: string[]; family?: string };
  const given = (name.given || []).join(' ');
  const family = name.family || '';
  return `${given} ${family}`.trim() || 'Unbekannt';
};

// Watch
watch([currentView, currentDate, selectedCalendarIds], () => {
  loadEvents();
}, { immediate: false });

watch([() => eventForm.value.startTime, () => eventForm.value.endTime, () => eventForm.value.location, () => eventForm.value.participantIds], () => {
  if (eventForm.value.startTime && eventForm.value.endTime) {
    checkConflicts();
  }
}, { deep: true });

// Lifecycle
onMounted(async () => {
  await loadCalendars();
  await loadEvents();
  await loadPatients();
  await loadRooms();
  await loadUsers();
});
</script>

<template>
  <div class="flex h-full flex-col gap-4 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-semibold text-steel-700">Kalender</h1>
        <button
          @click="goToToday"
          class="rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50"
        >
          Heute
        </button>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- View selector -->
        <div class="flex rounded-lg border border-steel-200 bg-white p-1">
          <button
            @click="currentView = 'month'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              currentView === 'month' ? 'bg-accent-sky text-white' : 'text-steel-600 hover:bg-steel-50'
            ]"
          >
            Monat
          </button>
          <button
            @click="currentView = 'week'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              currentView === 'week' ? 'bg-accent-sky text-white' : 'text-steel-600 hover:bg-steel-50'
            ]"
          >
            Woche
          </button>
          <button
            @click="currentView = '3day'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              currentView === '3day' ? 'bg-accent-sky text-white' : 'text-steel-600 hover:bg-steel-50'
            ]"
          >
            3 Tage
          </button>
          <button
            @click="currentView = 'day'"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              currentView === 'day' ? 'bg-accent-sky text-white' : 'text-steel-600 hover:bg-steel-50'
            ]"
          >
            Tag
          </button>
        </div>

        <!-- Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="navigateDate('prev')"
            class="rounded-lg border border-steel-200 bg-white p-2 text-steel-600 hover:bg-steel-50"
          >
            <PhCaretLeft :size="20" />
          </button>
          <button
            @click="navigateDate('next')"
            class="rounded-lg border border-steel-200 bg-white p-2 text-steel-600 hover:bg-steel-50"
          >
            <PhCaretRight :size="20" />
          </button>
        </div>

        <!-- Actions -->
        <button
          @click="openEventModal()"
          class="flex items-center gap-2 rounded-lg bg-accent-sky px-4 py-2 text-sm font-medium text-white hover:bg-accent-sky/90"
        >
          <PhPlus :size="20" />
          <span>Termin</span>
        </button>
        <button
          @click="openCalendarModal()"
          class="flex items-center gap-2 rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50"
        >
          <PhPlus :size="20" />
          <span>Kalender</span>
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
      {{ error }}
    </div>

    <!-- Calendar list -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="calendar in calendars"
        :key="calendar.id"
        @click="toggleCalendar(calendar.id)"
        :class="[
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          selectedCalendarIds.includes(calendar.id)
            ? 'bg-accent-sky text-white'
            : 'bg-white border border-steel-200 text-steel-600 hover:bg-steel-50'
        ]"
      >
        <div
          class="h-3 w-3 rounded-full"
          :style="{ backgroundColor: calendar.color || '#3b82f6' }"
        ></div>
        <span>{{ calendar.name }}</span>
      </button>
    </div>

    <!-- Calendar view -->
    <div class="flex-1 overflow-auto rounded-lg border border-steel-200 bg-white">
      <!-- Month view -->
      <div v-if="currentView === 'month'" class="h-full">
        <div class="grid grid-cols-7 border-b border-steel-200">
          <div
            v-for="day in ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']"
            :key="day"
            class="border-r border-steel-200 p-2 text-center text-sm font-medium text-steel-600 last:border-r-0"
          >
            {{ day }}
          </div>
        </div>
        <div class="grid grid-cols-7 auto-rows-fr">
          <div
            v-for="day in monthDays"
            :key="day.toISOString()"
            :class="[
              'min-h-[100px] border-r border-b border-steel-200 p-2',
              !isSameMonth(day, currentDate) ? 'bg-steel-50' : '',
              isSameDay(day, new Date()) ? 'bg-accent-sky/5' : ''
            ]"
          >
            <div
              :class="[
                'mb-1 text-sm font-medium',
                isSameDay(day, new Date()) ? 'text-accent-sky' : 'text-steel-600',
                !isSameMonth(day, currentDate) ? 'text-steel-400' : ''
              ]"
            >
              {{ format(day, 'd') }}
            </div>
            <div class="space-y-1">
              <button
                v-for="event in getEventsForDay(day)"
                :key="event.id"
                @click="openEventModal(event)"
                @mouseenter="showTooltip(event, $event)"
                @mouseleave="hideTooltip"
                :class="[
                  'w-full rounded px-2 py-1 text-left text-xs font-medium truncate overflow-hidden',
                  event.recurrenceRule ? 'border-l-2 border-white/50' : '',
                  conflicts.some(c => c.eventId === event.id) ? 'border-2 border-red-500' : ''
                ]"
                :style="{ backgroundColor: event.calendar.color || '#3b82f6', color: 'white' }"
              >
                <div class="font-semibold">{{ format(parseISO(event.startTime), 'HH:mm') }}</div>
                <div class="truncate">{{ event.title }}</div>
                <div v-if="event.location" class="text-[10px] opacity-90 truncate">
                  <PhMapPin :size="10" class="inline mr-0.5" />
                  {{ event.location }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Week view -->
      <div v-if="currentView === 'week'" class="h-full flex">
        <div class="w-16 border-r border-steel-200">
          <div class="h-12 border-b border-steel-200"></div>
          <div
            v-for="hour in hours"
            :key="hour"
            class="h-16 border-b border-steel-100 p-1 text-xs text-steel-500"
          >
            {{ hour }}:00
          </div>
        </div>
        <div class="flex-1 grid grid-cols-7">
          <div
            v-for="day in weekDays"
            :key="day.toISOString()"
            class="border-r border-steel-200 last:border-r-0"
          >
            <div
              :class="[
                'h-12 border-b border-steel-200 p-2 text-center text-sm font-medium',
                isSameDay(day, new Date()) ? 'bg-accent-sky/10 text-accent-sky' : 'text-steel-600'
              ]"
            >
              <div>{{ format(day, 'EEE', { locale: de }) }}</div>
              <div class="text-xs">{{ format(day, 'd.M.') }}</div>
            </div>
            <div class="relative">
              <div
                v-for="hour in hours"
                :key="hour"
                class="h-16 border-b border-steel-100"
              ></div>
              <div class="absolute inset-0">
                <template
                  v-for="layout in getEventLayout(getEventsForDay(day))"
                  :key="layout.event.id"
                >
                  <div
                    @click="openEventModal(layout.event)"
                    @mouseenter="showTooltip(layout.event, $event)"
                    @mouseleave="hideTooltip"
                    :class="[
                      'absolute rounded px-2 py-1 text-xs font-medium cursor-pointer overflow-hidden',
                      layout.event.recurrenceRule ? 'border-l-2 border-white/50' : '',
                      conflicts.some(c => c.eventId === layout.event.id) ? 'border-2 border-red-500' : ''
                    ]"
                    :style="{
                      left: `${layout.left}%`,
                      width: `${layout.width}%`,
                      marginLeft: '2px',
                      marginRight: '2px',
                      top: `${(parseISO(layout.event.startTime).getHours() + parseISO(layout.event.startTime).getMinutes() / 60) * 64}px`,
                      height: `${((parseISO(layout.event.endTime).getTime() - parseISO(layout.event.startTime).getTime()) / (1000 * 60 * 60)) * 64}px`,
                      backgroundColor: layout.event.calendar.color || '#3b82f6',
                      color: 'white',
                      zIndex: layout.zIndex
                    }"
                  >
                    <div class="truncate font-semibold">{{ format(parseISO(layout.event.startTime), 'HH:mm') }}</div>
                    <div class="truncate">{{ layout.event.title }}</div>
                    <div v-if="layout.event.location" class="truncate text-[10px] opacity-90">
                      <PhMapPin :size="10" class="inline mr-0.5" />
                      {{ layout.event.location }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3-day view -->
      <div v-if="currentView === '3day'" class="h-full flex">
        <div class="w-16 border-r border-steel-200">
          <div class="h-12 border-b border-steel-200"></div>
          <div
            v-for="hour in hours"
            :key="hour"
            class="h-16 border-b border-steel-100 p-1 text-xs text-steel-500"
          >
            {{ hour }}:00
          </div>
        </div>
        <div class="flex-1 grid grid-cols-3">
          <div
            v-for="day in threeDayDays"
            :key="day.toISOString()"
            class="border-r border-steel-200 last:border-r-0"
          >
            <div
              :class="[
                'h-12 border-b border-steel-200 p-2 text-center text-sm font-medium',
                isSameDay(day, new Date()) ? 'bg-accent-sky/10 text-accent-sky' : 'text-steel-600'
              ]"
            >
              <div>{{ format(day, 'EEE', { locale: de }) }}</div>
              <div class="text-xs">{{ format(day, 'd.M.') }}</div>
            </div>
            <div class="relative">
              <div
                v-for="hour in hours"
                :key="hour"
                class="h-16 border-b border-steel-100"
              ></div>
              <div class="absolute inset-0">
                <template
                  v-for="layout in getEventLayout(getEventsForDay(day))"
                  :key="layout.event.id"
                >
                  <div
                    @click="openEventModal(layout.event)"
                    @mouseenter="showTooltip(layout.event, $event)"
                    @mouseleave="hideTooltip"
                    :class="[
                      'absolute rounded px-2 py-1 text-xs font-medium cursor-pointer overflow-hidden',
                      layout.event.recurrenceRule ? 'border-l-2 border-white/50' : '',
                      conflicts.some(c => c.eventId === layout.event.id) ? 'border-2 border-red-500' : ''
                    ]"
                    :style="{
                      left: `${layout.left}%`,
                      width: `${layout.width}%`,
                      marginLeft: '2px',
                      marginRight: '2px',
                      top: `${(parseISO(layout.event.startTime).getHours() + parseISO(layout.event.startTime).getMinutes() / 60) * 64}px`,
                      height: `${((parseISO(layout.event.endTime).getTime() - parseISO(layout.event.startTime).getTime()) / (1000 * 60 * 60)) * 64}px`,
                      backgroundColor: layout.event.calendar.color || '#3b82f6',
                      color: 'white',
                      zIndex: layout.zIndex
                    }"
                  >
                    <div class="truncate font-semibold">{{ format(parseISO(layout.event.startTime), 'HH:mm') }}</div>
                    <div class="truncate">{{ layout.event.title }}</div>
                    <div v-if="layout.event.location" class="truncate text-[10px] opacity-90">
                      <PhMapPin :size="10" class="inline mr-0.5" />
                      {{ layout.event.location }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Day view -->
      <div v-if="currentView === 'day'" class="h-full flex">
        <div class="w-16 border-r border-steel-200">
          <div class="h-12 border-b border-steel-200"></div>
          <div
            v-for="hour in hours"
            :key="hour"
            class="h-16 border-b border-steel-100 p-1 text-xs text-steel-500"
          >
            {{ hour }}:00
          </div>
        </div>
        <div class="flex-1">
          <div
            :class="[
              'h-12 border-b border-steel-200 p-2 text-center text-sm font-medium',
              isSameDay(currentDate, new Date()) ? 'bg-accent-sky/10 text-accent-sky' : 'text-steel-600'
            ]"
          >
            <div>{{ format(currentDate, 'EEEE', { locale: de }) }}</div>
            <div class="text-xs">{{ format(currentDate, 'd.M.yyyy') }}</div>
          </div>
          <div class="relative">
            <div
              v-for="hour in hours"
              :key="hour"
              class="h-16 border-b border-steel-100"
            ></div>
            <div class="absolute inset-0">
              <template
                v-for="layout in getEventLayout(getEventsForDay(currentDate))"
                :key="layout.event.id"
              >
                <div
                  @click="openEventModal(layout.event)"
                  @mouseenter="showTooltip(layout.event, $event)"
                  @mouseleave="hideTooltip"
                  :class="[
                    'absolute rounded px-2 py-1 text-xs font-medium cursor-pointer overflow-hidden',
                    layout.event.recurrenceRule ? 'border-l-2 border-white/50' : '',
                    conflicts.some(c => c.eventId === layout.event.id) ? 'border-2 border-red-500' : ''
                  ]"
                  :style="{
                    left: `${layout.left}%`,
                    width: `${layout.width}%`,
                    marginLeft: '2px',
                    marginRight: '2px',
                    top: `${(parseISO(layout.event.startTime).getHours() + parseISO(layout.event.startTime).getMinutes() / 60) * 64}px`,
                    height: `${((parseISO(layout.event.endTime).getTime() - parseISO(layout.event.startTime).getTime()) / (1000 * 60 * 60)) * 64}px`,
                    backgroundColor: layout.event.calendar.color || '#3b82f6',
                    color: 'white',
                    zIndex: layout.zIndex
                  }"
                >
                  <div class="truncate font-semibold">{{ format(parseISO(layout.event.startTime), 'HH:mm') }}</div>
                  <div class="truncate">{{ layout.event.title }}</div>
                  <div v-if="layout.event.location" class="truncate text-[10px] opacity-90">
                    <PhMapPin :size="10" class="inline mr-0.5" />
                    {{ layout.event.location }}
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltipEvent"
      class="fixed z-[9999] rounded-lg bg-steel-800 text-white p-3 shadow-xl max-w-sm pointer-events-none"
      :style="{ left: `${tooltipPosition.x + 10}px`, top: `${tooltipPosition.y + 10}px` }"
    >
      <div class="font-semibold mb-1">{{ tooltipEvent.title }}</div>
      <div v-if="tooltipEvent.location" class="text-xs text-steel-200 mb-1">
        <PhMapPin :size="12" class="inline mr-1" />
        {{ tooltipEvent.location }}
      </div>
      <div v-if="tooltipEvent.participants.length > 0" class="text-xs text-steel-200 mb-1">
        <PhUsers :size="12" class="inline mr-1" />
        {{ tooltipEvent.participants.map(p => p.user.displayName).join(', ') }}
      </div>
      <div v-if="tooltipEvent.description" class="text-xs text-steel-300 line-clamp-3">
        {{ tooltipEvent.description }}
      </div>
      <div class="text-xs text-steel-400 mt-1">
        {{ format(parseISO(tooltipEvent.startTime), 'dd.MM.yyyy HH:mm') }} - {{ format(parseISO(tooltipEvent.endTime), 'HH:mm') }}
      </div>
    </div>

    <!-- Event modal -->
    <Teleport to="body">
      <div
        v-if="showEventModal"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50"
        @click.self="closeEventModal"
      >
      <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-steel-700">
            {{ editingEvent ? 'Termin bearbeiten' : 'Neuer Termin' }}
          </h2>
          <button @click="closeEventModal" class="text-steel-400 hover:text-steel-600">
            <PhX :size="24" />
          </button>
        </div>

        <div v-if="showConflictWarning" class="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <div class="flex items-center gap-2 text-red-700">
            <PhWarning :size="20" />
            <span class="font-medium">Konflikte gefunden!</span>
          </div>
          <div class="mt-2 space-y-1 text-sm text-red-600">
            <div v-for="conflict in conflicts" :key="conflict.eventId">
              {{ conflict.type === 'location' ? 'Ort' : 'Teilnehmer' }}: {{ conflict.eventTitle }} ({{ format(parseISO(conflict.startTime), 'dd.MM.yyyy HH:mm') }})
            </div>
          </div>
        </div>

        <form @submit.prevent="saveEvent" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Kalender *</label>
            <select
              v-model="eventForm.calendarId"
              required
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            >
              <option value="">Bitte wählen</option>
              <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
                {{ calendar.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Titel *</label>
            <input
              v-model="eventForm.title"
              type="text"
              required
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Beschreibung</label>
            <textarea
              v-model="eventForm.description"
              rows="3"
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-steel-700 mb-1">Startzeit *</label>
              <input
                v-model="eventForm.startTime"
                type="datetime-local"
                required
                class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-steel-700 mb-1">Endzeit *</label>
              <input
                v-model="eventForm.endTime"
                type="datetime-local"
                required
                class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Ort</label>
            <select
              v-model="eventForm.location"
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            >
              <option value="">Kein Ort</option>
              <option v-for="room in rooms" :key="room.id" :value="room.name">
                {{ room.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Patient</label>
            <select
              v-model="eventForm.patientId"
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            >
              <option value="">Kein Patient</option>
              <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                {{ formatPatientName(patient) }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-2">Teilnehmer</label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <select
                  @change="(e) => { const target = e.target as HTMLSelectElement; if (target.value) { addParticipant(target.value); target.value = ''; } }"
                  class="flex-1 rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
                >
                  <option value="">Teilnehmer hinzufügen...</option>
                  <option
                    v-for="user in users.filter(u => !eventForm.participantIds.includes(u.id))"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.displayName }} ({{ user.email }})
                  </option>
                </select>
              </div>
              <div v-if="eventForm.participantIds.length > 0" class="space-y-1">
                <div
                  v-for="participantId in eventForm.participantIds"
                  :key="participantId"
                  class="flex items-center justify-between rounded-lg border border-steel-200 bg-steel-50 px-3 py-2"
                >
                  <span class="text-sm text-steel-700">
                    {{ users.find(u => u.id === participantId)?.displayName || 'Unbekannt' }}
                  </span>
                  <button
                    type="button"
                    @click="removeParticipant(participantId)"
                    class="text-red-600 hover:text-red-700"
                  >
                    <PhX :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 mb-2">
              <input
                v-model="eventForm.recurrenceType"
                type="checkbox"
                :true-value="'weekly'"
                :false-value="''"
                class="rounded border-steel-200"
              />
              <span class="text-sm font-medium text-steel-700">Wiederholung aktivieren</span>
            </label>
            <div v-if="eventForm.recurrenceType" class="ml-6 space-y-2">
              <div>
                <label class="block text-sm font-medium text-steel-700 mb-1">Wiederholungs-Typ</label>
                <select
                  v-model="eventForm.recurrenceType"
                  class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
                >
                  <option value="daily">Täglich</option>
                  <option value="weekly">Wöchentlich</option>
                  <option value="biweekly">14-tägig</option>
                  <option value="monthly">Monatlich</option>
                  <option value="quarterly">Quartalsweise</option>
                  <option value="yearly">Jährlich</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-steel-700 mb-1">Wiederholung endet</label>
                <select
                  v-model="eventForm.recurrenceEndType"
                  class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
                >
                  <option value="never">Nie</option>
                  <option value="after">Nach X Wiederholungen</option>
                  <option value="date">Am Datum</option>
                </select>
              </div>
              <div v-if="eventForm.recurrenceEndType === 'after'">
                <label class="block text-sm font-medium text-steel-700 mb-1">Anzahl</label>
                <input
                  v-model.number="eventForm.recurrenceEndAfter"
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
                />
              </div>
              <div v-if="eventForm.recurrenceEndType === 'date'">
                <label class="block text-sm font-medium text-steel-700 mb-1">Enddatum</label>
                <input
                  v-model="eventForm.recurrenceEndDate"
                  type="datetime-local"
                  class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center">
            <button
              v-if="editingEvent"
              type="button"
              @click="deleteEvent(editingEvent)"
              :disabled="isLoading"
              class="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <PhTrash :size="16" class="inline mr-1" />
              Löschen
            </button>
            <div v-else></div>
            <div class="flex gap-2">
              <button
                type="button"
                @click="closeEventModal"
                class="rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                :disabled="isLoading"
                class="rounded-lg bg-accent-sky px-4 py-2 text-sm font-medium text-white hover:bg-accent-sky/90 disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </Teleport>

    <!-- Calendar modal -->
    <Teleport to="body">
      <div
        v-if="showCalendarModal"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50"
        @click.self="closeCalendarModal"
      >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold text-steel-700">
            {{ editingCalendar ? 'Kalender bearbeiten' : 'Neuer Kalender' }}
          </h2>
          <button @click="closeCalendarModal" class="text-steel-400 hover:text-steel-600">
            <PhX :size="24" />
          </button>
        </div>

        <form @submit.prevent="saveCalendar" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Name *</label>
            <input
              v-model="calendarForm.name"
              type="text"
              required
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Typ *</label>
            <select
              v-model="calendarForm.type"
              required
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            >
              <option value="PERSONAL">Persönlich</option>
              <option value="ROOM">Raum</option>
              <option value="PURPOSE">Zweck</option>
            </select>
          </div>

          <div v-if="calendarForm.type === 'PURPOSE'">
            <label class="block text-sm font-medium text-steel-700 mb-1">Zweck</label>
            <input
              v-model="calendarForm.purpose"
              type="text"
              class="w-full rounded-lg border border-steel-200 px-3 py-2 text-steel-700"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-steel-700 mb-1">Farbe</label>
            <input
              v-model="calendarForm.color"
              type="color"
              class="h-10 w-full rounded-lg border border-steel-200"
            />
          </div>

          <div class="flex justify-end gap-2">
            <button
              type="button"
              @click="closeCalendarModal"
              class="rounded-lg border border-steel-200 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="rounded-lg bg-accent-sky px-4 py-2 text-sm font-medium text-white hover:bg-accent-sky/90 disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

