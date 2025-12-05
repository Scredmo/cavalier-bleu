'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Employee, Zone, loadEmployees } from '@/app/_data/employees';
import { EmployeeRequest, loadRequests, saveRequests } from '@/app/_data/requests';

// ----- NAVIGATION -----
const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

// ----- TYPES -----
type ServiceType = 'Off' | 'Midi' | 'Soir' | 'Journée';
export type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

const dayOrder: DayKey[] = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
const dayLabels: Record<DayKey, string> = {
  lun: 'Lundi',
  mar: 'Mardi',
  mer: 'Mercredi',
  jeu: 'Jeudi',
  ven: 'Vendredi',
  sam: 'Samedi',
  dim: 'Dimanche',
};

type ShiftCell = {
  active: boolean;
  service: ServiceType;
  start: string;
  end: string;
};

type PlanningWeek = {
  [employeeId: string]: {
    [K in DayKey]: ShiftCell;
  };
};

// Ce qui est stocké dans le localStorage côté présences
type StoredPresenceRow = {
  employeeId: string;
  present: boolean;
  start: string;
  end: string;
  pauseMinutes: number;
  ca: number;
};

// ----- STYLES DE BASE -----
const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  justifyContent: 'center',
  padding: '20px 12px',
  boxSizing: 'border-box',
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 1100,
  background: '#F4F6F8',
  borderRadius: 22,
  boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
  padding: '18px 18px 24px',
  boxSizing: 'border-box',
};

const resumeCard: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 14,
  padding: '8px 10px',
  boxShadow: '0 10px 22px rgba(0,0,0,0.1)',
  boxSizing: 'border-box',
};

const gridContainer: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 16,
  padding: '10px',
  boxSizing: 'border-box',
  boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
};

// ----- UTIL -----
function parseTimeToHours(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return 0;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return h + min / 60;
}

function computeDuration(start: string, end: string): number {
  let s = parseTimeToHours(start);
  let e = parseTimeToHours(end);
  if (!s && !e) return 0;
  if (e <= s) e += 24; // 23:00 -> 02:00
  return Math.max(0, e - s);
}

function defaultTimes(service: ServiceType): { start: string; end: string } {
  switch (service) {
    case 'Midi':
      return { start: '11:00', end: '15:00' };
    case 'Soir':
      return { start: '18:00', end: '23:00' };
    case 'Journée':
      return { start: '11:00', end: '23:00' };
    default:
      return { start: '11:00', end: '23:00' };
  }
}

function createEmptyWeek(empList: Employee[]): PlanningWeek {
  const baseCell: ShiftCell = {
    active: false,
    service: 'Off',
    start: '11:00',
    end: '23:00',
  };
  const week: PlanningWeek = {};
  for (const emp of empList) {
    week[emp.id] = {
      lun: { ...baseCell },
      mar: { ...baseCell },
      mer: { ...baseCell },
      jeu: { ...baseCell },
      ven: { ...baseCell },
      sam: { ...baseCell },
      dim: { ...baseCell },
    };
  }
  return week;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

// Transforme le planning en rows de présences pour un jour donné
function planningToPresenceForDay(
  planning: PlanningWeek,
  employees: Employee[],
  day: DayKey,
): StoredPresenceRow[] {
  return employees.map((emp) => {
    const cell = planning[emp.id]?.[day];
    if (!cell || !cell.active || cell.service === 'Off') {
      return {
        employeeId: emp.id,
        present: false,
        start: '',
        end: '',
        pauseMinutes: 0,
        ca: 0,
      };
    }
    return {
      employeeId: emp.id,
      present: true,
      start: cell.start,
      end: cell.end,
      pauseMinutes: 0,
      ca: 0,
    };
  });
}

// Écrit dans localStorage les présences générées par le planning
function syncPlanningToPresence(
  planning: PlanningWeek,
  employees: Employee[],
) {
  if (typeof window === 'undefined') return;
  dayOrder.forEach((d) => {
    const rows = planningToPresenceForDay(planning, employees, d);
    window.localStorage.setItem(`presence_${d}`, JSON.stringify(rows));
  });
}

// ----- PAGE -----
export default function PlanningPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [planning, setPlanning] = useState<PlanningWeek>({});
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [activeZone, setActiveZone] = useState<Zone>('Salle/Bar');
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: string;
    day: DayKey;
  } | null>(null);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  // drag & drop source (PC)
  const [dragSource, setDragSource] = useState<{
    employeeId: string;
    day: DayKey;
  } | null>(null);

  // mode copie tactile / multi
  const [copySource, setCopySource] = useState<{
    employeeId: string;
    day: DayKey;
  } | null>(null);

  // Init des données
  useEffect(() => {
    const emps = loadEmployees();
    const week = createEmptyWeek(emps);
    const monday = getMonday(new Date());
    const reqs = loadRequests();

    setEmployees(emps);
    setPlanning(week);
    setWeekStart(monday);
    setRequests(reqs);
    setIsMobile(window.innerWidth < 768);
    setInitialized(true);

    // première synchro (planning vide => présences vides)
    syncPlanningToPresence(week, emps);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Détecter début / fin d'impression
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('print');
    const handler = (e: MediaQueryListEvent) => {
      setIsPrinting(e.matches);
    };

    setIsPrinting(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleExportPdf = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const handleWeekChange = (deltaWeeks: number) => {
    if (!weekStart) return;
    setWeekStart((prev) => {
      if (!prev) return prev;
      const d = new Date(prev);
      d.setDate(d.getDate() + 7 * deltaWeeks);
      return getMonday(d);
    });
  };

  const weekLabel = useMemo(() => {
    if (!weekStart) return '';
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${formatDate(weekStart)} au ${formatDate(end)}`;
  }, [weekStart]);

  const employeesByZone = useMemo(
    () => ({
      'Salle/Bar': employees.filter((e) => e.zone === 'Salle/Bar'),
      Cuisine: employees.filter((e) => e.zone === 'Cuisine'),
    }),
    [employees],
  );

  const visibleEmployees = employeesByZone[activeZone] ?? [];

  const synthese = useMemo(() => {
    let totalHeures = 0;
    let totalCout = 0;
    const vus = new Set<string>();

    for (const emp of visibleEmployees) {
      const week = planning[emp.id];
      if (!week) continue;
      let empHours = 0;
      for (const d of dayOrder) {
        const cell = week[d];
        if (!cell?.active || cell.service === 'Off') continue;
        empHours += computeDuration(cell.start, cell.end);
      }
      if (empHours > 0) {
        vus.add(emp.id);
        totalHeures += empHours;
        totalCout += empHours * emp.tauxHoraire;
      }
    }

    return {
      totalHeures,
      totalCout,
      nbEmployesPlanifies: vus.size,
    };
  }, [visibleEmployees, planning]);

  // Stats par jour (heures / coût / nb employés) pour la zone en cours
  const dailyStats = useMemo(() => {
    const stats: Record<
      DayKey,
      { hours: number; cost: number; employees: number }
    > = {
      lun: { hours: 0, cost: 0, employees: 0 },
      mar: { hours: 0, cost: 0, employees: 0 },
      mer: { hours: 0, cost: 0, employees: 0 },
      jeu: { hours: 0, cost: 0, employees: 0 },
      ven: { hours: 0, cost: 0, employees: 0 },
      sam: { hours: 0, cost: 0, employees: 0 },
      dim: { hours: 0, cost: 0, employees: 0 },
    };

    for (const emp of visibleEmployees) {
      const week = planning[emp.id];
      if (!week) continue;
      for (const d of dayOrder) {
        const cell = week[d];
        if (!cell?.active || cell.service === 'Off') continue;
        const h = computeDuration(cell.start, cell.end);
        stats[d].hours += h;
        stats[d].cost += h * emp.tauxHoraire;
      }
    }

    for (const d of dayOrder) {
      const seen = new Set<string>();
      for (const emp of visibleEmployees) {
        const week = planning[emp.id];
        if (!week) continue;
        const cell = week[d];
        if (!cell?.active || cell.service === 'Off') continue;
        const h = computeDuration(cell.start, cell.end);
        if (h > 0) seen.add(emp.id);
      }
      stats[d].employees = seen.size;
    }

    return stats;
  }, [visibleEmployees, planning]);

  const updateCell = (
    employeeId: string,
    day: DayKey,
    patch: Partial<ShiftCell>,
  ) => {
    setPlanning((prev) => {
      const currentWeek = prev[employeeId] ?? ({} as PlanningWeek[string]);
      const currentCell =
        currentWeek[day] ??
        ({
          active: false,
          service: 'Off',
          start: '11:00',
          end: '23:00',
        } as ShiftCell);

      const next: PlanningWeek = {
        ...prev,
        [employeeId]: {
          ...currentWeek,
          [day]: {
            ...currentCell,
            ...patch,
          },
        },
      };

      syncPlanningToPresence(next, employees);
      return next;
    });
  };

  // Copier le shift du jour sélectionné sur toute la semaine pour cet employé
  const copyDayToWeek = (employeeId: string, fromDay: DayKey) => {
    setPlanning((prev) => {
      const currentWeek = prev[employeeId];
      if (!currentWeek) return prev;
      const source = currentWeek[fromDay];
      if (!source) return prev;

      const newWeek: PlanningWeek[string] = { ...currentWeek };
      for (const d of dayOrder) {
        newWeek[d] = { ...source };
      }

      const next: PlanningWeek = {
        ...prev,
        [employeeId]: newWeek,
      };

      syncPlanningToPresence(next, employees);
      return next;
    });
  };

  // Drag & drop : copier un shift d'une case vers une autre (PC)
  const handleDropShift = (
    from: { employeeId: string; day: DayKey },
    to: { employeeId: string; day: DayKey },
  ) => {
    setPlanning((prev) => {
      const fromWeek = prev[from.employeeId];
      if (!fromWeek) return prev;
      const source = fromWeek[from.day];
      if (!source) return prev;

      const targetWeek = prev[to.employeeId] ?? ({} as PlanningWeek[string]);
      const newTargetWeek: PlanningWeek[string] = { ...targetWeek };

      newTargetWeek[to.day] = { ...source };

      const next: PlanningWeek = {
        ...prev,
        [to.employeeId]: newTargetWeek,
      };

      syncPlanningToPresence(next, employees);
      return next;
    });

    setSelectedCell(to);
  };

  const handleCellClick = (employeeId: string, day: DayKey) => {
    // Mode copie : on colle le shift
    if (copySource) {
      if (
        copySource.employeeId !== employeeId ||
        copySource.day !== day
      ) {
        handleDropShift(copySource, { employeeId, day });
      }
      setSelectedCell({ employeeId, day });
      return;
    }

    setSelectedCell({ employeeId, day });
  };

  const selectedInfo =
    selectedCell &&
    (() => {
      const emp = employees.find((e) => e.id === selectedCell.employeeId);
      if (!emp) return null;
      const week =
        planning[selectedCell.employeeId] ?? createEmptyWeek(employees)[
          selectedCell.employeeId
        ];
      const cell = week[selectedCell.day];
      return { emp, cell };
    })();

  const handleTreatRequest = (id: string) => {
    setRequests((prev) => {
      const updated = prev.map((r) =>
        r.id === id ? { ...r, treated: true } : r,
      );
      saveRequests(updated);
      return updated;
    });
  };

  if (!initialized) {
    return (
      <div
        className="planning-root"
        style={{ ...rootStyle, background: '#0B1524', color: 'white' }}
      >
        <div style={{ opacity: 0.7 }}>Chargement du planning…</div>
      </div>
    );
  }

  return (
    <>
      {/* STYLES GLOBAUX : paysage + no-print */}
      <style jsx global>{`
        .planning-root {
          min-height: 100vh;
        }
        .cell-hover:hover {
          background: #e5f0ff;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #ffffff;
            font-size: 11px;
          }

          .no-print {
            display: none !important;
          }

          .planning-root {
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .planning-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div
        className="planning-root"
        style={{ ...rootStyle, background: '#0B1524' }}
      >
        <section className="planning-card" style={cardStyle}>
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: isMobile ? 16 : 18,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                Planning hebdomadaire
              </h1>
              <div
                style={{
                  fontSize: 11,
                  color: '#6B7485',
                }}
              >
                Vue globale · {activeZone}
              </div>
              {weekLabel && (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 10,
                    color: '#6B7280',
                  }}
                >
                  Semaine du {weekLabel}
                </div>
              )}
            </div>

            {/* DROITE : NAV MENU + SEMAINE + EXPORT (écran seulement) */}
            {!isPrinting && (
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: 'flex-end',
                }}
              >
                {/* Menu déroulant navigation */}
                <select
                  defaultValue="/planning"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) window.location.href = value;
                  }}
                  style={{
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#111827',
                    minWidth: 160,
                  }}
                >
                  <option value="" disabled>
                    Aller à…
                  </option>
                  {navPages.map((p) => (
                    <option key={p.href} value={p.href}>
                      {p.label}
                    </option>
                  ))}
                </select>

                {/* Semaine + Export */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      fontSize: 11,
                    }}
                  >
                    <button
                      onClick={() => handleWeekChange(-1)}
                      style={{
                        padding: '3px 7px',
                        borderRadius: 999,
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      ← Semaine précédente
                    </button>
                    <button
                      onClick={() => handleWeekChange(1)}
                      style={{
                        padding: '3px 7px',
                        borderRadius: 999,
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Semaine suivante →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    style={{
                      fontSize: 11,
                      padding: '4px 9px',
                      borderRadius: 999,
                      border: '1px solid #0f766e',
                      background: '#0d9488',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Exporter en PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* DEMANDES EMPLOYÉS (écran seulement) */}
          {!isPrinting && requests.some((r) => !r.treated) && (
            <div
              className="no-print"
              style={{
                marginBottom: 10,
                background: '#FEF9C3',
                borderRadius: 12,
                padding: '8px 10px',
                border: '1px solid #FACC15',
                fontSize: 11,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Demandes des employés
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                {requests
                  .filter((r) => !r.treated)
                  .map((r) => {
                    const emp = employees.find((e) => e.id === r.employeeId);
                    const labelType =
                      r.type === 'retard'
                        ? 'Retard'
                        : r.type === 'conge'
                        ? 'Demande de congé'
                        : 'Absence';
                    return (
                      <li
                        key={r.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 0',
                          borderBottom: '1px solid rgba(0,0,0,0.05)',
                        }}
                      >
                        <div>
                          <div>
                            <strong>{emp?.nom ?? '—'}</strong> · {labelType} le{' '}
                            {r.date} {r.heure ? `à ${r.heure}` : ''}
                          </div>
                          {r.message && (
                            <div
                              style={{
                                fontSize: 10,
                                color: '#4b5563',
                              }}
                            >
                              {r.message}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTreatRequest(r.id)}
                          style={{
                            flexShrink: 0,
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: 'none',
                            background: '#16a34a',
                            color: '#ffffff',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          Traité
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {/* TOGGLE SALLE/BAR / CUISINE (écran seulement) */}
          {!isPrinting && (
            <div
              className="no-print"
              style={{
                display: 'inline-flex',
                borderRadius: 999,
                border: '1px solid #d1d5db',
                overflow: 'hidden',
                fontSize: 11,
                marginBottom: 10,
                background: '#fff',
              }}
            >
              {(['Salle/Bar', 'Cuisine'] as Zone[]).map((zone) => {
                const active = activeZone === zone;
                return (
                  <button
                    key={zone}
                    onClick={() => {
                      setActiveZone(zone);
                      setSelectedCell(null);
                      setCopySource(null);
                    }}
                    style={{
                      padding: '5px 12px',
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? '#001a33' : '#ffffff',
                      color: active ? '#ffffff' : '#111827',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>
          )}

          {/* 3 CARTES SYNTHÈSE (écran seulement) */}
          {!isPrinting && (
            <div
              className="no-print"
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(3, minmax(0,1fr))',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={resumeCard}>
                <div style={{ fontSize: 10, color: '#6B7485' }}>
                  Employés planifiés ({activeZone})
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {synthese.nbEmployesPlanifies}
                </div>
              </div>
              <div style={resumeCard}>
                <div style={{ fontSize: 10, color: '#6B7485' }}>
                  Heures totales (semaine)
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {synthese.totalHeures.toFixed(2)} h
                </div>
              </div>
              <div style={resumeCard}>
                <div style={{ fontSize: 10, color: '#6B7485' }}>
                  Coût estimé (semaine)
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {synthese.totalCout.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  €
                </div>
              </div>
            </div>
          )}

          {/* Bandeau mode copie (écran seulement) */}
          {!isPrinting && copySource && (
            <div
              className="no-print"
              style={{
                marginBottom: 8,
                padding: '6px 10px',
                borderRadius: 10,
                background: '#DBEAFE',
                border: '1px solid #60A5FA',
                fontSize: 11,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div>
                Mode copie actif&nbsp;: toute case tapée recevra ce shift.
                <br />
                <span style={{ opacity: 0.8 }}>
                  Tape sur une case pour coller, ou quitte le mode copie.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCopySource(null)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#1D4ED8',
                  color: '#ffffff',
                  fontSize: 11,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Quitter le mode copie
              </button>
            </div>
          )}

          {/* GRILLE HEBDO (visible écran + PDF) */}
          <div style={gridContainer}>
            <div
              style={{
                fontSize: 11,
                color: '#6b7280',
                marginBottom: 6,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Planning hebdomadaire {activeZone}</span>
              {!isPrinting && (
                <span className="no-print">
                  {isMobile
                    ? 'Appuie sur une case pour la modifier. Utilise le bouton "Copier ce shift sur toute la semaine" ou le mode copie.'
                    : 'Clique sur une case pour la modifier ou glisser-déposer pour copier le shift.'}
                </span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '4px 6px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      Employé
                    </th>
                    {dayOrder.map((d) => (
                      <th
                        key={d}
                        style={{
                          textAlign: 'center',
                          padding: '4px 6px',
                          borderBottom: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          minWidth: 90,
                        }}
                      >
                        {dayLabels[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td
                        style={{
                          padding: '4px 6px',
                          borderBottom: '1px solid #f3f4f6',
                          background: '#f9fafb',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 500,
                          }}
                        >
                          {emp.nom}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#6b7280',
                          }}
                        >
                          {emp.role}
                        </div>
                      </td>

                      {dayOrder.map((d) => {
                        const week = planning[emp.id];
                        const cell =
                          week?.[d] ??
                          ({
                            active: false,
                            service: 'Off',
                            start: '11:00',
                            end: '23:00',
                          } as ShiftCell);

                        const isSelected =
                          selectedCell &&
                          selectedCell.employeeId === emp.id &&
                          selectedCell.day === d;

                        const bg =
                          !cell.active || cell.service === 'Off'
                            ? '#ffffff'
                            : cell.service === 'Midi'
                            ? '#DBEAFE'
                            : cell.service === 'Soir'
                            ? '#FDE68A'
                            : '#BBF7D0';

                        const text =
                          !cell.active || cell.service === 'Off'
                            ? 'Off'
                            : `${cell.service} ${cell.start}-${cell.end}`;

                        return (
                          <td
                            key={d}
                            className={!isPrinting ? 'cell-hover' : undefined}
                            onClick={() =>
                              !isPrinting && handleCellClick(emp.id, d)
                            }
                            draggable={!isPrinting && !isMobile}
                            onDragStart={() => {
                              if (isPrinting || isMobile) return;
                              setDragSource({ employeeId: emp.id, day: d });
                            }}
                            onDragEnd={() => {
                              if (isMobile) return;
                              setDragSource(null);
                            }}
                            onDragOver={(e) => {
                              if (isPrinting || isMobile || !dragSource) return;
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              if (isPrinting || isMobile || !dragSource) return;
                              e.preventDefault();
                              handleDropShift(dragSource, {
                                employeeId: emp.id,
                                day: d,
                              });
                              setDragSource(null);
                            }}
                            style={{
                              cursor: isPrinting ? 'default' : 'pointer',
                              padding: '4px 4px',
                              borderBottom: '1px solid #f3f4f6',
                              borderLeft: '1px solid #f3f4f6',
                              background: bg,
                              fontSize: 10,
                              textAlign: 'center',
                              borderRadius: 6,
                              outline:
                                !isPrinting && isSelected
                                  ? '2px solid #111827'
                                  : 'none',
                              outlineOffset: -2,
                            }}
                          >
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ÉDITEUR DE CELLULE (écran uniquement) */}
            {!isPrinting && selectedInfo && (
              <div
                className="no-print"
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px dashed #e5e7eb',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 8,
                  alignItems: isMobile ? 'stretch' : 'center',
                  fontSize: 11,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6b7280',
                    }}
                  >
                    Modification du shift
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {selectedInfo.emp.nom} – {dayLabels[selectedCell!.day]} ·{' '}
                    {activeZone}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInfo.cell.active}
                      onChange={(e) => {
                        const active = e.target.checked;
                        if (!active) {
                          updateCell(
                            selectedCell!.employeeId,
                            selectedCell!.day,
                            {
                              active: false,
                              service: 'Off',
                            },
                          );
                        } else {
                          const times = defaultTimes('Journée');
                          updateCell(
                            selectedCell!.employeeId,
                            selectedCell!.day,
                            {
                              active: true,
                              service: 'Journée',
                              start: times.start,
                              end: times.end,
                            },
                          );
                        }
                      }}
                    />
                    Planifié
                  </label>

                  {selectedInfo.cell.active &&
                    selectedInfo.cell.service !== 'Off' && (
                      <>
                        <select
                          value={selectedInfo.cell.service}
                          onChange={(e) => {
                            const service = e.target.value as ServiceType;
                            const times = defaultTimes(service);
                            updateCell(
                              selectedCell!.employeeId,
                              selectedCell!.day,
                              {
                                service,
                                start: times.start,
                                end: times.end,
                              },
                            );
                          }}
                          style={{
                            padding: '3px 6px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                          }}
                        >
                          <option value="Midi">Midi</option>
                          <option value="Soir">Soir</option>
                          <option value="Journée">Journée</option>
                        </select>

                        <div
                          style={{
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          <span>de</span>
                          <input
                            type="time"
                            value={selectedInfo.cell.start}
                            onChange={(e) =>
                              updateCell(
                                selectedCell!.employeeId,
                                selectedCell!.day,
                                {
                                  start: e.target.value,
                                },
                              )
                            }
                            style={{
                              padding: '2px 4px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              fontSize: 10,
                            }}
                          />
                          <span>à</span>
                          <input
                            type="time"
                            value={selectedInfo.cell.end}
                            onChange={(e) =>
                              updateCell(
                                selectedCell!.employeeId,
                                selectedCell!.day,
                                {
                                  end: e.target.value,
                                },
                              )
                            }
                            style={{
                              padding: '2px 4px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              fontSize: 10,
                            }}
                          />
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: '#6b7280',
                          }}
                        >
                          {computeDuration(
                            selectedInfo.cell.start,
                            selectedInfo.cell.end,
                          ).toFixed(2)}{' '}
                          h
                        </div>

                        {/* BOUTON COPIER SUR TOUTE LA SEMAINE */}
                        <button
                          type="button"
                          onClick={() =>
                            copyDayToWeek(
                              selectedCell!.employeeId,
                              selectedCell!.day,
                            )
                          }
                          style={{
                            marginLeft: 4,
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: '1px solid #d1d5db',
                            background: '#f9fafb',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          Copier ce shift sur toute la semaine
                        </button>

                        {/* BOUTON MODE COPIE */}
                        <button
                          type="button"
                          onClick={() =>
                            setCopySource({
                              employeeId: selectedCell!.employeeId,
                              day: selectedCell!.day,
                            })
                          }
                          style={{
                            marginLeft: 4,
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: '1px solid #d1d5db',
                            background: '#EFF6FF',
                            fontSize: 10,
                            cursor: 'pointer',
                          }}
                        >
                          Utiliser comme modèle de copie
                        </button>
                      </>
                    )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}