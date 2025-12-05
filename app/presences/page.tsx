'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Employee, loadEmployees } from '@/app/_data/employees';

// mêmes clés que dans le planning
type DayKey = 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim';

const dayLabels: Record<DayKey, string> = {
  lun: 'Lundi',
  mar: 'Mardi',
  mer: 'Mercredi',
  jeu: 'Jeudi',
  ven: 'Vendredi',
  sam: 'Samedi',
  dim: 'Dimanche',
};

const dayFromDate = (dateStr: string): DayKey => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=dim,1=lun,...6=sam
  switch (dow) {
    case 1:
      return 'lun';
    case 2:
      return 'mar';
    case 3:
      return 'mer';
    case 4:
      return 'jeu';
    case 5:
      return 'ven';
    case 6:
      return 'sam';
    case 0:
    default:
      return 'dim';
  }
};

type PresenceRow = {
  employeeId: string;
  present: boolean;
  start: string;
  end: string;
  pauseMinutes: number;
  ca: number;
};

type DailyExpense = {
  id: string;
  label: string;
  montant: number;
};

const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

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
  if (e <= s) e += 24;
  return Math.max(0, e - s);
}

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
  maxWidth: 1000,
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

export default function PresencesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  // init
  useEffect(() => {
    const emps = loadEmployees();
    setEmployees(emps);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(todayStr);

    setIsMobile(window.innerWidth < 768);
    setInitialized(true);

    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  // print detection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('print');
    const handler = (e: MediaQueryListEvent) => setIsPrinting(e.matches);
    setIsPrinting(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const selectedDayKey: DayKey | null = useMemo(() => {
    if (!selectedDate) return null;
    return dayFromDate(selectedDate);
  }, [selectedDate]);

  // charger les présences depuis localStorage (remplies par le planning)
  useEffect(() => {
    if (!selectedDayKey || employees.length === 0) return;
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(`presence_${selectedDayKey}`);
    let parsed: any[] = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = [];
      }
    }

    const rowsFromStorage = employees.map((emp) => {
      const existing = parsed.find((r) => r.employeeId === emp.id);
      return {
        employeeId: emp.id,
        present: existing?.present ?? false,
        start: existing?.start ?? '',
        end: existing?.end ?? '',
        pauseMinutes: existing?.pauseMinutes ?? 0,
        ca: existing?.ca ?? 0,
      } as PresenceRow;
    });

    setRows(rowsFromStorage);
  }, [selectedDayKey, employees]);

  // sauver présences
  useEffect(() => {
    if (!selectedDayKey) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `presence_${selectedDayKey}`,
      JSON.stringify(rows),
    );
  }, [rows, selectedDayKey]);

  // charger dépenses pour la date
  useEffect(() => {
    if (!selectedDate) return;
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(`expenses_${selectedDate}`);
    if (!raw) {
      setExpenses([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setExpenses(
        Array.isArray(parsed)
          ? parsed.map((e: any) => ({
              id: String(
                e.id ??
                  (typeof crypto !== 'undefined' &&
                  'randomUUID' in crypto &&
                  typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : Date.now()),
              ),
              label: e.label ?? '',
              montant: Number(e.montant ?? 0),
            }))
          : [],
      );
    } catch {
      setExpenses([]);
    }
  }, [selectedDate]);

  // sauver dépenses
  useEffect(() => {
    if (!selectedDate) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      `expenses_${selectedDate}`,
      JSON.stringify(expenses),
    );
  }, [expenses, selectedDate]);

  const niceDate =
    selectedDate &&
    (() => {
      const d = new Date(selectedDate + 'T00:00:00');
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
    })();

  const employeesById = useMemo(() => {
    const map: Record<string, Employee> = {};
    for (const e of employees) map[e.id] = e;
    return map;
  }, [employees]);

  const stats = useMemo(() => {
    let totalHeures = 0;
    let totalCout = 0;
    let nbPresents = 0;
    let totalCa = 0;

    for (const row of rows) {
      const emp = employeesById[row.employeeId];
      if (!emp || !row.present) continue;
      const duree = computeDuration(row.start, row.end);
      const payee = Math.max(0, duree - row.pauseMinutes / 60);
      totalHeures += payee;
      totalCout += payee * emp.tauxHoraire;
      nbPresents++;
      if (emp.zone === 'Salle/Bar') {
        totalCa += row.ca;
      }
    }

    const totalDepenses = expenses.reduce(
      (sum, e) => sum + (e.montant || 0),
      0,
    );
    const marge = totalCa - totalCout - totalDepenses;

    return {
      totalHeures,
      totalCout,
      nbPresents,
      totalCa,
      totalDepenses,
      marge,
    };
  }, [rows, employeesById, expenses]);

  const handleExportPdf = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const updateRow = (employeeId: string, patch: Partial<PresenceRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.employeeId === employeeId
          ? {
              ...r,
              ...patch,
            }
          : r,
      ),
    );
  };

  if (!initialized) {
    return (
      <div
        className="presence-root"
        style={{ ...rootStyle, background: '#0B1524', color: 'white' }}
      >
        <div style={{ opacity: 0.7 }}>Chargement de la feuille…</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .presence-root {
          min-height: 100vh;
        }

        .print-only {
          display: none;
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

          .print-only {
            display: block !important;
          }

          .presence-root {
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .presence-card {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      <div
        className="presence-root"
        style={{ ...rootStyle, background: '#0B1524' }}
      >
        <section className="presence-card" style={cardStyle}>
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
                Feuille de présence
              </h1>
              <div
                style={{
                  fontSize: 11,
                  color: '#6B7485',
                }}
              >
                {niceDate ? niceDate : 'Sélectionne une date'}
              </div>
              {selectedDayKey && (
                <div
                  style={{
                    fontSize: 10,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  Basée sur le planning · {dayLabels[selectedDayKey]}
                </div>
              )}
            </div>

            {/* DROITE : NAV + DATE + EXPORT */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                alignItems: 'flex-end',
              }}
            >
              <select
                defaultValue="/presences"
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

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'flex-end',
                }}
              >
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                  }}
                />
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
          </div>

          {/* STATS (écran) */}
          <div
            className="no-print"
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(4, minmax(0,1fr))',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div style={resumeCard}>
              <div style={{ fontSize: 10, color: '#6B7485' }}>
                Employés présents
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {stats.nbPresents}
              </div>
            </div>
            <div style={resumeCard}>
              <div style={{ fontSize: 10, color: '#6B7485' }}>
                Heures payées (total)
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {stats.totalHeures.toFixed(2)} h
              </div>
            </div>
            <div style={resumeCard}>
              <div style={{ fontSize: 10, color: '#6B7485' }}>
                Masse salariale estimée
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {stats.totalCout.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                })}{' '}
                €
              </div>
            </div>
            <div style={resumeCard}>
              <div style={{ fontSize: 10, color: '#6B7485' }}>
                Dépenses journalières
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {stats.totalDepenses.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                })}{' '}
                €
              </div>
            </div>
          </div>

          {/* DÉPENSES JOURNALIÈRES (écran seulement) */}
          <div
            className="no-print"
            style={{
              marginBottom: 12,
              background: '#ffffff',
              borderRadius: 16,
              padding: '8px 10px',
              boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
              fontSize: 11,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 2,
                  }}
                >
                  Dépenses journalières
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#6B7280',
                  }}
                >
                  Croissants, baguettes, jus de tomate, extras de dernière
                  minute…
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpenses((prev) => [
                    ...prev,
                    {
                      id:
                        typeof crypto !== 'undefined' &&
                        'randomUUID' in crypto &&
                        typeof crypto.randomUUID === 'function'
                          ? crypto.randomUUID()
                          : String(Date.now() + Math.random()),
                      label: '',
                      montant: 0,
                    },
                  ])
                }
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  fontSize: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                + Ajouter une dépense
              </button>
            </div>

            {expenses.length === 0 ? (
              <div
                style={{
                  fontSize: 10,
                  color: '#9CA3AF',
                }}
              >
                Aucune dépense renseignée pour l&apos;instant.
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Ex : Croissants"
                      value={exp.label}
                      onChange={(e) =>
                        setExpenses((prev) =>
                          prev.map((x) =>
                            x.id === exp.id
                              ? { ...x, label: e.target.value }
                              : x,
                          ),
                        )
                      }
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 11,
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={exp.montant}
                      onChange={(e) =>
                        setExpenses((prev) =>
                          prev.map((x) =>
                            x.id === exp.id
                              ? {
                                  ...x,
                                  montant: Number(e.target.value || 0),
                                }
                              : x,
                          ),
                        )
                      }
                      style={{
                        width: 90,
                        padding: '4px 6px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 11,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                      }}
                    >
                      €
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExpenses((prev) =>
                          prev.filter((x) => x.id !== exp.id),
                        )
                      }
                      style={{
                        padding: '2px 6px',
                        borderRadius: 999,
                        border: 'none',
                        background: '#fee2e2',
                        color: '#b91c1c',
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      Suppr
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TABLEAU INTERACTIF (écran seulement) */}
          <div className="no-print">
            <div
              style={{
                fontSize: 11,
                color: '#6B7280',
                marginBottom: 4,
              }}
            >
              Renseigne la présence réelle, les pauses et le CA (Salle/Bar) avant
              d&apos;exporter.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                  background: '#ffffff',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '6px 6px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Employé
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '6px 6px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Poste
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Présent
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Début
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Fin
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Pause (min)
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Heures payées
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Taux
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      Coût
                    </th>
                    <th
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb',
                      }}
                    >
                      CA (Salle/Bar)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const emp = employeesById[row.employeeId];
                    if (!emp) return null;
                    const duree = computeDuration(row.start, row.end);
                    const payee = row.present
                      ? Math.max(0, duree - row.pauseMinutes / 60)
                      : 0;
                    const cout = payee * emp.tauxHoraire;
                    const isSalleBar = emp.zone === 'Salle/Bar';

                    return (
                      <tr key={row.employeeId}>
                        <td
                          style={{
                            padding: '4px 6px',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{emp.nom}</div>
                        </td>
                        <td
                          style={{
                            padding: '4px 6px',
                            borderBottom: '1px solid #f3f4f6',
                            fontSize: 10,
                            color: '#6B7280',
                          }}
                        >
                          {emp.role}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={row.present}
                            onChange={(e) =>
                              updateRow(row.employeeId, {
                                present: e.target.checked,
                              })
                            }
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          <input
                            type="time"
                            value={row.start}
                            onChange={(e) =>
                              updateRow(row.employeeId, {
                                start: e.target.value,
                              })
                            }
                            style={{
                              padding: '2px 4px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              fontSize: 10,
                            }}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          <input
                            type="time"
                            value={row.end}
                            onChange={(e) =>
                              updateRow(row.employeeId, {
                                end: e.target.value,
                              })
                            }
                            style={{
                              padding: '2px 4px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              fontSize: 10,
                            }}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          <input
                            type="number"
                            min={0}
                            value={row.pauseMinutes}
                            onChange={(e) =>
                              updateRow(row.employeeId, {
                                pauseMinutes: Number(e.target.value || 0),
                              })
                            }
                            style={{
                              width: 60,
                              padding: '2px 4px',
                              borderRadius: 6,
                              border: '1px solid #d1d5db',
                              fontSize: 10,
                            }}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                            fontSize: 10,
                          }}
                        >
                          {payee.toFixed(2)} h
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                            fontSize: 10,
                          }}
                        >
                          {emp.tauxHoraire.toFixed(2)} €
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                            fontSize: 10,
                          }}
                        >
                          {cout.toLocaleString('fr-FR', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          €
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {isSalleBar ? (
                            <input
                              type="number"
                              min={0}
                              value={row.ca}
                              onChange={(e) =>
                                updateRow(row.employeeId, {
                                  ca: Number(e.target.value || 0),
                                })
                              }
                              style={{
                                width: 80,
                                padding: '2px 4px',
                                borderRadius: 6,
                                border: '1px solid #d1d5db',
                                fontSize: 10,
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLEAU POUR PDF (print-only, sans cases) */}
          <div className="print-only">
            <h2
              style={{
                fontSize: 14,
                margin: 0,
                marginBottom: 6,
              }}
            >
              Feuille de présence – {niceDate ?? ''}
            </h2>
            <div
              style={{
                fontSize: 10,
                color: '#6B7280',
                marginBottom: 6,
              }}
            >
              Employés présents&nbsp;: {stats.nbPresents} · Heures payées&nbsp;:{' '}
              {stats.totalHeures.toFixed(2)} h · Masse salariale&nbsp;:
              {stats.totalCout.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
              })}{' '}
              € · CA Salle/Bar&nbsp;:
              {stats.totalCa.toLocaleString('fr-FR', {
                minimumFractionDigits: 0,
              })}{' '}
              € · Dépenses&nbsp;:
              {stats.totalDepenses.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
              })}{' '}
              € · Résultat&nbsp;:
              {stats.marge.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
              })}{' '}
              €
            </div>

            {expenses.some((e) => e.label || e.montant) && (
              <div
                style={{
                  fontSize: 10,
                  marginBottom: 6,
                }}
              >
                <strong>Dépenses journalières</strong>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: 2,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '3px 4px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Libellé
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '3px 4px',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses
                      .filter((e) => e.label || e.montant)
                      .map((e) => (
                        <tr key={e.id}>
                          <td
                            style={{
                              padding: '3px 4px',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            {e.label || '—'}
                          </td>
                          <td
                            style={{
                              padding: '3px 4px',
                              textAlign: 'right',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            {e.montant.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                            })}{' '}
                            €
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 10,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Employé
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Poste
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Présent
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Début
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Fin
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Pause (min)
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Heures payées
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Taux
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    Coût
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '4px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    CA (Salle/Bar)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const emp = employeesById[row.employeeId];
                  if (!emp) return null;
                  const duree = computeDuration(row.start, row.end);
                  const payee = row.present
                    ? Math.max(0, duree - row.pauseMinutes / 60)
                    : 0;
                  const cout = payee * emp.tauxHoraire;
                  const isSalleBar = emp.zone === 'Salle/Bar';

                  if (!row.present && !row.start && !row.end) {
                    return null;
                  }

                  return (
                    <tr key={row.employeeId}>
                      <td
                        style={{
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.nom}
                      </td>
                      <td
                        style={{
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.role}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {row.present ? 'Oui' : 'Non'}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {row.start || '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {row.end || '—'}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {row.pauseMinutes || 0}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {payee.toFixed(2)} h
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.tauxHoraire.toFixed(2)} €
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {cout.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        €
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '3px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {isSalleBar
                          ? `${row.ca.toLocaleString('fr-FR', {
                              minimumFractionDigits: 0,
                            })} €`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}