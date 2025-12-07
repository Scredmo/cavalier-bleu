"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type Employee = {
  id: string;
  name: string;
  role: Role;
  hourlyRate?: number;
};

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
  ca?: number;
};

type PresenceState = {
  [key: string]: PresenceRecord; // `${date}::${employeeId}`
};

type EmployeeRequest = {
  id: string;
  employeeId: string;
  type: "retard" | "conge" | "absence";
  date: string; // "YYYY-MM-DD"
  heure?: string;
  message?: string;
  treated: boolean;
  createdAt?: string;
};

type ExpenseItem = {
  id: string;
  date: string;
  label: string;
  amount: number;
};

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";
const STORAGE_PLANNING_KEY = "CB_PLANNING_V2";
const STORAGE_PRESENCE_KEY = "CB_PRESENCE_V1";
const STORAGE_REQUESTS_KEY = "CB_REQUESTS";
const STORAGE_EXPENSES_KEY = "CB_EXPENSES_V1";

type DayKey =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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

export default function DashboardPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [planning, setPlanning] = useState<PlanningState>({});
  const [presence, setPresence] = useState<PresenceState>({});
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const dayKey = useMemo(() => dateToDayKey(date), [date]);

  // Charger employés
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Employee[];
        if (Array.isArray(parsed)) {
          setEmployees(parsed);
          return;
        }
      }
    } catch (err) {
      console.error("Erreur chargement employés (dashboard)", err);
    }
  }, []);

  // Charger planning
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
            normalized[key] = {
              mode: (val.mode ?? "off") as CellMode,
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
      console.error("Erreur chargement planning (dashboard)", err);
    }
  }, []);

  // Charger présences
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PRESENCE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PresenceState;
      if (parsed && typeof parsed === "object") {
        setPresence(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement présences (dashboard)", err);
    }
  }, []);

  // Charger demandes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_REQUESTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EmployeeRequest[];
      if (Array.isArray(parsed)) {
        setRequests(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement demandes (dashboard)", err);
    }
  }, []);

  // Charger dépenses
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (!raw) return;

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
    } catch (err) {
      console.error("Erreur chargement dépenses (dashboard)", err);
    }
  }, []);

  // --- INDICATEURS ---

  // 1) Planning du jour : nombre de personnes planifiées & heures prévues
  const planningToday = useMemo(() => {
    let countPlanned = 0;
    let totalPlannedHours = 0;

    employees.forEach((emp) => {
      const key = `${emp.id}-${dayKey}`;
      const cell = planning[key];
      if (!cell || cell.mode === "off") return;

      let start = cell.start;
      let end = cell.end;

      if ((!start || !end) && cell.mode !== "custom") {
        const preset = getPresetForMode(cell.mode);
        start = preset.start;
        end = preset.end;
      }

      const h = parseHours(start, end);
      if (h > 0) {
        countPlanned += 1;
        totalPlannedHours += h;
      }
    });

    return { countPlanned, totalPlannedHours };
  }, [employees, planning, dayKey]);

  // 2) Présence du jour : heures payées + CA total
  const presenceToday = useMemo(() => {
    const prefix = `${date}::`;
    let totalHours = 0;
    let totalCA = 0;

    Object.entries(presence).forEach(([key, rec]) => {
      if (!key.startsWith(prefix)) return;
      if (!rec.present || !rec.start || !rec.end) return;
      const h = parseHours(rec.start, rec.end);
      totalHours += h;
      if (typeof rec.ca === "number" && rec.ca > 0) {
        totalCA += rec.ca;
      }
    });

    return { totalHours, totalCA };
  }, [presence, date]);

  // 3) Demandes en attente
  const pendingRequests = useMemo(
    () => requests.filter((r) => !r.treated),
    [requests]
  );

  // 4) Dépenses du jour
  const expensesToday = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );
  const totalExpensesToday = expensesToday.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(date));

  return (
    <div>
      {/* HEADER */}
      <div className="cb-dashboard-header">
        <div>
          <h2 className="cb-dashboard__title">Tableau de bord</h2>
          <p className="cb-dashboard__subtitle">
            Vue d&apos;ensemble de ta journée au Cavalier Bleu
          </p>
        </div>

        <div className="cb-dashboard-header__right">
          <span className="cb-dashboard-header__date">{formattedDate}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="cb-input-date"
          />
        </div>
      </div>

      {/* CARDS PRINCIPALES */}
      <section className="cb-dashboard-grid">
        {/* Planning */}
        <article className="cb-card cb-dashboard-card">
          <header className="cb-dashboard-card__header">
            <div>
              <h3 className="cb-dashboard-card__title">Planning du jour</h3>
              <p className="cb-dashboard-card__subtitle">
                À partir du planning hebdomadaire
              </p>
            </div>
            <a href="/planning" className="cb-dashboard-card__link">
              Ouvrir le planning →
            </a>
          </header>

          <div className="cb-dashboard-card__stats">
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                Collaborateurs planifiés
              </span>
              <span className="cb-dashboard-stat__value">
                {planningToday.countPlanned}
              </span>
            </div>
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                Heures prévues aujourd&apos;hui
              </span>
              <span className="cb-dashboard-stat__value">
                {planningToday.totalPlannedHours.toFixed(1)} h
              </span>
            </div>
          </div>
        </article>

        {/* Présence & CA */}
        <article className="cb-card cb-dashboard-card">
          <header className="cb-dashboard-card__header">
            <div>
              <h3 className="cb-dashboard-card__title">Présence & CA</h3>
              <p className="cb-dashboard-card__subtitle">
                Basé sur la feuille de présences
              </p>
            </div>
            <a href="/presence" className="cb-dashboard-card__link">
              Feuille de présence →
            </a>
          </header>

          <div className="cb-dashboard-card__stats">
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                Heures payées (saisies)
              </span>
              <span className="cb-dashboard-stat__value">
                {presenceToday.totalHours.toFixed(1)} h
              </span>
            </div>
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                CA saisi aujourd&apos;hui
              </span>
              <span className="cb-dashboard-stat__value">
                {presenceToday.totalCA.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          </div>
        </article>

        {/* Demandes */}
        <article className="cb-card cb-dashboard-card">
          <header className="cb-dashboard-card__header">
            <div>
              <h3 className="cb-dashboard-card__title">Demandes employés</h3>
              <p className="cb-dashboard-card__subtitle">
                Retards, congés, absences
              </p>
            </div>
            <a href="/demandes" className="cb-dashboard-card__link">
              Gérer les demandes →
            </a>
          </header>

          <div className="cb-dashboard-card__stats">
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                En attente de traitement
              </span>
              <span className="cb-dashboard-stat__value">
                {pendingRequests.length}
              </span>
            </div>
            {pendingRequests.length > 0 && (
              <ul className="cb-dashboard-requests">
                {pendingRequests.slice(0, 3).map((r) => (
                  <li key={r.id}>
                    <span className="cb-dashboard-requests__type">
                      {r.type === "conge"
                        ? "Congé"
                        : r.type === "retard"
                        ? "Retard"
                        : "Absence"}
                    </span>
                    <span className="cb-dashboard-requests__date">
                      {r.date}
                    </span>
                  </li>
                ))}
                {pendingRequests.length > 3 && (
                  <li className="cb-dashboard-requests__more">
                    + {pendingRequests.length - 3} autres demandes
                  </li>
                )}
              </ul>
            )}
          </div>
        </article>

        {/* Dépenses */}
        <article className="cb-card cb-dashboard-card">
          <header className="cb-dashboard-card__header">
            <div>
              <h3 className="cb-dashboard-card__title">Dépenses du jour</h3>
              <p className="cb-dashboard-card__subtitle">
                Extras service / achats ponctuels
              </p>
            </div>
            <a href="/depenses" className="cb-dashboard-card__link">
              Gérer les dépenses →
            </a>
          </header>

          <div className="cb-dashboard-card__stats">
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                Nombre de dépenses
              </span>
              <span className="cb-dashboard-stat__value">
                {expensesToday.length}
              </span>
            </div>
            <div className="cb-dashboard-stat">
              <span className="cb-dashboard-stat__label">
                Total dépenses du jour
              </span>
              <span className="cb-dashboard-stat__value">
                {totalExpensesToday.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}