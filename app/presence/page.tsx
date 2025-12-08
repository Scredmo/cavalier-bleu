"use client";

import { useEffect, useMemo, useState } from "react";

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
  [key: string]: CellSchedule; // `${employeeId}-${dayKey}`
};

type PresenceRecord = {
  present: boolean;
  start?: string;
  end?: string;
  note?: string;
  ca?: number; // CA individuel (salle uniquement)
};

type PresenceState = {
  // `${date}::${employeeId}`
  [key: string]: PresenceRecord;
};

type DayKey =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

type ExpenseItem = {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string;
  amount: number;
};

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

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";
const STORAGE_PLANNING_KEY = "CB_PLANNING_V2";
const STORAGE_PRESENCE_KEY = "CB_PRESENCE_V1";
const STORAGE_EXPENSES_KEY = "CB_EXPENSES_V1"; // à utiliser aussi sur la page Dépenses

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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

function dateToDayKey(date: string): DayKey {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche
  switch (day) {
    case 0:
      return "dimanche";
    case 1:
      return "lundi";
    case 2:
      return "mardi";
    case 3:
      return "mercredi";
    case 4:
      return "jeudi";
    case 5:
      return "vendredi";
    case 6:
    default:
      return "samedi";
  }
}

export default function PresencePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState<string>(todayISO());
  const [presence, setPresence] = useState<PresenceState>({});
  const [planning, setPlanning] = useState<PlanningState>({});
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // Charger les employés (connecté à la page Employés)
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
      console.error("Erreur chargement employés (présence)", err);
    }

    setEmployees(
      EMPLOYEES_BASE.map((e) => ({
        ...e,
        hourlyRate: 0,
      }))
    );
  }, []);

  // Charger le planning (pour pré-remplir la présence)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PLANNING_KEY);
      if (!raw) return;
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

      setPlanning(normalized);
    } catch (err) {
      console.error("Erreur chargement planning pour présence", err);
    }
  }, []);

  // Charger présences
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PRESENCE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PresenceState;
        if (parsed && typeof parsed === "object") {
          setPresence(parsed);
        }
      }
    } catch (err) {
      console.error("Erreur chargement présences", err);
    }
  }, []);

  // Sauvegarde présences
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PRESENCE_KEY, JSON.stringify(presence));
  }, [presence]);

  // Charger dépenses (venues de la page Dépenses)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | ExpenseItem[]
          | { [date: string]: ExpenseItem[] };
        if (Array.isArray(parsed)) {
          setExpenses(parsed);
        } else if (parsed && typeof parsed === "object") {
          const flat: ExpenseItem[] = [];
          Object.keys(parsed).forEach((d) => {
            const arr = (parsed as any)[d];
            if (Array.isArray(arr)) {
              arr.forEach((item: any) => {
                flat.push({
                  id: item.id ?? `${d}-${item.label}`,
                  date: item.date ?? d,
                  label: item.label ?? "",
                  amount: Number(item.amount) || 0,
                });
              });
            }
          });
          setExpenses(flat);
        }
      }
    } catch (err) {
      console.error("Erreur chargement dépenses", err);
    }
  }, []);

  const getPresenceKey = (d: string, employeeId: string) =>
    `${d}::${employeeId}`;

  const getRecord = (d: string, employeeId: string): PresenceRecord => {
    const key = getPresenceKey(d, employeeId);
    return presence[key] ?? { present: false };
  };

  const updateRecord = (
    d: string,
    employeeId: string,
    updater: (prev: PresenceRecord) => PresenceRecord
  ) => {
    const key = getPresenceKey(d, employeeId);
    setPresence((prev) => {
      const current = prev[key] ?? { present: false };
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  // Pré-remplissage auto depuis le planning
  useEffect(() => {
    if (!date || employees.length === 0) return;
    if (Object.keys(planning).length === 0) return;

    const dayKey = dateToDayKey(date);

    setPresence((prev) => {
      const next: PresenceState = { ...prev };

      for (const emp of employees) {
        const pKey = getPresenceKey(date, emp.id);
        const existing = next[pKey];

        // si déjà rempli (présent / heures / note / CA), on ne touche pas
        if (
          existing &&
          (existing.present ||
            existing.start ||
            existing.end ||
            (existing.note && existing.note.trim() !== "") ||
            typeof existing.ca === "number")
        ) {
          continue;
        }

        const planningKey = `${emp.id}-${dayKey}`;
        const cell = planning[planningKey];

        if (!cell || cell.mode === "off") {
          continue;
        }

        let start = cell.start;
        let end = cell.end;
        if ((!start || !end) && cell.mode !== "custom") {
          const preset = getPresetForMode(cell.mode);
          start = preset.start;
          end = preset.end;
        }

        if (!start || !end) {
          continue;
        }

        next[pKey] = {
          present: true,
          start,
          end,
        };
      }

      return next;
    });
  }, [date, employees, planning]);

  const handleTogglePresent = (employeeId: string) => {
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      present: !prev.present,
    }));
  };

  const handleTimeChange = (
    employeeId: string,
    field: "start" | "end",
    value: string
  ) => {
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      [field]: value || undefined,
      present: true,
    }));
  };

  const handleNoteChange = (employeeId: string, value: string) => {
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      note: value || undefined,
    }));
  };

  const handleCAChange = (employeeId: string, value: string) => {
    const raw = value.replace(",", ".");
    const num = Number(raw);
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      ca: Number.isNaN(num) ? undefined : num,
    }));
  };

  const handleResetDay = () => {
    if (!window.confirm("Effacer la feuille de présence de cette journée ?"))
      return;

    setPresence((prev) => {
      const next: PresenceState = {};
      const prefix = `${date}::`;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
        }
      }
      return next;
    });
  };

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  // Totaux heures + coût jour
  const totals = useMemo(() => {
    let totalHours = 0;
    let totalCost = 0;

    employees.forEach((emp) => {
      const rec = getRecord(date, emp.id);
      const hours =
        rec.present && rec.start && rec.end
          ? parseHours(rec.start, rec.end)
          : 0;
      const cost = hours * (emp.hourlyRate ?? 0);

      totalHours += hours;
      totalCost += cost;
    });

    return {
      totalHours,
      totalCost,
    };
  }, [employees, presence, date]);

  // CA individuel → CA global (serveurs + bar)
  const caByRole = useMemo(() => {
    let caService = 0; // Patron + Responsable + Serveurs
    let caBar = 0; // Barman

    employees.forEach((emp) => {
      const rec = getRecord(date, emp.id);
      if (typeof rec.ca !== "number" || rec.ca <= 0) return;

      if (emp.role === "Barman") {
        caBar += rec.ca;
      } else if (
        emp.role === "Patron" ||
        emp.role === "Responsable" ||
        emp.role === "Serveur"
      ) {
        caService += rec.ca;
      }
    });

    return {
      caService,
      caBar,
      caTotal: caService + caBar,
    };
  }, [employees, presence, date]);

  // Dépenses du jour
  const expensesForDay = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );

  const totalExpenses = expensesForDay.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const chargesRate = 45; // % charges patronales
  const salaryCost = totals.totalCost;
  const realCost = salaryCost * (1 + chargesRate / 100);
  const masseSalarialePct =
    caByRole.caTotal > 0 ? (realCost / caByRole.caTotal) * 100 : null;

  const formattedDateLong = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(new Date(date));

  return (
    <div>
      {/* HEADER */}
      <div className="cb-planning__header cb-presence__header">
        <div>
          <h2 className="cb-dashboard__title">Feuille de présence</h2>
          <p className="cb-dashboard__subtitle">
            Suivi quotidien de l&apos;équipe
          </p>
        </div>

        <div className="cb-presence__header-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="cb-input-date"
          />
          <button
            type="button"
            className="cb-button cb-button--ghost"
            onClick={handleResetDay}
          >
            Réinitialiser
          </button>
          <button
            type="button"
            className="cb-button cb-button--secondary"
            onClick={handleExportPdf}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* RÉCAP JOURNALIER */}
      <section className="cb-card cb-presence-summary">
        <div className="cb-presence-summary__row">
          <div>
            <span className="cb-presence-summary__label">
              CA Serveurs (Patron / Resp / Serv.)
            </span>
            <div className="cb-presence-summary__value">
              {caByRole.caService.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">CA Bar (Barman)</span>
            <div className="cb-presence-summary__value">
              {caByRole.caBar.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">
              CA total journalier
            </span>
            <div className="cb-presence-summary__value">
              {caByRole.caTotal.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
        </div>

        <div className="cb-presence-summary__row">
          <div>
            <span className="cb-presence-summary__label">
              Heures totales payées (jour)
            </span>
            <div className="cb-presence-summary__value">
              {totals.totalHours.toFixed(1)} h
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">
              Coût salarial brut
            </span>
            <div className="cb-presence-summary__value">
              {salaryCost.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">
              Coût réel avec charges (~{chargesRate}%)
            </span>
            <div className="cb-presence-summary__value">
              {realCost.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
        </div>

        <div className="cb-presence-summary__row">
          <div>
            <span className="cb-presence-summary__label">
              Masse salariale / CA
            </span>
            <div className="cb-presence-summary__value">
              {masseSalarialePct !== null
                ? `${masseSalarialePct.toFixed(1)} %`
                : "—"}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">
              Dépenses journalières
            </span>
            <div className="cb-presence-summary__value">
              {totalExpenses.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
        </div>

        <p className="cb-presence-summary__hint">
          Planning pré-rempli automatiquement. Complète les présences, les CA
          individuels et les dépenses journalières pour avoir une vision
          complète de ta journée.
        </p>
      </section>

 {/* TABLEAU PRINCIPAL (ÉCRAN + MOBILE) */}
<section className="cb-card cb-presence-main">
  <div className="cb-presence__table-wrapper">
    <table className="cb-presence__table cb-presence__table--main">
      <thead>
        <tr>
          <th>Employé</th>
          <th>Présent</th>
          <th>Arrivée</th>
          <th>Départ</th>
          <th>Heures</th>
          <th>CA individuel</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp) => {
          const rec = getRecord(date, emp.id);
          const hours =
            rec.present && rec.start && rec.end
              ? parseHours(rec.start, rec.end)
              : 0;

          const isCuisine = emp.role === "Cuisine";

          return (
            <tr key={emp.id} className="cb-presence__row">
              {/* Employé */}
              <td className="cb-presence__cell cb-presence__cell--employee">
                <span className="cb-presence__cell-label">Employé</span>
                <div className="cb-presence__employee-cell">
                  <span
                    className={
                      "cb-role-dot cb-role-dot--" + roleSlug(emp.role)
                    }
                  />
                  <div>
                    <div className="cb-presence__employee-name">
                      {emp.name}
                    </div>
                    <div className="cb-presence__employee-role">
                      {emp.role}
                    </div>
                  </div>
                </div>
              </td>

              {/* Présent */}
              <td className="cb-presence__cell cb-presence__cell--present">
                <span className="cb-presence__cell-label">Présent</span>
                <label className="cb-presence__checkbox">
                  <input
                    type="checkbox"
                    checked={rec.present}
                    onChange={() => handleTogglePresent(emp.id)}
                  />
                  <span />
                </label>
              </td>

              {/* Arrivée */}
              <td className="cb-presence__cell cb-presence__cell--start">
                <span className="cb-presence__cell-label">Arrivée</span>
                <input
                  type="time"
                  value={rec.start ?? ""}
                  onChange={(e) =>
                    handleTimeChange(emp.id, "start", e.target.value)
                  }
                  className="cb-presence__time-input"
                />
              </td>

              {/* Départ */}
              <td className="cb-presence__cell cb-presence__cell--end">
                <span className="cb-presence__cell-label">Départ</span>
                <input
                  type="time"
                  value={rec.end ?? ""}
                  onChange={(e) =>
                    handleTimeChange(emp.id, "end", e.target.value)
                  }
                  className="cb-presence__time-input"
                />
              </td>

              {/* Heures */}
              <td className="cb-presence__cell cb-presence__cell--hours">
                <span className="cb-presence__cell-label">Heures</span>
                <span className="cb-presence__hours-value">
                  {hours > 0 ? `${hours.toFixed(1)} h` : "—"}
                </span>
              </td>

              {/* CA individuel */}
              <td className="cb-presence__cell cb-presence__cell--ca">
                <span className="cb-presence__cell-label">
                  CA individuel
                </span>
                {isCuisine ? (
                  <span className="cb-presence__ca-disabled">—</span>
                ) : (
                  <input
                    type="number"
                    className="cb-presence__ca-input"
                    value={
                      typeof rec.ca === "number" && rec.ca > 0
                        ? rec.ca
                        : ""
                    }
                    onChange={(e) =>
                      handleCAChange(emp.id, e.target.value)
                    }
                    placeholder="0,00"
                  />
                )}
              </td>

              {/* Note */}
              <td className="cb-presence__cell cb-presence__cell--note">
                <span className="cb-presence__cell-label">Note</span>
                <input
                  type="text"
                  value={rec.note ?? ""}
                  onChange={(e) =>
                    handleNoteChange(emp.id, e.target.value)
                  }
                  placeholder="Retard, pause, remarque..."
                  className="cb-presence__note-input"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>

      {/* VERSION PDF / IMPRESSION */}
      <section className="cb-presence-print">
        <h1>Feuille de présences</h1>
        <p className="cb-presence-print__subtitle">
          Journée de travail · Responsable / Patron
        </p>
        <p className="cb-presence-print__subtitle">
          Date : {formattedDateLong}
        </p>

        <div className="cb-presence-print__block">
          <div className="cb-presence-print__row">
            <span>CA Serveurs (Patron / Resp / Serv.)</span>
            <strong>
              {caByRole.caService.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
          <div className="cb-presence-print__row">
            <span>CA Bar (Barman)</span>
            <strong>
              {caByRole.caBar.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
          <div className="cb-presence-print__row cb-presence-print__row--total">
            <span>CA total journalier</span>
            <strong>
              {caByRole.caTotal.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
        </div>

        <div className="cb-presence-print__block">
          <div className="cb-presence-print__row">
            <span>Heures totales payées (jour)</span>
            <strong>{totals.totalHours.toFixed(1)} h</strong>
          </div>
          <div className="cb-presence-print__row">
            <span>Coût salarial (brut horaire)</span>
            <strong>
              {salaryCost.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
          <div className="cb-presence-print__row">
            <span>Coût réel avec charges (~{chargesRate}%)</span>
            <strong>
              {realCost.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
          {masseSalarialePct !== null && (
            <div className="cb-presence-print__row cb-presence-print__row--note">
              <span>
                Masse salariale ≈ {masseSalarialePct.toFixed(1)}% du CA
              </span>
            </div>
          )}
        </div>

        <div className="cb-presence-print__block">
          <h2>Détail par employé</h2>
          <div className="cb-presence__table-wrapper cb-presence-print__table-wrapper">
            <table className="cb-presence__table cb-presence-print__table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Heures payées</th>
                  <th>CA individuel</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const rec = getRecord(date, emp.id);
                  const hours =
                    rec.present && rec.start && rec.end
                      ? parseHours(rec.start, rec.end)
                      : 0;
                  const cost = hours * (emp.hourlyRate ?? 0);

                  return (
                    <tr key={emp.id}>
                      <td>{emp.name}</td>
                      <td>{emp.role}</td>
                      <td>{rec.start ?? ""}</td>
                      <td>{rec.end ?? ""}</td>
                      <td>{hours > 0 ? `${hours.toFixed(1)} h` : ""}</td>
                      <td>
                        {rec.ca && rec.ca > 0
                          ? rec.ca.toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })
                          : ""}
                      </td>
                      <td>
                        {cost > 0
                          ? cost.toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "EUR",
                            })
                          : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="cb-presence-print__block">
          <h2>Dépenses journalières (extras service)</h2>
          {expensesForDay.length === 0 ? (
            <p>Aucune dépense saisie.</p>
          ) : (
            <table className="cb-presence-print__table">
              <tbody>
                {expensesForDay.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.label}</td>
                    <td style={{ textAlign: "right" }}>
                      {exp.amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 600 }}>Total dépenses</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {totalExpenses.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}