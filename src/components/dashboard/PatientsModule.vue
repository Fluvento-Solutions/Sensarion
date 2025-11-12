<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from 'vue';
import { PhMagnifyingGlass, PhList, PhUser, PhPlus, PhActivity, PhShield, PhStethoscope, PhFileText, PhCalendar, PhLock, PhGenderMale, PhGenderFemale, PhGenderIntersex, PhCaretRight, PhPencil, PhTrash, PhX, PhTabs, PhAddressBook, PhChartLine, PhFunnel, PhFunnelSimple, PhArrowsDownUp, PhCheckCircle, PhXCircle, PhPencilSimple, PhTrashSimple, PhSparkle, PhShieldCheck } from '@phosphor-icons/vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
import {
  getPatients,
  getPatient,
  getPatientNotes,
  createPatientNote,
  getPatientEncounters,
  createPatient,
  updatePatient,
  getPatientVitals,
  createPatientVital,
  deletePatientVital,
  addPatientAllergy,
  updatePatientAllergy,
  deletePatientAllergy,
  addPatientMedication,
  updatePatientMedication,
  deletePatientMedication,
  updatePatientVital,
  getPatientAuditLogs,
  type Patient,
  type PatientNote,
  type PatientEncounter,
  type PatientVitalHistory,
  type PatientAuditLog
} from '@/services/api';

const searchQuery = ref('');
const patients = ref<Patient[]>([]);
const selectedPatientId = ref<string | null>(null);
const selectedPatient = ref<Patient | null>(null);
const notes = ref<PatientNote[]>([]);
const encounters = ref<PatientEncounter[]>([]);
const auditLogs = ref<PatientAuditLog[]>([]);
const isLoading = ref(false);
const historySearchQuery = ref('');
const historyFilterType = ref<'all' | 'note' | 'encounter' | 'audit'>('all');
const historySortBy = ref<'date-asc' | 'date-desc'>('date-desc');
const error = ref<string | null>(null);
const showNoteModal = ref(false);
const newNoteText = ref('');
const showNewPatientModal = ref(false);
const showEditPatientModal = ref(false);
const showVitalModal = ref(false);
const showEditVitalModal = ref(false);
const showAllergyModal = ref(false);
const showEditAllergyModal = ref(false);
const showMedicationModal = ref(false);
const showEditMedicationModal = ref(false);
const editingVitalId = ref<string | null>(null);
const editingAllergyId = ref<string | null>(null);
const editingMedicationId = ref<string | null>(null);
const isSidebarCollapsed = ref(false);
const newPatientForm = ref({
  givenNames: '',
  familyName: '',
  birthDate: '',
  tags: ''
});
const editPatientForm = ref({
  givenNames: '',
  familyName: '',
  birthDate: '',
  gender: '' as 'm' | 'w' | 'd' | '',
  tags: '',
  address: {
    street: '',
    zip: '',
    city: '',
    country: ''
  },
  contact: {
    phone: '',
    email: '',
    mobile: ''
  },
  insurance: {
    number: '',
    type: '',
    provider: ''
  }
});
const newVitalForm = ref({
  bp_systolic: undefined as number | undefined,
  bp_diastolic: undefined as number | undefined,
  hr: undefined as number | undefined,
  temperature: undefined as number | undefined,
  spo2: undefined as number | undefined,
  glucose: undefined as number | undefined,
  bmi: undefined as number | undefined
});
const newAllergyForm = ref({
  substance: '',
  severity: ''
});
const newMedicationForm = ref({
  name: '',
  dose_morning: '',
  dose_midday: '',
  dose_evening: '',
  dose_night: '',
  notes: ''
});
const vitalsHistory = ref<PatientVitalHistory[]>([]);
const activeTab = ref<'overview' | 'vitals' | 'medical' | 'history'>('overview');

// Gefilterte Arrays (ohne gelöschte Einträge)
const activeAllergies = computed(() => {
  if (!selectedPatient.value) return [];
  return (selectedPatient.value.allergies || []).filter(
    (a: any) => !a.is_deleted && !a.deleted_at
  );
});

const activeMedications = computed(() => {
  if (!selectedPatient.value) return [];
  return (selectedPatient.value.medications || []).filter(
    (m: any) => !m.is_deleted && !m.deleted_at
  );
});

const activeVitalsHistory = computed(() => {
  return vitalsHistory.value.filter(
    (v) => !v.is_deleted && !v.deleted_at
  );
});

// Kombinierte Verlaufsdaten mit Typ-Information
type HistoryItem = {
  type: 'note' | 'encounter' | 'audit';
  id: string;
  timestamp: string;
  date: string;
  title: string;
  content: string;
  author?: string;
  icon: any;
  color: string;
};

const historyItems = computed(() => {
  const items: HistoryItem[] = [];

  // Notes
  notes.value.forEach(note => {
    items.push({
      type: 'note',
      id: note.note_id,
      timestamp: note.created_at,
      date: note.created_at,
      title: 'Notiz',
      content: note.text,
      author: note.author,
      icon: PhFileText,
      color: 'text-steel-600'
    });
  });

  // Encounters
  encounters.value.forEach(encounter => {
    items.push({
      type: 'encounter',
      id: encounter.encounter_id,
      timestamp: encounter.date,
      date: encounter.date,
      title: encounter.reason || 'Kontakt',
      content: encounter.summary || encounter.location || '',
      icon: PhCalendar,
      color: 'text-steel-600'
    });
  });

  // Audit Logs
  auditLogs.value.forEach(log => {
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
      type: 'audit',
      id: log.id,
      timestamp: log.timestamp,
      date: log.timestamp,
      title: `${actionLabels[log.action] || log.action} - ${entityLabels[log.entity_type] || log.entity_type}`,
      content: log.description,
      author: log.author,
      icon: iconMap[log.action] || PhFileText,
      color: log.action === 'delete' || log.action === 'remove' ? 'text-red-600' : log.action === 'create' || log.action === 'add' ? 'text-green-600' : 'text-steel-600'
    });
  });

  return items;
});

// Gefilterte und sortierte Verlaufsdaten
const filteredHistoryItems = computed(() => {
  let filtered = [...historyItems.value];

  // Filter nach Typ
  if (historyFilterType.value !== 'all') {
    filtered = filtered.filter(item => item.type === historyFilterType.value);
  }

  // Suche
  if (historySearchQuery.value.trim()) {
    const query = historySearchQuery.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.content.toLowerCase().includes(query) ||
      item.author?.toLowerCase().includes(query)
    );
  }

  // Sortierung
  filtered.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return historySortBy.value === 'date-asc' ? dateA - dateB : dateB - dateA;
  });

  return filtered;
});

const filteredPatients = computed(() => {
  if (!searchQuery.value.trim()) return patients.value;
  const q = searchQuery.value.toLowerCase();
  return patients.value.filter(p => {
    const name = `${(p.name.given || []).join(' ')} ${p.name.family || ''}`.toLowerCase();
    return name.includes(q) || p.patient_id.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q));
  });
});

const formatName = (name: { given?: string[]; family?: string }) => {
  const given = (name.given || []).join(' ');
  return `${given} ${name.family || ''}`.trim();
};

const getGenderIcon = (gender: string | null | undefined) => {
  if (gender === 'm') return PhGenderMale;
  if (gender === 'w') return PhGenderFemale;
  if (gender === 'd') return PhGenderIntersex;
  return null;
};

const chartData = computed(() => {
  if (!activeVitalsHistory.value || activeVitalsHistory.value.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  const sortedVitals = [...activeVitalsHistory.value].sort((a, b) => 
    new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const labels = sortedVitals.map(v => {
    const date = new Date(v.recordedAt);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  });

  return {
    labels,
    datasets: [
      {
        label: 'RR Systolisch',
        data: sortedVitals.map(v => v.bp_systolic || null),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y'
      },
      {
        label: 'RR Diastolisch',
        data: sortedVitals.map(v => v.bp_diastolic || null),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        yAxisID: 'y'
      },
      {
        label: 'Puls (bpm)',
        data: sortedVitals.map(v => v.hr || null),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1'
      },
      {
        label: 'Temperatur (°C)',
        data: sortedVitals.map(v => v.temperature || null),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y2'
      },
      {
        label: 'SpO2 (%)',
        data: sortedVitals.map(v => v.spo2 || null),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y3'
      },
      {
        label: 'Zucker (mg/dl)',
        data: sortedVitals.map(v => v.glucose || null),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y4'
      }
    ]
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        font: {
          size: 11
        },
        color: 'rgb(51, 65, 85)',
        usePointStyle: true,
        padding: 12
      }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: 'rgb(51, 65, 85)',
      bodyColor: 'rgb(51, 65, 85)',
      borderColor: 'rgba(226, 232, 240, 0.8)',
      borderWidth: 1,
      padding: 12,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(226, 232, 240, 0.3)'
      },
      ticks: {
        color: 'rgb(148, 163, 184)',
        font: {
          size: 10
        }
      }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'RR (mmHg)',
        color: 'rgb(148, 163, 184)',
        font: {
          size: 11
        }
      },
      grid: {
        color: 'rgba(226, 232, 240, 0.3)'
      },
      ticks: {
        color: 'rgb(148, 163, 184)',
        font: {
          size: 10
        }
      }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      title: {
        display: true,
        text: 'Puls (bpm)',
        color: 'rgb(148, 163, 184)',
        font: {
          size: 11
        }
      },
      grid: {
        drawOnChartArea: false
      },
      ticks: {
        color: 'rgb(148, 163, 184)',
        font: {
          size: 10
        }
      }
    },
    y2: {
      type: 'linear' as const,
      display: false
    },
    y3: {
      type: 'linear' as const,
      display: false
    },
    y4: {
      type: 'linear' as const,
      display: false
    }
  },
  interaction: {
    mode: 'nearest' as const,
    axis: 'x' as const,
    intersect: false
  }
}));

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const loadPatients = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    patients.value = await getPatients();
    if (patients.value.length > 0 && !selectedPatientId.value) {
      await selectPatient(patients.value[0].patient_id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Patienten';
  } finally {
    isLoading.value = false;
  }
};

const selectPatient = async (id: string) => {
  selectedPatientId.value = id;
  isSidebarCollapsed.value = true;
  isLoading.value = true;
  error.value = null;
  try {
    selectedPatient.value = await getPatient(id);
        [notes.value, encounters.value, vitalsHistory.value, auditLogs.value] = await Promise.all([
          getPatientNotes(id),
          getPatientEncounters(id),
          getPatientVitals(id),
          getPatientAuditLogs(id)
        ]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Laden der Patientendaten';
  } finally {
    isLoading.value = false;
  }
};

const handleSaveNote = async () => {
  if (!selectedPatientId.value || !newNoteText.value.trim()) return;
  
  isLoading.value = true;
  error.value = null;
  try {
    await createPatientNote(selectedPatientId.value, newNoteText.value);
    newNoteText.value = '';
    showNoteModal.value = false;
    await selectPatient(selectedPatientId.value); // Reload notes
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Speichern der Notiz';
  } finally {
    isLoading.value = false;
  }
};

const handleCreatePatient = async () => {
  if (!newPatientForm.value.givenNames.trim() || !newPatientForm.value.familyName.trim() || !newPatientForm.value.birthDate) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder aus';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    const givenNamesArray = newPatientForm.value.givenNames
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const tagsArray = newPatientForm.value.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newPatient = await createPatient({
      name: {
        given: givenNamesArray,
        family: newPatientForm.value.familyName.trim()
      },
      birthDate: newPatientForm.value.birthDate,
      tags: tagsArray
    });

    // Reset form
    newPatientForm.value = {
      givenNames: '',
      familyName: '',
      birthDate: '',
      tags: ''
    };
    showNewPatientModal.value = false;

    // Reload patients and select new one
    await loadPatients();
    if (newPatient.patient_id) {
      await selectPatient(newPatient.patient_id);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen des Patienten';
  } finally {
    isLoading.value = false;
  }
};

const openEditPatientModal = () => {
  if (!selectedPatient.value) return;
  
  editPatientForm.value = {
    givenNames: (selectedPatient.value.name.given || []).join(', '),
    familyName: selectedPatient.value.name.family || '',
    birthDate: selectedPatient.value.birth_date,
    gender: (selectedPatient.value.gender as 'm' | 'w' | 'd') || '',
    tags: selectedPatient.value.tags.join(', '),
    address: {
      street: selectedPatient.value.address?.street || '',
      zip: selectedPatient.value.address?.zip || '',
      city: selectedPatient.value.address?.city || '',
      country: selectedPatient.value.address?.country || ''
    },
    contact: {
      phone: selectedPatient.value.contact?.phone || '',
      email: selectedPatient.value.contact?.email || '',
      mobile: selectedPatient.value.contact?.mobile || ''
    },
    insurance: {
      number: selectedPatient.value.insurance?.number || '',
      type: selectedPatient.value.insurance?.type || '',
      provider: selectedPatient.value.insurance?.provider || ''
    }
  };
  showEditPatientModal.value = true;
};

const handleUpdatePatient = async () => {
  if (!selectedPatientId.value || !selectedPatient.value) return;
  
  if (!editPatientForm.value.givenNames.trim() || !editPatientForm.value.familyName.trim() || !editPatientForm.value.birthDate) {
    error.value = 'Bitte füllen Sie alle Pflichtfelder aus';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    const givenNamesArray = editPatientForm.value.givenNames
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const tagsArray = editPatientForm.value.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await updatePatient(
      selectedPatientId.value,
      {
        name: {
          given: givenNamesArray,
          family: editPatientForm.value.familyName.trim()
        },
        birthDate: editPatientForm.value.birthDate,
        gender: editPatientForm.value.gender || undefined,
        tags: tagsArray,
        address: editPatientForm.value.address,
        contact: editPatientForm.value.contact,
        insurance: editPatientForm.value.insurance
      },
      selectedPatient.value.version
    );

    showEditPatientModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Patienten';
  } finally {
    isLoading.value = false;
  }
};

const handleCreateVital = async () => {
  if (!selectedPatientId.value) return;

  isLoading.value = true;
  error.value = null;
  try {
    await createPatientVital(selectedPatientId.value, {
      bp_systolic: newVitalForm.value.bp_systolic,
      bp_diastolic: newVitalForm.value.bp_diastolic,
      hr: newVitalForm.value.hr,
      temperature: newVitalForm.value.temperature,
      spo2: newVitalForm.value.spo2,
      glucose: newVitalForm.value.glucose,
      bmi: newVitalForm.value.bmi
    });

    newVitalForm.value = {
      bp_systolic: undefined,
      bp_diastolic: undefined,
      hr: undefined,
      temperature: undefined,
      spo2: undefined,
      glucose: undefined,
      bmi: undefined
    };
    showVitalModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Erstellen der Vitalwerte';
  } finally {
    isLoading.value = false;
  }
};

const openEditVitalModal = (vital: PatientVitalHistory) => {
  editingVitalId.value = vital.id;
  newVitalForm.value = {
    bp_systolic: vital.bp_systolic,
    bp_diastolic: vital.bp_diastolic,
    hr: vital.hr,
    temperature: vital.temperature,
    spo2: vital.spo2,
    glucose: vital.glucose,
    bmi: vital.bmi
  };
  showEditVitalModal.value = true;
};

const handleUpdateVital = async () => {
  if (!selectedPatientId.value || !editingVitalId.value) return;

  isLoading.value = true;
  error.value = null;
  try {
    await updatePatientVital(selectedPatientId.value, editingVitalId.value, {
      bp_systolic: newVitalForm.value.bp_systolic,
      bp_diastolic: newVitalForm.value.bp_diastolic,
      hr: newVitalForm.value.hr,
      temperature: newVitalForm.value.temperature,
      spo2: newVitalForm.value.spo2,
      glucose: newVitalForm.value.glucose,
      bmi: newVitalForm.value.bmi
    });

    newVitalForm.value = {
      bp_systolic: undefined,
      bp_diastolic: undefined,
      hr: undefined,
      temperature: undefined,
      spo2: undefined,
      glucose: undefined,
      bmi: undefined
    };
    editingVitalId.value = null;
    showEditVitalModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Bearbeiten der Vitalwerte';
  } finally {
    isLoading.value = false;
  }
};

const handleDeleteVital = async (vitalId: string) => {
  if (!selectedPatientId.value) return;
  if (!confirm('Möchten Sie diese Vitalwerte wirklich löschen?')) return;

  isLoading.value = true;
  error.value = null;
  try {
    await deletePatientVital(selectedPatientId.value, vitalId);
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen der Vitalwerte';
  } finally {
    isLoading.value = false;
  }
};

const openEditAllergyModal = (allergy: any) => {
  editingAllergyId.value = allergy.id;
  newAllergyForm.value = {
    substance: allergy.substance,
    severity: allergy.severity
  };
  showEditAllergyModal.value = true;
};

const handleAddAllergy = async () => {
  if (!selectedPatientId.value || !newAllergyForm.value.substance.trim() || !newAllergyForm.value.severity.trim()) {
    error.value = 'Bitte füllen Sie alle Felder aus';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    await addPatientAllergy(selectedPatientId.value, {
      substance: newAllergyForm.value.substance.trim(),
      severity: newAllergyForm.value.severity.trim()
    });

    newAllergyForm.value = { substance: '', severity: '' };
    showAllergyModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Allergie';
  } finally {
    isLoading.value = false;
  }
};

const handleUpdateAllergy = async () => {
  if (!selectedPatientId.value || !editingAllergyId.value || !newAllergyForm.value.substance.trim() || !newAllergyForm.value.severity.trim()) {
    error.value = 'Bitte füllen Sie alle Felder aus';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    await updatePatientAllergy(selectedPatientId.value, editingAllergyId.value, {
      substance: newAllergyForm.value.substance.trim(),
      severity: newAllergyForm.value.severity.trim()
    });

    newAllergyForm.value = { substance: '', severity: '' };
    editingAllergyId.value = null;
    showEditAllergyModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Bearbeiten der Allergie';
  } finally {
    isLoading.value = false;
  }
};

const handleDeleteAllergy = async (allergyId: string) => {
  if (!selectedPatientId.value) return;
  if (!confirm('Möchten Sie diese Allergie wirklich löschen?')) return;

  isLoading.value = true;
  error.value = null;
  try {
    await deletePatientAllergy(selectedPatientId.value, allergyId);
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen der Allergie';
  } finally {
    isLoading.value = false;
  }
};

const openEditMedicationModal = (medication: any) => {
  editingMedicationId.value = medication.id;
  newMedicationForm.value = {
    name: medication.name,
    dose_morning: medication.dose_morning || '',
    dose_midday: medication.dose_midday || '',
    dose_evening: medication.dose_evening || '',
    dose_night: medication.dose_night || '',
    notes: medication.notes || ''
  };
  showEditMedicationModal.value = true;
};

const handleAddMedication = async () => {
  if (!selectedPatientId.value || !newMedicationForm.value.name.trim()) {
    error.value = 'Bitte geben Sie den Medikamentennamen ein';
    return;
  }

  // Mindestens eine Dosierung muss angegeben sein
  if (!newMedicationForm.value.dose_morning && !newMedicationForm.value.dose_midday && 
      !newMedicationForm.value.dose_evening && !newMedicationForm.value.dose_night) {
    error.value = 'Bitte geben Sie mindestens eine Dosierung an';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    await addPatientMedication(selectedPatientId.value, {
      name: newMedicationForm.value.name.trim(),
      dose_morning: newMedicationForm.value.dose_morning.trim() || undefined,
      dose_midday: newMedicationForm.value.dose_midday.trim() || undefined,
      dose_evening: newMedicationForm.value.dose_evening.trim() || undefined,
      dose_night: newMedicationForm.value.dose_night.trim() || undefined,
      notes: newMedicationForm.value.notes.trim() || undefined
    });

    newMedicationForm.value = { 
      name: '', 
      dose_morning: '', 
      dose_midday: '', 
      dose_evening: '', 
      dose_night: '',
      notes: ''
    };
    showMedicationModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Medikation';
  } finally {
    isLoading.value = false;
  }
};

const handleUpdateMedication = async () => {
  if (!selectedPatientId.value || !editingMedicationId.value || !newMedicationForm.value.name.trim()) {
    error.value = 'Bitte geben Sie den Medikamentennamen ein';
    return;
  }

  // Mindestens eine Dosierung muss angegeben sein
  if (!newMedicationForm.value.dose_morning && !newMedicationForm.value.dose_midday && 
      !newMedicationForm.value.dose_evening && !newMedicationForm.value.dose_night) {
    error.value = 'Bitte geben Sie mindestens eine Dosierung an';
    return;
  }

  isLoading.value = true;
  error.value = null;
  try {
    await updatePatientMedication(selectedPatientId.value, editingMedicationId.value, {
      name: newMedicationForm.value.name.trim(),
      dose_morning: newMedicationForm.value.dose_morning.trim() || undefined,
      dose_midday: newMedicationForm.value.dose_midday.trim() || undefined,
      dose_evening: newMedicationForm.value.dose_evening.trim() || undefined,
      dose_night: newMedicationForm.value.dose_night.trim() || undefined,
      notes: newMedicationForm.value.notes.trim() || undefined
    });

    newMedicationForm.value = { 
      name: '', 
      dose_morning: '', 
      dose_midday: '', 
      dose_evening: '', 
      dose_night: '',
      notes: ''
    };
    editingMedicationId.value = null;
    showEditMedicationModal.value = false;
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Bearbeiten der Medikation';
  } finally {
    isLoading.value = false;
  }
};

const handleDeleteMedication = async (medicationId: string) => {
  if (!selectedPatientId.value) return;
  if (!confirm('Möchten Sie diese Medikation wirklich löschen?')) return;

  isLoading.value = true;
  error.value = null;
  try {
    await deletePatientMedication(selectedPatientId.value, medicationId);
    await selectPatient(selectedPatientId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Fehler beim Löschen der Medikation';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadPatients();
});
</script>

<template>
  <div class="flex h-full gap-6">
    <!-- Links: Suchfeld + Patientenliste -->
    <section
      :class="[
        'flex flex-shrink-0 flex-col gap-4 transition-all duration-300 ease-in-out overflow-hidden',
        isSidebarCollapsed ? 'w-[60px]' : 'w-80'
      ]"
    >
      <!-- Eingeklappter Zustand: Schmaler Streifen -->
      <div v-if="isSidebarCollapsed" class="glass-card flex flex-col items-center gap-3 p-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/60 bg-white/40 text-steel-700 transition hover:border-accent-sky/60 hover:bg-white/60"
          @click="isSidebarCollapsed = false"
        >
          <PhList :size="20" weight="regular" />
        </button>
      </div>

      <!-- Ausgeklappter Zustand: Vollständige Sidebar -->
      <template v-else>
        <div class="glass-card flex flex-col gap-3 p-4">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Suche
            </label>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-3 py-1.5 text-xs font-medium text-accent-sky transition hover:bg-accent-sky/20"
              @click="showNewPatientModal = true"
            >
              <PhPlus :size="14" weight="regular" />
              Neu
            </button>
          </div>
          <div class="relative">
            <PhMagnifyingGlass
              :size="20"
              weight="regular"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Name, ID, Tag..."
              class="w-full rounded-xl border border-white/60 bg-white/80 px-10 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="glass-card flex flex-1 flex-col gap-3 overflow-hidden p-4">
          <label class="text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
            Patienten
          </label>
          <div class="flex-1 overflow-auto scrollbar-hide">
            <ul v-if="filteredPatients.length > 0" class="space-y-2">
              <li v-for="patient in filteredPatients" :key="patient.patient_id">
                <button
                  type="button"
                  :class="[
                    'w-full rounded-xl border px-3 py-3 text-left transition',
                    selectedPatientId === patient.patient_id
                      ? 'border-accent-sky/80 bg-white/80 shadow-[0_8px_16px_rgba(26,127,216,0.15)]'
                      : 'border-white/60 bg-white/40 hover:border-accent-sky/60 hover:bg-white/60'
                  ]"
                  @click="selectPatient(patient.patient_id)"
                >
                  <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/60">
                      <PhUser :size="18" weight="regular" class="text-accent-sky" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <!-- Nachname, Vorname (fett) -->
                      <div class="font-semibold text-sm text-steel-700">
                        <span>{{ patient.name.family || '' }}</span>
                        <span v-if="patient.name.given && patient.name.given.length > 0" class="ml-1">
                          {{ patient.name.given.join(' ') }}
                        </span>
                      </div>
                      <!-- Geschlecht-Icon + Geburtsdatum -->
                      <div class="mt-1 flex items-center gap-2 text-xs text-steel-400">
                        <component
                          v-if="getGenderIcon(patient.gender)"
                          :is="getGenderIcon(patient.gender)"
                          :size="14"
                          weight="regular"
                          class="text-accent-sky"
                        />
                        <span>{{ formatDate(patient.birth_date) }}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            </ul>
            <div v-else class="flex h-full items-center justify-center text-sm text-steel-400">
              {{ searchQuery ? 'Keine Patienten gefunden' : 'Keine Patienten vorhanden' }}
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- Rechts: Patient-Details -->
    <section class="flex flex-1 flex-col gap-6 overflow-auto scrollbar-hide">
      <div v-if="error" class="rounded-xl border border-accent-sky/40 bg-accent-sky/5 px-4 py-3 text-sm text-accent-sky">
        {{ error }}
      </div>

      <div v-if="selectedPatient" class="flex flex-col gap-6">
        <!-- Patient Header -->
        <div class="glass-card flex items-start justify-between gap-4 p-6">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-semibold text-steel-700">{{ formatName(selectedPatient.name) }}</h2>
              <component
                v-if="getGenderIcon(selectedPatient.gender)"
                :is="getGenderIcon(selectedPatient.gender)"
                :size="20"
                weight="regular"
                class="text-accent-sky"
              />
            </div>
            <p class="mt-1 text-sm text-steel-400">
              Geb. {{ formatDate(selectedPatient.birth_date) }} · ID {{ selectedPatient.patient_id }}
            </p>
            <div v-if="selectedPatient.tags.length > 0" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="tag in selectedPatient.tags"
                :key="tag"
                class="rounded-full border border-accent-sky/30 bg-accent-sky/10 px-3 py-1 text-xs font-medium text-accent-sky"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 text-xs text-steel-400">
              <PhLock :size="16" weight="regular" />
              <span>Nur Teamzugriff</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-3 py-1.5 text-sm font-medium text-accent-sky transition hover:bg-accent-sky/20"
              @click="openEditPatientModal"
            >
              <PhPencil :size="16" weight="regular" />
              Bearbeiten
            </button>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="glass-card flex flex-col gap-4 p-4">
          <div class="flex gap-2 border-b border-white/30">
            <button
              type="button"
              :class="[
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition',
                activeTab === 'overview'
                  ? 'border-b-2 border-accent-sky text-accent-sky'
                  : 'text-steel-400 hover:text-steel-700'
              ]"
              @click="activeTab = 'overview'"
            >
              <PhAddressBook :size="16" weight="regular" />
              Übersicht
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition',
                activeTab === 'vitals'
                  ? 'border-b-2 border-accent-sky text-accent-sky'
                  : 'text-steel-400 hover:text-steel-700'
              ]"
              @click="activeTab = 'vitals'"
            >
              <PhActivity :size="16" weight="regular" />
              Vitalwerte
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition',
                activeTab === 'medical'
                  ? 'border-b-2 border-accent-sky text-accent-sky'
                  : 'text-steel-400 hover:text-steel-700'
              ]"
              @click="activeTab = 'medical'"
            >
              <PhStethoscope :size="16" weight="regular" />
              Medizinisch
            </button>
            <button
              type="button"
              :class="[
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition',
                activeTab === 'history'
                  ? 'border-b-2 border-accent-sky text-accent-sky'
                  : 'text-steel-400 hover:text-steel-700'
              ]"
              @click="activeTab = 'history'"
            >
              <PhFileText :size="16" weight="regular" />
              Verlauf
            </button>
          </div>

          <!-- Tab Content -->
          <div class="min-h-[400px]">
            <!-- Tab: Übersicht -->
            <div v-if="activeTab === 'overview'" class="space-y-4">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <!-- Basis-Daten -->
                <div class="glass-card flex flex-col gap-3 p-4">
                  <h3 class="text-sm font-semibold text-steel-700">Basis-Daten</h3>
                  <div class="space-y-2 text-sm">
                    <div class="flex items-center justify-between">
                      <span class="text-steel-400">Geschlecht</span>
                      <div class="flex items-center gap-2">
                        <component
                          v-if="getGenderIcon(selectedPatient.gender)"
                          :is="getGenderIcon(selectedPatient.gender)"
                          :size="16"
                          weight="regular"
                          class="text-accent-sky"
                        />
                        <span class="font-medium text-steel-700">
                          {{ selectedPatient.gender === 'm' ? 'Männlich' : selectedPatient.gender === 'w' ? 'Weiblich' : selectedPatient.gender === 'd' ? 'Divers' : 'Nicht angegeben' }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-steel-400">Geburtsdatum</span>
                      <span class="font-medium text-steel-700">{{ formatDate(selectedPatient.birth_date) }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-steel-400">Patienten-ID</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.patient_id }}</span>
                    </div>
                    <div v-if="selectedPatient.tags.length > 0" class="mt-3 pt-3 border-t border-white/30">
                      <div class="text-xs font-medium uppercase tracking-[0.28em] text-steel-200 mb-2">Tags</div>
                      <div class="flex flex-wrap gap-1.5">
                        <span
                          v-for="tag in selectedPatient.tags"
                          :key="tag"
                          class="rounded-full border border-accent-sky/30 bg-accent-sky/10 px-2 py-0.5 text-xs font-medium text-accent-sky"
                        >
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Adresse -->
                <div class="glass-card flex flex-col gap-3 p-4">
                  <h3 class="text-sm font-semibold text-steel-700">Adresse</h3>
                  <div v-if="selectedPatient.address" class="space-y-1 text-sm text-steel-600">
                    <div v-if="selectedPatient.address.street">{{ selectedPatient.address.street }}</div>
                    <div v-if="selectedPatient.address.zip || selectedPatient.address.city">
                      {{ selectedPatient.address.zip }} {{ selectedPatient.address.city }}
                    </div>
                    <div v-if="selectedPatient.address.country">{{ selectedPatient.address.country }}</div>
                  </div>
                  <div v-else class="text-sm text-steel-400">Keine Adresse hinterlegt</div>
                </div>

                <!-- Kontakt -->
                <div class="glass-card flex flex-col gap-3 p-4">
                  <h3 class="text-sm font-semibold text-steel-700">Kontakt</h3>
                  <div v-if="selectedPatient.contact" class="space-y-2 text-sm">
                    <div v-if="selectedPatient.contact.phone" class="flex items-center justify-between">
                      <span class="text-steel-400">Telefon</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.contact.phone }}</span>
                    </div>
                    <div v-if="selectedPatient.contact.mobile" class="flex items-center justify-between">
                      <span class="text-steel-400">Mobil</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.contact.mobile }}</span>
                    </div>
                    <div v-if="selectedPatient.contact.email" class="flex items-center justify-between">
                      <span class="text-steel-400">E-Mail</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.contact.email }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-steel-400">Keine Kontaktdaten hinterlegt</div>
                </div>

                <!-- Versicherung -->
                <div class="glass-card flex flex-col gap-3 p-4">
                  <h3 class="text-sm font-semibold text-steel-700">Versicherung</h3>
                  <div v-if="selectedPatient.insurance" class="space-y-2 text-sm">
                    <div v-if="selectedPatient.insurance.number" class="flex items-center justify-between">
                      <span class="text-steel-400">Versicherungsnummer</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.insurance.number }}</span>
                    </div>
                    <div v-if="selectedPatient.insurance.type" class="flex items-center justify-between">
                      <span class="text-steel-400">Typ</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.insurance.type }}</span>
                    </div>
                    <div v-if="selectedPatient.insurance.provider" class="flex items-center justify-between">
                      <span class="text-steel-400">Versicherer</span>
                      <span class="font-medium text-steel-700">{{ selectedPatient.insurance.provider }}</span>
                    </div>
                  </div>
                  <div v-else class="text-sm text-steel-400">Keine Versicherungsdaten hinterlegt</div>
                </div>
              </div>
            </div>

            <!-- Tab: Vitalwerte -->
            <div v-if="activeTab === 'vitals'" class="space-y-4">
              <!-- Letzte Vitalwerte -->
              <div class="glass-card flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-steel-700">Letzte Vitalwerte</h3>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-2 py-1 text-xs font-medium text-accent-sky transition hover:bg-accent-sky/20"
                    @click="showVitalModal = true"
                  >
                    <PhPlus :size="12" weight="regular" />
                    Hinzufügen
                  </button>
                </div>
                <div v-if="selectedPatient.vitals_latest" class="grid grid-cols-2 gap-3 text-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">RR</span>
                    <span class="font-medium text-steel-700">
                      {{ selectedPatient.vitals_latest.bp_systolic && selectedPatient.vitals_latest.bp_diastolic
                        ? `${selectedPatient.vitals_latest.bp_systolic}/${selectedPatient.vitals_latest.bp_diastolic} mmHg`
                        : '–' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">Puls</span>
                    <span class="font-medium text-steel-700">{{ selectedPatient.vitals_latest.hr ? `${selectedPatient.vitals_latest.hr} bpm` : '–' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">Temperatur</span>
                    <span class="font-medium text-steel-700">{{ selectedPatient.vitals_latest.temperature ? `${selectedPatient.vitals_latest.temperature}°C` : '–' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">SpO2</span>
                    <span class="font-medium text-steel-700">{{ selectedPatient.vitals_latest.spo2 ? `${selectedPatient.vitals_latest.spo2}%` : '–' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">Zucker</span>
                    <span class="font-medium text-steel-700">{{ selectedPatient.vitals_latest.glucose ? `${selectedPatient.vitals_latest.glucose} mg/dl` : '–' }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-steel-400">BMI</span>
                    <span class="font-medium text-steel-700">{{ selectedPatient.vitals_latest.bmi || '–' }}</span>
                  </div>
                  <div v-if="selectedPatient.vitals_latest.updated_at" class="col-span-2 mt-2 text-[10px] text-steel-400">
                    aktualisiert {{ formatDateTime(selectedPatient.vitals_latest.updated_at) }}
                  </div>
                </div>
                <div v-else class="text-sm text-steel-400">Keine Vitalwerte hinterlegt</div>
              </div>

              <!-- Fieberkurve -->
              <div v-if="activeVitalsHistory.length > 0" class="glass-card flex flex-col gap-4 p-6">
                <h3 class="text-sm font-semibold text-steel-700">Fieberkurve</h3>
                <div class="h-80">
                  <Line :data="chartData" :options="chartOptions" />
                </div>
              </div>

              <!-- Historie -->
              <div v-if="activeVitalsHistory.length > 0" class="glass-card flex flex-col gap-3 p-4">
                <h3 class="text-sm font-semibold text-steel-700">Historie</h3>
                <div class="max-h-60 space-y-1.5 overflow-auto scrollbar-hide">
                  <div
                    v-for="vital in activeVitalsHistory.slice().reverse()"
                    :key="vital.id"
                    class="flex items-center justify-between rounded-lg border border-white/40 bg-white/20 px-3 py-2 text-xs"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-steel-400">{{ formatDateTime(vital.recordedAt) }}</span>
                      <div class="flex items-center gap-2 text-steel-600">
                        <span v-if="vital.bp_systolic && vital.bp_diastolic">RR: {{ vital.bp_systolic }}/{{ vital.bp_diastolic }}</span>
                        <span v-if="vital.hr">Puls: {{ vital.hr }}</span>
                        <span v-if="vital.temperature">Temp: {{ vital.temperature }}°C</span>
                        <span v-if="vital.spo2">SpO2: {{ vital.spo2 }}%</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="text-steel-400 transition hover:text-red-600"
                      @click="handleDeleteVital(vital.id)"
                    >
                      <PhTrash :size="12" weight="regular" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab: Medizinisch -->
            <div v-if="activeTab === 'medical'" class="space-y-4">
              <!-- Allergien -->
              <div class="glass-card flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-steel-700">Allergien</h3>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-2 py-1 text-xs font-medium text-accent-sky transition hover:bg-accent-sky/20"
                    @click="showAllergyModal = true"
                  >
                    <PhPlus :size="12" weight="regular" />
                    Hinzufügen
                  </button>
                </div>
                <div v-if="activeAllergies.length > 0" class="space-y-2">
                  <div
                    v-for="allergy in activeAllergies"
                    :key="allergy.id || allergy.substance"
                    class="flex items-center justify-between rounded-lg border border-white/40 bg-white/20 px-3 py-2 text-sm"
                  >
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-steel-700">{{ allergy.substance }}</span>
                      <span class="text-xs text-amber-600">{{ allergy.severity }}</span>
                    </div>
                    <button
                      v-if="allergy.id"
                      type="button"
                      class="text-steel-400 transition hover:text-red-600"
                      @click="handleDeleteAllergy(allergy.id)"
                    >
                      <PhTrash :size="12" weight="regular" />
                    </button>
                  </div>
                </div>
                <div v-else class="text-sm text-steel-400">Keine Allergien hinterlegt</div>
              </div>

              <!-- Medikation -->
              <div class="glass-card flex flex-col gap-3 p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-steel-700">Medikation</h3>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-2 py-1 text-xs font-medium text-accent-sky transition hover:bg-accent-sky/20"
                    @click="showMedicationModal = true"
                  >
                    <PhPlus :size="12" weight="regular" />
                    Hinzufügen
                  </button>
                </div>
                <div v-if="activeMedications.length > 0" class="space-y-3">
                  <div
                    v-for="med in activeMedications"
                    :key="med.id || med.name"
                    class="rounded-lg border border-white/40 bg-white/20 p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-sm text-steel-700 mb-2">{{ med.name }}</div>
                        <!-- Neue Struktur mit Tageszeiten -->
                        <div v-if="med.dose_morning || med.dose_midday || med.dose_evening || med.dose_night" class="flex flex-wrap gap-3 text-xs">
                          <span v-if="med.dose_morning" class="text-steel-600">
                            <span class="text-steel-400">Morgens:</span> {{ med.dose_morning }}
                          </span>
                          <span v-if="med.dose_midday" class="text-steel-600">
                            <span class="text-steel-400">Mittags:</span> {{ med.dose_midday }}
                          </span>
                          <span v-if="med.dose_evening" class="text-steel-600">
                            <span class="text-steel-400">Abends:</span> {{ med.dose_evening }}
                          </span>
                          <span v-if="med.dose_night" class="text-steel-600">
                            <span class="text-steel-400">Nachts:</span> {{ med.dose_night }}
                          </span>
                        </div>
                        <!-- Legacy: Alte Struktur mit einfacher Dosis -->
                        <div v-else-if="med.dose" class="text-xs text-steel-600">
                          <span class="text-steel-400">Dosis:</span> {{ med.dose }}
                        </div>
                        <div v-if="med.notes" class="mt-2 text-xs text-steel-500 italic">
                          {{ med.notes }}
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button
                          v-if="med.id"
                          type="button"
                          class="flex-shrink-0 text-steel-400 transition hover:text-accent-sky"
                          @click="openEditMedicationModal(med)"
                        >
                          <PhPencil :size="14" weight="regular" />
                        </button>
                        <button
                          v-if="med.id"
                          type="button"
                          class="flex-shrink-0 text-steel-400 transition hover:text-red-600"
                          @click="handleDeleteMedication(med.id)"
                        >
                          <PhTrash :size="14" weight="regular" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-steel-400">Keine Dauermedikation</div>
              </div>
            </div>

            <!-- Tab: Verlauf -->
            <div v-if="activeTab === 'history'" class="space-y-4">
              <div class="glass-card flex flex-col gap-4 p-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-steel-700">Verlauf & Notizen</h3>
                  <button
                    type="button"
                    class="inline-flex items-center gap-2 rounded-xl border border-accent-sky/30 bg-accent-sky/10 px-3 py-1.5 text-sm font-medium text-accent-sky transition hover:bg-accent-sky/20"
                    @click="showNoteModal = true"
                  >
                    <PhPlus :size="16" weight="regular" />
                    Neue Notiz
                  </button>
                </div>

                <!-- Suche, Filter und Sortierung -->
                <div class="flex flex-col gap-3">
                  <!-- Suche -->
                  <div class="relative">
                    <PhMagnifyingGlass
                      :size="18"
                      weight="regular"
                      class="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400"
                    />
                    <input
                      v-model="historySearchQuery"
                      type="text"
                      placeholder="Suche im Verlauf..."
                      class="w-full rounded-xl border border-white/60 bg-white/80 px-10 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                    />
                  </div>

                  <!-- Filter und Sortierung -->
                  <div class="flex flex-wrap items-center gap-2">
                    <!-- Filter -->
                    <div class="flex items-center gap-2">
                      <PhFunnelSimple :size="16" weight="regular" class="text-steel-400" />
                      <select
                        v-model="historyFilterType"
                        class="rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                      >
                        <option value="all">Alle</option>
                        <option value="note">Notizen</option>
                        <option value="encounter">Kontakte</option>
                        <option value="audit">Änderungen</option>
                      </select>
                    </div>

                    <!-- Sortierung -->
                    <div class="flex items-center gap-2">
                      <PhArrowsDownUp :size="16" weight="regular" class="text-steel-400" />
                      <select
                        v-model="historySortBy"
                        class="rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                      >
                        <option value="date-desc">Neueste zuerst</option>
                        <option value="date-asc">Älteste zuerst</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Verlaufsliste -->
                <div class="max-h-[500px] space-y-3 overflow-auto scrollbar-hide">
                  <div
                    v-for="item in filteredHistoryItems"
                    :key="`${item.type}-${item.id}`"
                    :class="[
                      'rounded-xl border p-3',
                      item.type === 'note' ? 'border-white/60 bg-white/30' :
                      item.type === 'encounter' ? 'border-white/60 bg-white/40' :
                      'border-white/50 bg-white/20'
                    ]"
                  >
                    <div class="flex items-start gap-3">
                      <component
                        :is="item.icon"
                        :size="18"
                        weight="regular"
                        :class="item.color"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-medium text-steel-700">{{ item.title }}</span>
                          <span class="text-xs text-steel-400">{{ formatDateTime(item.timestamp) }}</span>
                          <span v-if="item.author" class="text-xs text-steel-400">· {{ item.author }}</span>
                        </div>
                        <div v-if="item.content" class="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-steel-600">
                          {{ item.content }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="filteredHistoryItems.length === 0" class="text-center text-sm text-steel-400 py-8">
                    {{ historySearchQuery || historyFilterType !== 'all' ? 'Keine Einträge gefunden' : 'Keine Einträge vorhanden' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!isLoading" class="flex h-full items-center justify-center text-sm text-steel-400">
        Wählen Sie einen Patienten aus
      </div>
    </section>

    <!-- Note Modal -->
    <Teleport to="body">
      <div
        v-if="showNoteModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        @click.self="showNoteModal = false"
      >
        <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Notiz hinzufügen</h3>
        <p class="mb-4 text-xs text-steel-400">Notiz für {{ selectedPatient ? formatName(selectedPatient.name) : 'Patient' }}</p>
        <textarea
          v-model="newNoteText"
          rows="6"
          placeholder="Freitext..."
          class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showNoteModal = false; newNoteText = ''"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="!newNoteText.trim() || isLoading"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleSaveNote"
          >
            Speichern
          </button>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- New Patient Modal -->
    <Teleport to="body">
      <div
        v-if="showNewPatientModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        @click.self="showNewPatientModal = false"
      >
        <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Neuen Patienten hinzufügen</h3>
        <p class="mb-4 text-xs text-steel-400">Bitte füllen Sie alle Pflichtfelder aus</p>
        
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Vorname(n) <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newPatientForm.givenNames"
              type="text"
              placeholder="z.B. Max, Maria Anna (kommagetrennt)"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
            <p class="mt-1 text-xs text-steel-400">Mehrere Vornamen durch Komma trennen</p>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Nachname <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newPatientForm.familyName"
              type="text"
              placeholder="z.B. Mustermann"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Geburtsdatum <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newPatientForm.birthDate"
              type="date"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Tags
            </label>
            <input
              v-model="newPatientForm.tags"
              type="text"
              placeholder="z.B. Hausbesuch, Hypertonie (kommagetrennt)"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
            <p class="mt-1 text-xs text-steel-400">Mehrere Tags durch Komma trennen (optional)</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showNewPatientModal = false; newPatientForm = { givenNames: '', familyName: '', birthDate: '', tags: '' }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !newPatientForm.givenNames.trim() || !newPatientForm.familyName.trim() || !newPatientForm.birthDate"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleCreatePatient"
          >
            {{ isLoading ? 'Wird erstellt...' : 'Erstellen' }}
          </button>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Patient Modal -->
    <Teleport to="body">
      <div
        v-if="showEditPatientModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 overflow-auto"
        @click.self="showEditPatientModal = false"
      >
        <div class="glass-card w-full max-w-2xl p-6 my-8">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Patient bearbeiten</h3>
        <p class="mb-4 text-xs text-steel-400">Bearbeiten Sie die Patientendaten</p>
        
        <div class="space-y-4 max-h-[70vh] overflow-auto scrollbar-hide pr-2">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Vorname(n) <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="editPatientForm.givenNames"
                type="text"
                placeholder="z.B. Max, Maria Anna"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Nachname <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="editPatientForm.familyName"
                type="text"
                placeholder="z.B. Mustermann"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Geburtsdatum <span class="text-accent-sky">*</span>
              </label>
              <input
                v-model="editPatientForm.birthDate"
                type="date"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
                Geschlecht
              </label>
              <select
                v-model="editPatientForm.gender"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              >
                <option value="">Nicht angegeben</option>
                <option value="m">Männlich</option>
                <option value="w">Weiblich</option>
                <option value="d">Divers</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Tags
            </label>
            <input
              v-model="editPatientForm.tags"
              type="text"
              placeholder="z.B. Hausbesuch, Hypertonie (kommagetrennt)"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>

          <div class="border-t border-white/30 pt-4">
            <h4 class="mb-3 text-sm font-semibold text-steel-700">Adresse</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Straße</label>
                <input
                  v-model="editPatientForm.address.street"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">PLZ</label>
                <input
                  v-model="editPatientForm.address.zip"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Ort</label>
                <input
                  v-model="editPatientForm.address.city"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Land</label>
                <input
                  v-model="editPatientForm.address.country"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div class="border-t border-white/30 pt-4">
            <h4 class="mb-3 text-sm font-semibold text-steel-700">Kontakt</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Telefon</label>
                <input
                  v-model="editPatientForm.contact.phone"
                  type="tel"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Mobil</label>
                <input
                  v-model="editPatientForm.contact.mobile"
                  type="tel"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">E-Mail</label>
                <input
                  v-model="editPatientForm.contact.email"
                  type="email"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div class="border-t border-white/30 pt-4">
            <h4 class="mb-3 text-sm font-semibold text-steel-700">Versicherung</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Versicherungsnummer</label>
                <input
                  v-model="editPatientForm.insurance.number"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Typ</label>
                <input
                  v-model="editPatientForm.insurance.type"
                  type="text"
                  placeholder="z.B. GKV, PKV"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div class="col-span-2">
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Versicherer</label>
                <input
                  v-model="editPatientForm.insurance.provider"
                  type="text"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showEditPatientModal = false"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !editPatientForm.givenNames.trim() || !editPatientForm.familyName.trim() || !editPatientForm.birthDate"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleUpdatePatient"
          >
            {{ isLoading ? 'Wird gespeichert...' : 'Speichern' }}
          </button>
        </div>
        </div>
      </div>
    </Teleport>

    <!-- Vital Modal -->
    <div
      v-if="showVitalModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showVitalModal = false"
    >
      <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Vitalwerte hinzufügen</h3>
        <p class="mb-4 text-xs text-steel-400">Erfassen Sie die Vitalwerte des Patienten</p>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Systolisch</label>
              <input
                v-model.number="newVitalForm.bp_systolic"
                type="number"
                placeholder="z.B. 120"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Diastolisch</label>
              <input
                v-model.number="newVitalForm.bp_diastolic"
                type="number"
                placeholder="z.B. 80"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Puls (bpm)</label>
              <input
                v-model.number="newVitalForm.hr"
                type="number"
                placeholder="z.B. 72"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Temperatur (°C)</label>
              <input
                v-model.number="newVitalForm.temperature"
                type="number"
                step="0.1"
                placeholder="z.B. 36.5"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">SpO2 (%)</label>
              <input
                v-model.number="newVitalForm.spo2"
                type="number"
                placeholder="z.B. 98"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Zucker (mg/dl)</label>
              <input
                v-model.number="newVitalForm.glucose"
                type="number"
                placeholder="z.B. 95"
                class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
              />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">BMI</label>
            <input
              v-model.number="newVitalForm.bmi"
              type="number"
              step="0.1"
              placeholder="z.B. 22.5"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showVitalModal = false; newVitalForm = { bp_systolic: undefined, bp_diastolic: undefined, hr: undefined, temperature: undefined, spo2: undefined, glucose: undefined, bmi: undefined }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleCreateVital"
          >
            Speichern
          </button>
        </div>
          </div>
        </div>

        <!-- Edit Vital Modal -->
        <div
          v-if="showEditVitalModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          @click.self="showEditVitalModal = false"
        >
          <div class="glass-card w-full max-w-lg p-6">
            <h3 class="mb-1 text-lg font-semibold text-steel-700">Vitalwerte bearbeiten</h3>
            <p class="mb-4 text-xs text-steel-400">Bearbeiten Sie die Vitalwerte</p>
            
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Systolisch</label>
                  <input
                    v-model.number="newVitalForm.bp_systolic"
                    type="number"
                    placeholder="z.B. 120"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">RR Diastolisch</label>
                  <input
                    v-model.number="newVitalForm.bp_diastolic"
                    type="number"
                    placeholder="z.B. 80"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Puls (bpm)</label>
                  <input
                    v-model.number="newVitalForm.hr"
                    type="number"
                    placeholder="z.B. 72"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Temperatur (°C)</label>
                  <input
                    v-model.number="newVitalForm.temperature"
                    type="number"
                    step="0.1"
                    placeholder="z.B. 36.5"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">SpO2 (%)</label>
                  <input
                    v-model.number="newVitalForm.spo2"
                    type="number"
                    placeholder="z.B. 98"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">Zucker (mg/dl)</label>
                  <input
                    v-model.number="newVitalForm.glucose"
                    type="number"
                    placeholder="z.B. 95"
                    class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">BMI</label>
                <input
                  v-model.number="newVitalForm.bmi"
                  type="number"
                  step="0.1"
                  placeholder="z.B. 22.5"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
                @click="showEditVitalModal = false; editingVitalId = null; newVitalForm = { bp_systolic: undefined, bp_diastolic: undefined, hr: undefined, temperature: undefined, spo2: undefined, glucose: undefined, bmi: undefined }"
              >
                Abbrechen
              </button>
              <button
                type="button"
                :disabled="isLoading"
                class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                @click="handleUpdateVital"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>

        <!-- Allergy Modal (Hinzufügen) -->
        <Teleport to="body">
          <div
            v-if="showAllergyModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            @click.self="showAllergyModal = false"
          >
            <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Allergie hinzufügen</h3>
        <p class="mb-4 text-xs text-steel-400">Fügen Sie eine Allergie hinzu</p>
        
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Substanz <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newAllergyForm.substance"
              type="text"
              placeholder="z.B. Penicillin"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Schweregrad <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newAllergyForm.severity"
              type="text"
              placeholder="z.B. leicht, mittel, schwer"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showAllergyModal = false; newAllergyForm = { substance: '', severity: '' }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !newAllergyForm.substance.trim() || !newAllergyForm.severity.trim()"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleAddAllergy"
          >
            Speichern
          </button>
        </div>
        </div>
          </div>
        </Teleport>

        <!-- Edit Allergy Modal -->
        <Teleport to="body">
          <div
            v-if="showEditAllergyModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            @click.self="showEditAllergyModal = false"
          >
            <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Allergie bearbeiten</h3>
        <p class="mb-4 text-xs text-steel-400">Bearbeiten Sie die Allergie</p>
        
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Substanz <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newAllergyForm.substance"
              type="text"
              placeholder="z.B. Penicillin"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Schweregrad <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newAllergyForm.severity"
              type="text"
              placeholder="z.B. leicht, mittel, schwer"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showEditAllergyModal = false; editingAllergyId = null; newAllergyForm = { substance: '', severity: '' }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !newAllergyForm.substance.trim() || !newAllergyForm.severity.trim()"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleUpdateAllergy"
          >
            Speichern
          </button>
        </div>
        </div>
      </div>
    </Teleport>

        <!-- Medication Modal (Hinzufügen) -->
        <Teleport to="body">
          <div
            v-if="showMedicationModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            @click.self="showMedicationModal = false"
          >
            <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Medikation hinzufügen</h3>
        <p class="mb-4 text-xs text-steel-400">Fügen Sie eine Medikation hinzu</p>
        
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Name <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newMedicationForm.name"
              type="text"
              placeholder="z.B. Aspirin"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
          
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Dosierung
            </label>
            <p class="mb-2 text-xs text-steel-400">Mindestens eine Dosierung angeben</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-steel-400">Morgens</label>
                <input
                  v-model="newMedicationForm.dose_morning"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Mittags</label>
                <input
                  v-model="newMedicationForm.dose_midday"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Abends</label>
                <input
                  v-model="newMedicationForm.dose_evening"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Nachts</label>
                <input
                  v-model="newMedicationForm.dose_night"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Hinweise
            </label>
            <textarea
              v-model="newMedicationForm.notes"
              rows="2"
              placeholder="Zusätzliche Hinweise zur Medikation..."
              class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showMedicationModal = false; editingMedicationId = null; newMedicationForm = { name: '', dose_morning: '', dose_midday: '', dose_evening: '', dose_night: '', notes: '' }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !newMedicationForm.name.trim() || (!newMedicationForm.dose_morning && !newMedicationForm.dose_midday && !newMedicationForm.dose_evening && !newMedicationForm.dose_night)"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleAddMedication"
          >
            Speichern
          </button>
        </div>
        </div>
          </div>
        </Teleport>

        <!-- Edit Medication Modal -->
        <Teleport to="body">
          <div
            v-if="showEditMedicationModal"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
            @click.self="showEditMedicationModal = false"
          >
            <div class="glass-card w-full max-w-lg p-6">
        <h3 class="mb-1 text-lg font-semibold text-steel-700">Medikation bearbeiten</h3>
        <p class="mb-4 text-xs text-steel-400">Bearbeiten Sie die Medikation</p>
        
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Name <span class="text-accent-sky">*</span>
            </label>
            <input
              v-model="newMedicationForm.name"
              type="text"
              placeholder="z.B. Aspirin"
              class="w-full rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
          
          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Dosierung
            </label>
            <p class="mb-2 text-xs text-steel-400">Mindestens eine Dosierung angeben</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs text-steel-400">Morgens</label>
                <input
                  v-model="newMedicationForm.dose_morning"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Mittags</label>
                <input
                  v-model="newMedicationForm.dose_midday"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Abends</label>
                <input
                  v-model="newMedicationForm.dose_evening"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-steel-400">Nachts</label>
                <input
                  v-model="newMedicationForm.dose_night"
                  type="text"
                  placeholder="z.B. 100mg"
                  class="w-full rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium uppercase tracking-[0.28em] text-steel-200">
              Hinweise
            </label>
            <textarea
              v-model="newMedicationForm.notes"
              rows="2"
              placeholder="Zusätzliche Hinweise zur Medikation..."
              class="w-full resize-none rounded-xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-steel-700 shadow-[0_8px_16px_rgba(12,31,47,0.1)] outline-none transition focus:border-accent-sky/80 focus:ring-2 focus:ring-accent-sky/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-xl border border-white/60 bg-white/40 px-4 py-2 text-sm font-medium text-steel-700 transition hover:bg-white/60"
            @click="showEditMedicationModal = false; editingMedicationId = null; newMedicationForm = { name: '', dose_morning: '', dose_midday: '', dose_evening: '', dose_night: '', notes: '' }"
          >
            Abbrechen
          </button>
          <button
            type="button"
            :disabled="isLoading || !newMedicationForm.name.trim() || (!newMedicationForm.dose_morning && !newMedicationForm.dose_midday && !newMedicationForm.dose_evening && !newMedicationForm.dose_night)"
            class="rounded-xl bg-gradient-to-br from-accent-sky to-accent-teal px-4 py-2 text-sm font-semibold text-white shadow-pane transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleUpdateMedication"
          >
            Speichern
          </button>
        </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

