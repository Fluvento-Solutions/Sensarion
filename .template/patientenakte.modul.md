import React, { useMemo, useState } from "react";
import { Search, Plus, FileText, Activity, Shield, Calendar, User, Stethoscope, Lock } from "lucide-react";
import { motion } from "framer-motion";

// --- Minimal, pretty, and modular: Patient list + details + notes (mocked) ---
// Tailwind required. Uses a clean card layout with soft shadows and rounded corners.
// This is UI-only (no backend). Replace the mock fetchers with your API later.

// Mock data (replace with API calls)
const MOCK_PATIENTS = [
  {
    patient_id: "p-001",
    name: { given: ["Mara"], family: "Kern" },
    birth_date: "1987-03-05",
    tags: ["Hausbesuch", "Hypertonie"],
    vitals_latest: { bp: "135/85", hr: 72, bmi: 27.1, updated_at: "2025-11-10T09:00:00Z" },
    allergies: [{ substance: "Penicillin", severity: "moderate" }],
    medications: [{ name: "Ramipril 5 mg", dose: "1-0-0" }],
    notes: [
      { note_id: "n1", created_at: "2025-11-12T16:50:00Z", author: "Dr. F.", text: "Anamnese kurz, keine Akutbeschwerden." },
    ],
    encounters: [
      { encounter_id: "e42", date: "2025-11-12", location: "Praxis", reason: "Kontrolle", summary: "Stabil." },
    ],
  },
  {
    patient_id: "p-002",
    name: { given: ["Lukas"], family: "Behr" },
    birth_date: "1991-09-17",
    tags: ["Privat", "Allergie"],
    vitals_latest: { bp: "120/78", hr: 64, bmi: 22.8, updated_at: "2025-11-01T11:00:00Z" },
    allergies: [{ substance: "Erdnuss", severity: "severe" }],
    medications: [],
    notes: [
      { note_id: "n10", created_at: "2025-11-01T11:12:00Z", author: "MFA Kim", text: "Telefonische Terminbestätigung." }
    ],
    encounters: [
      { encounter_id: "e55", date: "2025-11-01", location: "Praxis", reason: "Erstvorstellung", summary: "Allergieanamnese begonnen." }
    ],
  },
];

function classNames(...xs: (string | false | undefined)[]) { return xs.filter(Boolean).join(" "); }

function formatName(n: { given?: string[]; family?: string }) {
  const given = (n.given || []).join(" ");
  return `${given} ${n.family || ""}`.trim();
}

function prettyDate(s?: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export default function PatientsMVP() {
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | null>(MOCK_PATIENTS[0].patient_id);
  const [newNote, setNewNote] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const patients = useMemo(() => {
    const needle = q.toLowerCase();
    return MOCK_PATIENTS.filter(p =>
      formatName(p.name).toLowerCase().includes(needle) ||
      p.patient_id.toLowerCase().includes(needle) ||
      (p.tags || []).join(" ").toLowerCase().includes(needle)
    );
  }, [q]);

  const active = useMemo(() => patients.find(p => p.patient_id === activeId) || patients[0] || null, [patients, activeId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <motion.div initial={{opacity:0, y:-6}} animate={{opacity:1, y:0}} className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-emerald-400"/>
            <span className="font-semibold tracking-wide">Sensarion · Patientenakte (MVP)</span>
          </motion.div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4"/>
            <span>Datenschutz‑first · PWA‑ready</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List + Search */}
        <section className="lg:col-span-1">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-lg">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400"/>
              <input
                placeholder="Suchen: Name, ID, Tag…"
                value={q}
                onChange={e => setQ(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/60"
              />
            </div>

            <ul className="mt-3 divide-y divide-slate-800">
              {patients.map(p => (
                <li key={p.patient_id}>
                  <button
                    onClick={() => setActiveId(p.patient_id)}
                    className={classNames(
                      "w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-slate-800/40",
                      active?.patient_id === p.patient_id && "bg-slate-800/60"
                    )}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 grid place-items-center">
                      <User className="w-5 h-5 text-emerald-400"/>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{formatName(p.name)}</div>
                        <span className="text-xs text-slate-400">{p.patient_id}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(p.tags || []).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{t}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: Detail */}
        <section className="lg:col-span-2 space-y-6">
          {active ? (
            <>
              {/* Patient Header */}
              <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-2xl font-semibold">{formatName(active.name)}</div>
                    <div className="mt-1 text-sm text-slate-400">Geb. {active.birth_date} · ID {active.patient_id}</div>
                    <div className="mt-2 flex gap-2">
                      {(active.tags || []).map(t => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Lock className="w-4 h-4"/>
                    <span>Nur Teamzugriff</span>
                  </div>
                </div>
              </motion.div>

              {/* Quick facts grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="Letzte Vitalwerte" icon={<Activity className="w-4 h-4"/>}>
                  <KV k="RR" v={active.vitals_latest?.bp || "–"} />
                  <KV k="Puls" v={String(active.vitals_latest?.hr ?? "–")} />
                  <KV k="BMI" v={String(active.vitals_latest?.bmi ?? "–")} />
                  <div className="text-[10px] text-slate-400 mt-2">aktualisiert {prettyDate(active.vitals_latest?.updated_at)}</div>
                </Card>
                <Card title="Allergien" icon={<Shield className="w-4 h-4"/>}>
                  {(active.allergies || []).length ? (
                    <ul className="text-sm space-y-1">
                      {active.allergies!.map(a => (
                        <li key={a.substance} className="flex items-center justify-between">
                          <span>{a.substance}</span>
                          <span className="text-xs text-amber-300/90">{a.severity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty tiny text="Keine Allergien hinterlegt"/>}
                </Card>
                <Card title="Medikation" icon={<Stethoscope className="w-4 h-4"/>}>
                  {(active.medications || []).length ? (
                    <ul className="text-sm space-y-1">
                      {active.medications!.map((m, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span>{m.name}</span>
                          <span className="text-xs text-slate-400">{m.dose}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <Empty tiny text="Keine Dauermedikation"/>}
                </Card>
              </div>

              {/* Timeline */}
              <Card title="Verlauf & Notizen" icon={<FileText className="w-4 h-4"/>}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-400 flex items-center gap-2"><Calendar className="w-4 h-4"/>chronologisch</div>
                  <button
                    onClick={() => setShowCompose(true)}
                    className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                  >
                    <Plus className="w-4 h-4"/> Neue Notiz
                  </button>
                </div>

                <ul className="space-y-3">
                  {(active.encounters || []).map(enc => (
                    <li key={enc.encounter_id} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700">
                      <div className="text-sm font-medium">{enc.date} · {enc.reason}</div>
                      <div className="text-xs text-slate-400">Ort: {enc.location}</div>
                      <div className="mt-1 text-sm">{enc.summary}</div>
                    </li>
                  ))}

                  {(active.notes || []).map(n => (
                    <li key={n.note_id} className="p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                      <div className="text-xs text-slate-400">{prettyDate(n.created_at)} · {n.author}</div>
                      <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{n.text}</div>
                    </li>
                  ))}
                </ul>

                {/* Compose Note Modal (very light) */}
                {showCompose && (
                  <div className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-4">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-4">
                      <div className="text-lg font-semibold mb-1">Notiz hinzufügen</div>
                      <div className="text-xs text-slate-400 mb-3">Wird lokal gespeichert · später via API synchronisiert</div>
                      <textarea
                        rows={6}
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Freitext…"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500/60"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <button onClick={() => { setShowCompose(false); setNewNote(""); }} className="px-3 py-1.5 text-sm rounded-xl border border-slate-700 hover:bg-slate-800">Abbrechen</button>
                        <button onClick={() => { /* TODO: call API */ setShowCompose(false); setNewNote(""); }} className="px-3 py-1.5 text-sm rounded-xl bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400">Speichern</button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Empty text="Keine Patient:innen gefunden"/>
          )}
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Sensarion · MVP · Alle Daten lokal (Demo)
      </footer>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div className="font-medium">{title}</div>
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-slate-300">{k}</span>
      <span className="text-slate-100 font-medium">{v}</span>
    </div>
  );
}

function Empty({ text, tiny }: { text: string; tiny?: boolean }) {
  return (
    <div className={classNames("text-center text-slate-400", tiny ? "text-xs" : "text-sm")}>{text}</div>
  );
}

Hab dir eine schlanke, hübsche **Frontend-Grundlage** für die Patientenakte auf die Canvas gelegt – Liste, Suche, Detail, Vital-Karten, Allergien, Medikation, Verlauf & Notizen (mit Compose-Modal). Alles UI-only, perfekt um später echte API-Calls einzuhängen.

Hier noch das **allernötigste Backend-Fundament** (gut händelbar, modular erweiterbar):

### Postgres (minimal & robust)

```sql
-- patients (Kern)
create table patients (
  patient_id uuid primary key default gen_random_uuid(),
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name jsonb not null,             -- { given:[], family, ... }
  birth_date date not null,
  tags text[] default '{}',
  vitals_latest jsonb,             -- { bp, hr, bmi, updated_at }
  allergies jsonb default '[]',    -- [{ substance, severity }]
  medications jsonb default '[]'   -- [{ name, dose, route?, start?, stop? }]
);

-- notes (append-only, separat für Volltext & Audit)
create table patient_notes (
  note_id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(patient_id) on delete cascade,
  author_id text not null,
  created_at timestamptz not null default now(),
  text text not null
);
create index ix_notes_patient on patient_notes(patient_id, created_at desc);

-- encounters (Termine/Behandlungen auf Timeline)
create table encounters (
  encounter_id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(patient_id) on delete cascade,
  date date not null,
  location text,
  reason text,
  summary text
);
create index ix_encounters_patient on encounters(patient_id, date desc);

-- Trigger: updated_at bump + optimistic locking via version
-- (API: PATCH /patients/{id} nur mit If-Match: <version>)
```

### Mini-API (OpenAPI-Skizze)

```yaml
openapi: 3.1.0
info: { title: Sensarion Patients API, version: 0.1.0 }
paths:
  /patients:
    get:   # ?q=
      summary: List & search patients
    post:
      summary: Create patient
  /patients/{id}:
    get:   { summary: Get patient }
    patch: { summary: Update (If-Match: version) }   # optimistic locking
  /patients/{id}/notes:
    get:   { summary: List notes }
    post:  { summary: Add note }
  /patients/{id}/encounters:
    get:   { summary: List encounters }
    post:  { summary: Add encounter }
```

### DTO-Kern (einfach & erweiterbar)

```json
{
  "patient_id": "uuid",
  "version": 1,
  "name": { "given": ["Mara"], "family": "Kern" },
  "birth_date": "1987-03-05",
  "tags": ["Hausbesuch","Hypertonie"],
  "vitals_latest": { "bp": "135/85", "hr": 72, "bmi": 27.1, "updated_at": "2025-11-10T09:00:00Z" },
  "allergies": [{ "substance": "Penicillin", "severity": "moderate" }],
  "medications": [{ "name": "Ramipril 5 mg", "dose": "1-0-0" }]
}
```

### Einbaupunkte (damit’s später skaliert)

* **Optimistic Locking:** `PATCH` nur mit `If-Match: <version>` → Konflikte sauber handhabbar.
* **Indexierung:** GIN auf `name`, `tags`, Volltext auf `patient_notes.text`.
* **Anhänge/Consents/Billing:** später eigene Tabellen/Services; das jetzige Schema bleibt stabil.
* **PWA-Offline:** Notizen lokal puffern (encrypted) → Outbox-Sync zur `/notes`-Route.

Wenn du willst, mach ich dir im nächsten Schritt:

1. die **SQL-Migrationsdatei** inkl. Trigger für `updated_at` + `version`,
2. eine **Express/FastAPI-Stub-API** mit genau den oben genannten Routen, oder
3. die **API-Bindings im Frontend** (fetch-Wrapper + Zustand + Optimistic UI).
