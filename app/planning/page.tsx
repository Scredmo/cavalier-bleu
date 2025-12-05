"use client";

import { useEffect, useState } from "react";

type DayKey =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

type Role =
  | "Patron"
  | "Responsable"
  | "Barman"
  | "Cuisine"
  | "Serveur";

type Employee = {
  id: string;
  name: string;
  role: Role;
};

type CellMode = "off" | "midi" | "soir" | "journee" | "custom";

type CellSchedule = {
  mode: CellMode;
  start?: string; // "HH:MM"
  end?: string; // "HH:MM"
};

type PlanningState = {
  [key: string]: CellSchedule; // `${employeeId}-${day}` -> CellSchedule
};

const EMPLOYEES: Employee[] = [
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

const STORAGE_KEY = "cb-planning-advanced-v1";

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

export default function PlanningPage() {
  const [planning, setPlanning] = useState<PlanningState>({});
  const [weekLabel, setWeekLabel] = useState<string>("Semaine en cours");

  const [sourceEmployeeId, setSourceEmployeeId] = useState<string>("amine");
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("tom");

  // Pour le drag & drop
  const [dragSourceKey, setDragSourceKey] = useState<string | null>(null);

  // INIT
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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

        setPlanning((current) => {
          if (Object.keys(normalized).length === 0) return current;
          return normalized;
        });
      }

      // Si toujours vide, on initialise tout à Off
      setPlanning((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: PlanningState = {};
        for (const emp of EMPLOYEES) {
          for (const day of DAYS) {
            initial[`${emp.id}-${day.key}`] = { mode: "off" };
          }
        }
        return initial;
      });
    } catch (err) {
      console.error("Erreur chargement planning", err);
    }

    // Label semaine
    const today = new Date();
    const monday = new Date(today);
    const wd = monday.getDay(); // 0 dimanche
    const diff = (wd === 0 ? -6 : 1) - wd;
    monday.setDate(today.getDate() + diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
    setWeekLabel(`Semaine du ${fmt.format(monday)} au ${fmt.format(sunday)}`);
  }, []);

  // Sauvegarde
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(planning));
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

  const handleModeChange = (
    employeeId: string,
    day: DayKey,
    mode: CellMode
  ) => {
    updateCell(employeeId, day, () => {
      const preset = getPresetForMode(mode);
      return {
        mode,
        ...preset,
      };
    });
  };

  const handleTimeChange = (
    employeeId: string,
    day: DayKey,
    field: "start" | "end",
    value: string
  ) => {
    updateCell(employeeId, day, (prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleResetAll = () => {
    if (!window.confirm("Réinitialiser tout le planning à Off ?")) return;
    const next: PlanningState = {};
    for (const emp of EMPLOYEES) {
      for (const day of DAYS) {
        next[getKey(emp.id, day.key)] = { mode: "off" };
      }
    }
    setPlanning(next);
  };

  const handleDuplicateWeek = () => {
    if (!sourceEmployeeId || !targetEmployeeId || sourceEmployeeId === targetEmployeeId) return;

    const next: PlanningState = { ...planning };
    for (const d of DAYS) {
      const fromKey = getKey(sourceEmployeeId, d.key);
      const toKey = getKey(targetEmployeeId, d.key);
      next[toKey] = planning[fromKey] ?? { mode: "off" };
    }
    setPlanning(next);
  };

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

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const generatePlanningText = (): string => {
    let text = `Planning Cavalier Bleu\n${weekLabel}\n\n`;

    const salleRoles: Role[] = ["Patron", "Responsable", "Barman", "Serveur"];
    const cuisineRoles: Role[] = ["Cuisine"];

    const addSection = (title: string, roles: Role[]) => {
      text += `${title.toUpperCase()}\n`;
      const employees = EMPLOYEES.filter((e) => roles.includes(e.role));
      for (const emp of employees) {
        text += `\n${emp.name} (${emp.role})\n`;
        for (const d of DAYS) {
          const cell = getCell(emp.id, d.key);
          let line = "";
          if (cell.mode === "off") {
            line = "Off";
          } else if (cell.start && cell.end) {
            line = `${cell.start} - ${cell.end}`;
          } else {
            line = modeLabel(cell.mode);
          }
          text += `  ${d.label} : ${line}\n`;
        }
      }
      text += "\n";
    };

    addSection("Salle", salleRoles);
    addSection("Cuisine", cuisineRoles);

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
    const subject = `Planning Cavalier Bleu - ${weekLabel}`;
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

  for (const emp of EMPLOYEES) {
    groupedByRole[emp.role].push(emp);
  }

  const salleRoles: Role[] = ["Patron", "Responsable", "Barman", "Serveur"];
  const cuisineRoles: Role[] = ["Cuisine"];

  const renderRowsForRoles = (roles: Role[]) => {
    return roles.map((role) => {
      const list = groupedByRole[role];
      if (!list || list.length === 0) return null;

      return (
        <tbody key={role}>
          <tr className="cb-planning__role-row">
            <td className="cb-planning__role-cell" colSpan={DAYS.length + 1}>
              {role}
            </td>
          </tr>
          {list.map((emp) => (
            <tr key={emp.id} className="cb-planning__row">
              <th className="cb-planning__employee-cell">{emp.name}</th>
              {DAYS.map((d) => {
                const cell = getCell(emp.id, d.key);
                const key = getKey(emp.id, d.key);

                return (
                  <td
                    key={d.key}
                    className="cb-planning__cell"
                    draggable
                    onDragStart={() => handleDragStart(emp.id, d.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(emp.id, d.key)}
                  >
                    <select
                      className={`cb-planning__select cb-planning__select--${cell.mode}`}
                      value={cell.mode}
                      onChange={(e) =>
                        handleModeChange(
                          emp.id,
                          d.key,
                          e.target.value as CellMode
                        )
                      }
                    >
                      <option value="off">{modeLabel("off")}</option>
                      <option value="midi">{modeLabel("midi")}</option>
                      <option value="soir">{modeLabel("soir")}</option>
                      <option value="journee">{modeLabel("journee")}</option>
                      <option value="custom">{modeLabel("custom")}</option>
                    </select>

                    {cell.mode !== "off" && (
                      <div className="cb-planning__hours">
                        <input
                          type="time"
                          value={cell.start ?? ""}
                          onChange={(e) =>
                            handleTimeChange(
                              emp.id,
                              d.key,
                              "start",
                              e.target.value
                            )
                          }
                          aria-label={`Heure début ${key}`}
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={cell.end ?? ""}
                          onChange={(e) =>
                            handleTimeChange(
                              emp.id,
                              d.key,
                              "end",
                              e.target.value
                            )
                          }
                          aria-label={`Heure fin ${key}`}
                        />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      );
    });
  };

  return (
    <div className="cb-planning">
      <div className="cb-planning__top">
        <div>
          <h2 className="cb-dashboard__title">Planning de l&apos;équipe</h2>
          <p className="cb-dashboard__subtitle">{weekLabel}</p>
        </div>

        <div className="cb-planning__actions">
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

      <div className="cb-planning__duplicate-bar">
        <span>Dupliquer la semaine :</span>
        <select
          value={sourceEmployeeId}
          onChange={(e) => setSourceEmployeeId(e.target.value)}
        >
          {EMPLOYEES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <span>→</span>
        <select
          value={targetEmployeeId}
          onChange={(e) => setTargetEmployeeId(e.target.value)}
        >
          {EMPLOYEES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cb-button cb-button--ghost"
          onClick={handleDuplicateWeek}
        >
          Dupliquer
        </button>
      </div>

      <div className="cb-planning__legend">
        <span>Midi : 12h–15h</span>
        <span>Soir : 19h–23h</span>
        <span>Journée : 10h–23h</span>
        <span>Perso : horaires à saisir</span>
        <span>Glisser-déposer pour copier un créneau</span>
      </div>

      <section className="cb-card cb-planning__card">
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

            {/* Salle */}
            <tbody>
              <tr className="cb-planning__section-row">
                <td
                  className="cb-planning__section-cell"
                  colSpan={DAYS.length + 1}
                >
                  Salle
                </td>
              </tr>
            </tbody>
            {renderRowsForRoles(salleRoles)}

            {/* Cuisine */}
            <tbody>
              <tr className="cb-planning__section-row">
                <td
                  className="cb-planning__section-cell"
                  colSpan={DAYS.length + 1}
                >
                  Cuisine
                </td>
              </tr>
            </tbody>
            {renderRowsForRoles(cuisineRoles)}
          </table>
        </div>
      </section>
    </div>
  );
}