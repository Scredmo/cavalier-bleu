"use client";

import { useEffect, useMemo, useState } from "react";

type DayKey =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type EmployeeBase = {
  id: string;
  name: string;
  role: Role;
};

type EmployeeFromStorage = {
  id: string;
  name: string;
  role: Role;
  hourlyRate?: number;
};

type Employee = EmployeeBase & { hourlyRate: number };

type CellMode = "off" | "midi" | "soir" | "journee" | "custom";

type CellSchedule = {
  mode: CellMode;
  start?: string;
  end?: string;
};

type PlanningState = {
  [key: string]: CellSchedule;
};

type RequestFromStorage = {
  id: string;
  employeeId: string;
  type: "retard" | "conge" | "absence";
  date: string;
  treated: boolean;
};

type Area = "salle" | "cuisine";

const EMPLOYEES_BASE: EmployeeBase[] = [
  { id: "aurelie", name: "Aurélie", role: "Patron" },
  { id: "hadrien", name: "Hadrien", role: "Responsable" },
  { id: "eric", name: "Eric", role: "Responsable" },
  { id: "harouna", name: "Harouna", role: "Barman" },
  { id: "raja", name: "Raja", role: "Cuisine" },
  { id: "pirakash", name: "PIRAKASH", role: "Cuisine" },
  { id: "alan", name: "Alan", role: "Cuisine" },
  { id: "amine", name: "Amine", role: "Serveur" },
  { id: "tom", name: "Tom", role: "Serveur" },
  { id: "nazario", name: "Nazario", role: "Serveur" },
];

const DAYS: { key: DayKey; label: string }[] = [
  { key: "lundi", label: "Lun" },
  { key: "mardi", label: "Mar" },
  { key: "mercredi", label: "Mer" },
  { key: "jeudi", label: "Jeu" },
  { key: "vendredi", label: "Ven" },
  { key: "samedi", label: "Sam" },
  { key: "dimanche", label: "Dim" },
];

const STORAGE_PLANNING_KEY = "CB_PLANNING_V2";
const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";
const STORAGE_REQUESTS_KEY = "CB_REQUESTS";

function getPresetForMode(mode: CellMode): { start?: string; end?: string } {
  switch (mode) {
    case "midi":
      return { start: "12:00", end: "15:00" };
    case "soir":
      return { start: "19:00", end: "23:00" };
    case "journee":
      return { start: "10:00", end: "23:00" };
    case "off":
      return { start: undefined, end: undefined };
    case "custom":
    default:
      return {};
  }
}

function modeLabel(mode: CellMode): string {
  switch (mode) {
    case "off":
      return "Off";
    case "midi":
      return "Midi";
    case "soir":
      return "Soir";
    case "journee":
      return "Journée";
    case "custom":
      return "Perso";
    default:
      return "";
  }
}

function parseHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  )
    return 0;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

function computeWeekDates(baseDate = new Date()): Record<DayKey, string> {
  const today = new Date(baseDate);
  const monday = new Date(today);
  const wd = monday.getDay();
  const diff = (wd === 0 ? -6 : 1) - wd;
  monday.setDate(today.getDate() + diff);

  const result: Partial<Record<DayKey, string>> = {};
  const keys: DayKey[] = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];

  keys.forEach((key, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    result[key] = d.toISOString().slice(0, 10);
  });

  return result as Record<DayKey, string>;
}

function getWeekLabel(baseDate = new Date()): string {
  const dates = computeWeekDates(baseDate);
  const monday = dates.lundi;
  const sunday = dates.dimanche;

  const [y1, m1, d1] = monday.split("-").map(Number);
  const [y2, m2, d2] = sunday.split("-").map(Number);

  const fmt = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });

  const dMonday = new Date(y1, (m1 ?? 1) - 1, d1);
  const dSunday = new Date(y2, (m2 ?? 1) - 1, d2);

  return `Semaine du ${fmt.format(dMonday)} au ${fmt.format(dSunday)}`;
}

function roleSlug(role: Role): string {
  switch (role) {
    case "Patron":
      return "patron";
    case "Responsable":
      return "responsable";
    case "Barman":
      return "barman";
    case "Cuisine":
      return "cuisine";
    case "Serveur":
      return "serveur";
    default:
      return "autre";
  }
}

export default function PlanningPage() {
  const [area, setArea] = useState<Area>("salle");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [planning, setPlanning] = useState<PlanningState>({});
  const [weekDates] = useState<Record<DayKey, string>>(computeWeekDates());
  const [weekLabel] = useState<string>(getWeekLabel());
  const [requests, setRequests] = useState<RequestFromStorage[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );

  // Drag & drop (desktop)
  const [dragSourceKey, setDragSourceKey] = useState<string | null>(null);

  // Popup modal
  const [dialogInfo, setDialogInfo] = useState<{
    employeeId: string;
    day: DayKey;
  } | null>(null);

  const dialogEmployee = dialogInfo
    ? employees.find((e) => e.id === dialogInfo.employeeId)
    : undefined;
  const dialogDay = dialogInfo
    ? DAYS.find((d) => d.key === dialogInfo.day)
    : undefined;

  // Taux de charges patronales (en %)
  const [chargeRate, setChargeRate] = useState<number>(42);

  // Responsive
  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Chargement employés
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EmployeeFromStorage[];
        if (Array.isArray(parsed)) {
          const withRates: Employee[] = EMPLOYEES_BASE.map((base) => {
            const match = parsed.find(
              (e) => e.id === base.id || e.name === base.name
            );
            return {
              ...base,
              hourlyRate: match?.hourlyRate ?? 0,
            };
          });
          setEmployees(withRates);
          return;
        }
      }
    } catch (err) {
      console.error("Erreur chargement employés", err);
    }

    setEmployees(
      EMPLOYEES_BASE.map((e) => ({
        ...e,
        hourlyRate: 0,
      }))
    );
  }, []);

  // Chargement planning
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_PLANNING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any;
        const normalized: PlanningState = {};

        if (parsed && typeof parsed === "object") {
          for (const key of Object.keys(parsed)) {
            const val = parsed[key];
            if (val && typeof val === "object" && "mode" in val) {
              const mode = (val.mode ?? "off") as CellMode;
              normalized[key] = {
                mode,
                start: val.start,
                end: val.end,
              };
            } else if (typeof val === "string") {
              const mode = (val as CellMode) || "off";
              const preset = getPresetForMode(mode);
              normalized[key] = { mode, ...preset };
            }
          }
        }

        if (Object.keys(normalized).length > 0) {
          setPlanning(normalized);
        }
      }

      setPlanning((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: PlanningState = {};
        for (const emp of EMPLOYEES_BASE) {
          for (const d of DAYS) {
            initial[`${emp.id}-${d.key}`] = { mode: "off" };
          }
        }
        return initial;
      });
    } catch (err) {
      console.error("Erreur chargement planning", err);
    }
  }, []);

  // Chargement demandes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_REQUESTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RequestFromStorage[];
        if (Array.isArray(parsed)) setRequests(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement demandes", err);
    }
  }, []);

  // Sauvegarde planning
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PLANNING_KEY, JSON.stringify(planning));
  }, [planning]);

  const getKey = (employeeId: string, day: DayKey) => `${employeeId}-${day}`;

  const getCell = (employeeId: string, day: DayKey): CellSchedule => {
    const key = getKey(employeeId, day);
    const val = planning[key];
    if (!val) return { mode: "off" };
    return val;
  };

  const updateCell = (
    employeeId: string,
    day: DayKey,
    updater: (prev: CellSchedule) => CellSchedule
  ) => {
    const key = getKey(employeeId, day);
    setPlanning((prev) => {
      const current = prev[key] ?? { mode: "off" };
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const rolesForArea: Role[] =
    area === "salle"
      ? ["Patron", "Responsable", "Barman", "Serveur"]
      : ["Cuisine"];

  useEffect(() => {
    const areaEmps = employees.filter((e) => rolesForArea.includes(e.role));

    if (areaEmps.length === 0) {
      setSelectedEmployeeId(null);
      return;
    }

    setSelectedEmployeeId((prev) =>
      prev && areaEmps.some((e) => e.id === prev) ? prev : null
    );
  }, [employees, area]);

  const openDialog = (employeeId: string, day: DayKey) => {
    setDialogInfo({ employeeId, day });
  };

  const closeDialog = () => setDialogInfo(null);

  const handleModeSelect = (
    employeeId: string,
    day: DayKey,
    mode: CellMode
  ) => {
    if (mode === "custom") {
      updateCell(employeeId, day, () => ({
        mode,
        start: "10:00",
        end: "18:00",
      }));
    } else {
      updateCell(employeeId, day, () => {
        const preset = getPresetForMode(mode);
        return {
          mode,
          ...preset,
        };
      });
    }
    setDialogInfo(null);
  };

  const handleCopyDayToWeek = (employeeId: string, day: DayKey) => {
    const source = getCell(employeeId, day);
    setPlanning((prev) => {
      const next: PlanningState = { ...prev };
      for (const d of DAYS) {
        next[getKey(employeeId, d.key)] = { ...source };
      }
      return next;
    });
    setDialogInfo(null);
  };

  const handleResetAll = () => {
    if (!window.confirm("Réinitialiser tout le planning à Off ?")) return;
    const next: PlanningState = {};
    for (const emp of EMPLOYEES_BASE) {
      for (const d of DAYS) {
        next[getKey(emp.id, d.key)] = { mode: "off" };
      }
    }
    setPlanning(next);
    setDialogInfo(null);
  };

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const approvedLeaves = useMemo(() => {
    const set = new Set<string>();
    if (!requests || requests.length === 0) return set;

    const weekDatesValues = new Set(Object.values(weekDates));

    for (const r of requests) {
      if (r.type !== "conge" || !r.treated) continue;
      if (!weekDatesValues.has(r.date)) continue;
      set.add(`${r.employeeId}|${r.date}`);
    }
    return set;
  }, [requests, weekDates]);

  const hasApprovedLeave = (employeeId: string, day: DayKey): boolean => {
    const date = weekDates[day];
    return approvedLeaves.has(`${employeeId}|${date}`);
  };

  // === STATISTIQUES GLOBALes ===
  const stats = useMemo(() => {
    let totalHours = 0;
    let baseCost = 0;

    const areaEmployees = employees.filter((e) =>
      rolesForArea.includes(e.role)
    );

    for (const emp of areaEmployees) {
      for (const d of DAYS) {
        if (hasApprovedLeave(emp.id, d.key)) continue;
        const cell = getCell(emp.id, d.key);

        let start = cell.start;
        let end = cell.end;
        if ((!start || !end) && cell.mode !== "custom") {
          const preset = getPresetForMode(cell.mode);
          start = preset.start;
          end = preset.end;
        }

        if (cell.mode === "off") continue;

        const h = parseHours(start, end);
        totalHours += h;
        baseCost += h * (emp.hourlyRate ?? 0);
      }
    }

    const charges = baseCost * (chargeRate / 100);
    const totalCost = baseCost + charges;

    return {
      totalHours,
      baseCost,
      charges,
      totalCost,
    };
  }, [employees, planning, area, approvedLeaves, chargeRate]);

  // DRAG & DROP
  const handleDragStart = (employeeId: string, day: DayKey) => {
    setDragSourceKey(getKey(employeeId, day));
  };

  const handleDrop = (employeeId: string, day: DayKey) => {
    if (!dragSourceKey) return;
    const targetKey = getKey(employeeId, day);
    if (targetKey === dragSourceKey) return;

    setPlanning((prev) => {
      const sourceVal = prev[dragSourceKey!] ?? { mode: "off" };
      return {
        ...prev,
        [targetKey]: { ...sourceVal },
      };
    });

    setDragSourceKey(null);
  };

  const generatePlanningText = (): string => {
    let text = `Planning Cavalier Bleu – ${
      area === "salle" ? "Salle" : "Cuisine"
    }\n${weekLabel}\n\n`;

    const emps = employees.filter((e) => rolesForArea.includes(e.role));
    for (const emp of emps) {
      text += `\n${emp.name} (${emp.role})\n`;
      for (const d of DAYS) {
        const isLeave = hasApprovedLeave(emp.id, d.key);
        if (isLeave) {
          text += `  ${d.label} : Congé accepté\n`;
          continue;
        }
        const cell = getCell(emp.id, d.key);
        let line = "";
        let start = cell.start;
        let end = cell.end;
        if ((!start || !end) && cell.mode !== "custom") {
          const preset = getPresetForMode(cell.mode);
          start = preset.start;
          end = preset.end;
        }

        if (cell.mode === "off") {
          line = "Off";
        } else if (start && end) {
          const h = parseHours(start, end);
          line = `${start} - ${end} (${h.toFixed(1)} h)`;
        } else {
          line = modeLabel(cell.mode);
        }
        text += `  ${d.label} : ${line}\n`;
      }
    }

    return text;
  };

  const handleCopyPlanning = async () => {
    const text = generatePlanningText();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert(
          "Planning copié. Tu peux le coller dans WhatsApp, SMS, e-mail, etc."
        );
      } else {
        alert("Impossible de copier automatiquement.");
      }
    } catch (err) {
      console.error("Erreur copie planning", err);
      alert("Erreur lors de la copie du planning.");
    }
  };

  const handleEmailPlanning = () => {
    const text = generatePlanningText();
    const subject = `Planning Cavalier Bleu - ${
      area === "salle" ? "Salle" : "Cuisine"
    } - ${weekLabel}`;
    const mailto = `mailto:?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
  };

  const groupedByRole: Record<Role, Employee[]> = {
    Patron: [],
    Responsable: [],
    Barman: [],
    Cuisine: [],
    Serveur: [],
  };

  for (const emp of employees) {
    groupedByRole[emp.role].push(emp);
  }

  /* ================= DESKTOP VIEW ================= */

  const renderDesktopView = () => {
    const activeRoles: Role[] = rolesForArea;

    const renderRows = () =>
      activeRoles.map((role) => {
        const list = groupedByRole[role];
        if (!list || list.length === 0) return null;

        return (
          <tbody key={role}>
            <tr className="cb-planning__section-row">
              <td colSpan={DAYS.length + 1}>{role}</td>
            </tr>
            {list.map((emp) => (
              <tr key={emp.id}>
                <td className="cb-planning__employee-cell">{emp.name}</td>
                {DAYS.map((d) => {
                  const cell = getCell(emp.id, d.key);
                  const isLeave = hasApprovedLeave(emp.id, d.key);

                  let start = cell.start;
                  let end = cell.end;
                  if ((!start || !end) && cell.mode !== "custom") {
                    const preset = getPresetForMode(cell.mode);
                    start = preset.start;
                    end = preset.end;
                  }
                  const hours =
                    cell.mode === "off" || isLeave
                      ? 0
                      : parseHours(start, end);

                  let label = "";
                  if (isLeave) {
                    label = "Congé accepté";
                  } else if (cell.mode === "off") {
                    label = "Off";
                  } else if (start && end) {
                    label = `${start}–${end}`;
                  } else {
                    label = modeLabel(cell.mode);
                  }

                  return (
                    <td
                      key={d.key}
                      className="cb-planning__cell"
                      onClick={() => openDialog(emp.id, d.key)}
                      draggable={!isLeave}
                      onDragStart={() => handleDragStart(emp.id, d.key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(emp.id, d.key)}
                    >
                      <div
                        className={
                          "cb-planning__shift-pill " +
                          (isLeave
                            ? "cb-planning__shift-pill--leave"
                            : "cb-planning__shift-pill--" + cell.mode)
                        }
                      >
                        <span>{label}</span>
                        {hours > 0 && (
                          <span className="cb-planning__shift-hours">
                            {hours.toFixed(1)}h
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        );
      });

    return (
      <section className="cb-card cb-planning-main">
        <div className="cb-planning__table-wrapper">
          <table className="cb-planning__table">
            <thead>
              <tr>
                <th className="cb-planning__head-cell">Employé</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="cb-planning__head-cell">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            {renderRows()}
          </table>
        </div>
      </section>
    );
  };

  /* ================= MOBILE VIEW ================= */

  const renderMobileView = () => {
    const areaEmployees = employees.filter((e) =>
      rolesForArea.includes(e.role)
    );

    if (areaEmployees.length === 0) {
      return (
        <section className="cb-card cb-planning-main">
          <p>Aucun employé pour cette zone.</p>
        </section>
      );
    }

    const renderEmployeePlanning = (emp: Employee) => (
      <div className="cb-card" style={{ marginTop: 8 }}>
        {DAYS.map((d) => {
          const cell = getCell(emp.id, d.key);
          const isLeave = hasApprovedLeave(emp.id, d.key);

          let start = cell.start;
          let end = cell.end;
          if ((!start || !end) && cell.mode !== "custom") {
            const preset = getPresetForMode(cell.mode);
            start = preset.start;
            end = preset.end;
          }
          const hours =
            cell.mode === "off" || isLeave ? 0 : parseHours(start, end);

          let label = "";
          if (isLeave) {
            label = "Congé accepté";
          } else if (cell.mode === "off") {
            label = "Off";
          } else if (start && end) {
            label = `${start}–${end}`;
          } else {
            label = modeLabel(cell.mode);
          }

          return (
            <div
              key={d.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ width: 40, fontSize: 13, color: "#64748b" }}>
                {d.label}
              </div>
              <div
                className="cb-planning__cell"
                style={{ flex: 1 }}
                onClick={() => openDialog(emp.id, d.key)}
              >
                <div
                  className={
                    "cb-planning__shift-pill " +
                    (isLeave
                      ? "cb-planning__shift-pill--leave"
                      : "cb-planning__shift-pill--" + cell.mode)
                  }
                >
                  <span>{label}</span>
                  {hours > 0 && (
                    <span className="cb-planning__shift-hours">
                      {hours.toFixed(1)}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

    return (
      <section className="cb-planning-main">
        <div className="cb-planning__mobile-employees">
          {areaEmployees.map((emp) => {
            const isActive = selectedEmployeeId === emp.id;

            return (
              <div key={emp.id}>
                <div
                  className={
                    "cb-planning__mobile-emp-row" +
                    (isActive ? " cb-planning__mobile-emp-row--active" : "")
                  }
                  onClick={() =>
                    setSelectedEmployeeId((prev) =>
                      prev === emp.id ? null : emp.id
                    )
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className={
                        "cb-role-dot cb-role-dot--" + roleSlug(emp.role)
                      }
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {emp.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {emp.role}
                      </div>
                    </div>
                  </div>
                </div>

                {isActive && renderEmployeePlanning(emp)}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  /* ===== TABLE IMPRIMABLE – ÉQUIPE ENTIÈRE ===== */

  const renderPrintTable = () => {
    const allRoles: Role[] = [
      "Patron",
      "Responsable",
      "Barman",
      "Serveur",
      "Cuisine",
    ];

    return (
      <section className="cb-planning__print-wrapper">
        <h1>Planning de l&apos;équipe – Cavalier Bleu</h1>
        <p>{weekLabel}</p>

        <div className="cb-planning__table-wrapper">
          <table className="cb-planning__table">
            <thead>
              <tr>
                <th className="cb-planning__head-cell">Employé</th>
                {DAYS.map((d) => (
                  <th key={d.key} className="cb-planning__head-cell">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>

            {allRoles.map((role) => {
              const list = groupedByRole[role];
              if (!list || list.length === 0) return null;

              return (
                <tbody key={role}>
                  <tr className="cb-planning__section-row">
                    <td colSpan={DAYS.length + 1}>{role}</td>
                  </tr>

                  {list.map((emp) => (
                    <tr key={emp.id}>
                      <td className="cb-planning__employee-cell">
                        {emp.name}
                      </td>
                      {DAYS.map((d) => {
                        const isLeave = hasApprovedLeave(emp.id, d.key);
                        const cell = getCell(emp.id, d.key);

                        let start = cell.start;
                        let end = cell.end;
                        if ((!start || !end) && cell.mode !== "custom") {
                          const preset = getPresetForMode(cell.mode);
                          start = preset.start;
                          end = preset.end;
                        }

                        let label = "";
                        if (isLeave) {
                          label = "Congé";
                        } else if (cell.mode === "off") {
                          label = "Off";
                        } else if (start && end) {
                          label = `${start}–${end}`;
                        } else {
                          label = modeLabel(cell.mode);
                        }

                        return (
                          <td key={d.key} className="cb-planning__cell">
                            {label}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </section>
    );
  };

  return (
    <div>
      <div
        className="cb-planning__header"
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h2>Planning de l&apos;équipe</h2>
          <p style={{ fontSize: 13, color: "#64748b" }}>{weekLabel}</p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setArea("salle")}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                border: "none",
                background: area === "salle" ? "#0f172a" : "transparent",
                color: area === "salle" ? "#ffffff" : "#0f172a",
                cursor: "pointer",
              }}
            >
              Salle
            </button>
            <button
              type="button"
              onClick={() => setArea("cuisine")}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                border: "none",
                background: area === "cuisine" ? "#0f172a" : "transparent",
                color: area === "cuisine" ? "#ffffff" : "#0f172a",
                cursor: "pointer",
              }}
            >
              Cuisine
            </button>
          </div>

          <button
            type="button"
            className="cb-button cb-button--ghost"
            onClick={handleResetAll}
          >
            Réinitialiser
          </button>
          <button
            type="button"
            className="cb-button cb-button--ghost"
            onClick={handleExportPdf}
          >
            PDF
          </button>
          <button
            type="button"
            className="cb-button cb-button--secondary"
            onClick={handleCopyPlanning}
          >
            Copier
          </button>
          <button
            type="button"
            className="cb-button cb-button--secondary"
            onClick={handleEmailPlanning}
          >
            E-mail
          </button>
        </div>
      </div>

      {/* RÉCAP GLOBAL */}
      <section className="cb-planning-summary cb-card">
        <div className="cb-planning-summary__top">
          <span className="cb-planning-summary__badge">
            Vue {area === "salle" ? "Salle" : "Cuisine"}
          </span>
          <span className="cb-planning-summary__hint">
            Basé sur les taux horaires de la page Employés
          </span>
        </div>

        <div className="cb-planning-summary__numbers">
          <div className="cb-planning-summary__item">
            <span className="cb-planning-summary__label">
              Heures payées semaine
            </span>
            <span className="cb-planning-summary__value">
              {stats.totalHours.toFixed(1)} h
            </span>
          </div>

          <div className="cb-planning-summary__item">
            <span className="cb-planning-summary__label">Coût salaires</span>
            <span className="cb-planning-summary__value">
              {stats.baseCost.toFixed(2)} €
            </span>
          </div>

          <div className="cb-planning-summary__item">
            <span className="cb-planning-summary__label">
              Charges patronales ({chargeRate}%)
            </span>
            <span className="cb-planning-summary__value">
              {stats.charges.toFixed(2)} €
            </span>
          </div>

          <div className="cb-planning-summary__item cb-planning-summary__item--highlight">
            <span className="cb-planning-summary__label">Coût total</span>
            <span className="cb-planning-summary__value">
              {stats.totalCost.toFixed(2)} €
            </span>
          </div>
        </div>

        <div className="cb-planning-summary__controls">
          <label className="cb-planning-summary__charge-label">
            Charges patronales estimées
            <input
              type="number"
              min={0}
              max={100}
              value={chargeRate}
              onChange={(e) =>
                setChargeRate(
                  Number.isNaN(Number(e.target.value))
                    ? 0
                    : Number(e.target.value)
                )
              }
            />
            <span>%</span>
          </label>
        </div>
      </section>

      {isMobile ? renderMobileView() : renderDesktopView()}

      {renderPrintTable()}

      {dialogInfo && (
        <div className="cb-modal-backdrop" onClick={closeDialog}>
          <div className="cb-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cb-modal__title">Choisir le shift</h3>
            <p className="cb-modal__subtitle">
              {dialogEmployee?.name ?? ""} – {dialogDay?.label ?? ""}
            </p>

            <div className="cb-modal__list">
              {(
                ["off", "midi", "soir", "journee", "custom"] as CellMode[]
              ).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className="cb-modal__list-btn"
                  onClick={() =>
                    handleModeSelect(dialogInfo.employeeId, dialogInfo.day, mode)
                  }
                >
                  {modeLabel(mode)}
                </button>
              ))}
            </div>

            <div className="cb-modal__actions">
              <button
                type="button"
                className="cb-modal__secondary"
                onClick={() =>
                  handleCopyDayToWeek(dialogInfo.employeeId, dialogInfo.day)
                }
              >
                Copier sur la semaine
              </button>
              <button
                type="button"
                className="cb-modal__primary"
                onClick={closeDialog}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}