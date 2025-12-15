"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// =====================================================
// 🔹 TYPES + CONSTANTES (Présence)
// =====================================================

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
  monthlyContractHours?: number;
};

type Employee = EmployeeBase & { hourlyRate: number; monthlyContractHours: number };

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
const STORAGE_EXPENSES_KEY = "CB_EXPENSES_V1"; // (on intègre maintenant les dépenses ici)

// Caisse (service) + extras de la journée
const STORAGE_CASH_KEY = "CB_CASH_V1";
const STORAGE_PRESENCE_EXTRAS_KEY = "CB_PRESENCE_EXTRAS_V1";
const STORAGE_PRESENCE_ADDITIONS_KEY = "CB_PRESENCE_ADDITIONS_V1";

type PresenceAddition = {
  date: string; // YYYY-MM-DD
  employeeId: string;
};
type PaymentKey = "cb" | "tr" | "amex" | "especes";

type CashRecord = {
  cb?: number;
  tr?: number;
  amex?: number;
  especes?: number;
};

type CashState = {
  // `${date}::${employeeId}`
  [key: string]: CashRecord;
};

type PresenceExtra = {
  id: string; // stable id for that extra
  date: string; // YYYY-MM-DD
  name: string;
  role: Role;
  hourlyRate?: number;
};

// =====================================================
// 🔹 HELPERS
// =====================================================

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

// =====================================================
// 🔹 PAGE PRÉSENCE
//    State -> chargement LS -> dérivés -> rendu
// =====================================================

export default function PresencePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState<string>(todayISO());
  const [presence, setPresence] = useState<PresenceState>({});
  const [planning, setPlanning] = useState<PlanningState>({});
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // Onglets
  const [activeTab, setActiveTab] = useState<"presence" | "caisse" | "depenses" | "recap">("presence");

  // Caisse (service)
  const [cash, setCash] = useState<CashState>({});

  // Extras du jour (ajout manuel)
  const [extras, setExtras] = useState<PresenceExtra[]>([]);
  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [extraName, setExtraName] = useState("");
  const [extraRole, setExtraRole] = useState<Role>("Serveur");
  const [extraRate, setExtraRate] = useState("");
  // Ajouts manuels (employés existants ajoutés à la journée)
  const [additions, setAdditions] = useState<PresenceAddition[]>([]);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  // Charger caisse
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_CASH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CashState;
        if (parsed && typeof parsed === "object") setCash(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement caisse", err);
    }
  }, []);

  // Sauvegarde caisse
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_CASH_KEY, JSON.stringify(cash));
  }, [cash]);

  // Charger extras
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_PRESENCE_EXTRAS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PresenceExtra[];
        if (Array.isArray(parsed)) setExtras(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement extras", err);
    }
  }, []);
  useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_PRESENCE_ADDITIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PresenceAddition[];
      if (Array.isArray(parsed)) setAdditions(parsed);
    }
  } catch (err) {
    console.error("Erreur chargement ajouts présence", err);
  }
}, []);

  // Sauvegarde extras
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_PRESENCE_EXTRAS_KEY,
      JSON.stringify(extras)
    );
  }, [extras]);
  // Sauvegarde dépenses
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_PRESENCE_ADDITIONS_KEY,
    JSON.stringify(additions)
  );
}, [additions]);

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
  monthlyContractHours: Number((match as any)?.monthlyContractHours) || 0,
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
        monthlyContractHours: 0,
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

  const getCashKey = (d: string, employeeId: string) => `${d}::${employeeId}`;

  const getCashRecord = useCallback(
    (d: string, employeeId: string): CashRecord => {
      const key = getCashKey(d, employeeId);
      return cash[key] ?? {};
    },
    [cash]
  );

  const updateCashRecord = (
    d: string,
    employeeId: string,
    updater: (prev: CashRecord) => CashRecord
  ) => {
    const key = getCashKey(d, employeeId);
    setCash((prev) => {
      const current = prev[key] ?? {};
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };

  const dayKey = useMemo(() => dateToDayKey(date), [date]);

  // Employés affichés = UNIQUEMENT ceux planifiés + extras du jour
  const plannedEmployees = useMemo(() => {
    if (!date) return [] as Employee[];
    if (employees.length === 0) return [] as Employee[];

    return employees.filter((emp) => {
      const pKey = `${emp.id}-${dayKey}`;
      const cell = planning[pKey];
      return !!cell && cell.mode !== "off";
    });
  }, [employees, planning, date, dayKey]);

  const extrasForDay = useMemo(() => {
    return extras
      .filter((e) => e.date === date)
      .map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        hourlyRate: e.hourlyRate ?? 0,
        monthlyContractHours: 0,
      })) as Employee[];
  }, [extras, date]);

  const additionsForDay = useMemo(() => {
    const ids = additions
      .filter((a) => a.date === date)
      .map((a) => a.employeeId);

    return ids
      .map((id) => employees.find((e) => e.id === id))
      .filter(Boolean) as Employee[];
  }, [additions, date, employees]);

  const displayedEmployees = useMemo(() => {
    // Empêche doublons id
    const seen = new Set<string>();
    const all = [...plannedEmployees, ...additionsForDay, ...extrasForDay].filter(
      (e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      }
    );
    return all;
  }, [plannedEmployees, additionsForDay, extrasForDay]);

  const getRecord = useCallback(
    (d: string, employeeId: string): PresenceRecord => {
      const key = getPresenceKey(d, employeeId);
      return presence[key] ?? { present: false };
    },
    [presence]
  );

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

  // Pré-remplissage auto depuis le planning (UNIQUEMENT employés planifiés)
  useEffect(() => {
    if (!date || displayedEmployees.length === 0) return;
    if (Object.keys(planning).length === 0) return;

    setPresence((prev) => {
      const next: PresenceState = { ...prev };

      for (const emp of plannedEmployees) {
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
  }, [date, planning, plannedEmployees, displayedEmployees.length, dayKey]);

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

    displayedEmployees.forEach((emp) => {
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
  }, [displayedEmployees, date, getRecord]);

  // CA individuel → CA global (serveurs + bar)
  const caByRole = useMemo(() => {
    let caService = 0; // Patron + Responsable + Serveurs
    let caBar = 0; // Barman

    displayedEmployees.forEach((emp) => {
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
  }, [displayedEmployees, date, getRecord]);

  // Totaux caisse (CB/TR/AMEX/Espèces) pour les employés de service présents
  const cashTotals = useMemo(() => {
    const servicePresent = displayedEmployees.filter((emp) => {
      const rec = getRecord(date, emp.id);
      const isService =
        emp.role === "Patron" || emp.role === "Responsable" || emp.role === "Serveur";
      return isService && rec.present;
    });

    const sum = (k: PaymentKey) =>
      servicePresent.reduce((acc, emp) => {
        const r = getCashRecord(date, emp.id);
        return acc + (r[k] ?? 0);
      }, 0);

    const totalCB = sum("cb");
    const totalTR = sum("tr");
    const totalAMEX = sum("amex");
    const totalESPECES = sum("especes");
    const grand = totalCB + totalTR + totalAMEX + totalESPECES;

    const filledRows = servicePresent.reduce((acc, emp) => {
      const r = getCashRecord(date, emp.id);
      const any =
        typeof r.cb === "number" ||
        typeof r.tr === "number" ||
        typeof r.amex === "number" ||
        typeof r.especes === "number";
      return acc + (any ? 1 : 0);
    }, 0);

    return {
      servicePresentCount: servicePresent.length,
      filledRows,
      totalCB,
      totalTR,
      totalAMEX,
      totalESPECES,
      grand,
    };
  }, [displayedEmployees, date, getRecord, getCashRecord]);

  // Dépenses du jour
  const expensesForDay = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );

  // Complétion simple par onglet (pour badges + hints)
  const tabStatus = useMemo(() => {
    const presentCount = displayedEmployees.filter((emp) => getRecord(date, emp.id).present).length;

    // Une présence est "complète" si présent + start + end
    const presenceFilled = displayedEmployees.reduce((acc, emp) => {
      const rec = getRecord(date, emp.id);
      const ok = rec.present && !!rec.start && !!rec.end;
      return acc + (ok ? 1 : 0);
    }, 0);

    const expensesCount = expensesForDay.length;

    // Caisse complète si toutes les lignes service présentes ont au moins un champ saisi
    const cashComplete =
      cashTotals.servicePresentCount === 0
        ? false
        : cashTotals.filledRows >= cashTotals.servicePresentCount;

    return {
      presentCount,
      presenceFilled,
      employeesCount: displayedEmployees.length,
      expensesCount,
      cashComplete,
    };
  }, [displayedEmployees, date, expensesForDay.length, getRecord, cashTotals]);


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
    <div className="cb-presence">
      <div className="cb-presence-layout">
        {/* ONGLETS */}
        <div className="cb-presence__tabs">
          <button
            type="button"
            className={
              "cb-presence__tab" +
              (activeTab === "presence" ? " cb-presence__tab--active" : "")
            }
            onClick={() => setActiveTab("presence")}
          >
            Présence
            <span className="cb-presence__tab-badge">
              {tabStatus.presenceFilled}/{tabStatus.employeesCount}
            </span>
          </button>

          <button
            type="button"
            className={
              "cb-presence__tab" +
              (activeTab === "caisse" ? " cb-presence__tab--active" : "")
            }
            onClick={() => setActiveTab("caisse")}
          >
            Caisse
            <span className="cb-presence__tab-badge">
              {cashTotals.grand > 0 ? "€" : "—"}
            </span>
          </button>

          <button
            type="button"
            className={
              "cb-presence__tab" +
              (activeTab === "depenses" ? " cb-presence__tab--active" : "")
            }
            onClick={() => setActiveTab("depenses")}
          >
            Dépenses
            <span className="cb-presence__tab-badge">{tabStatus.expensesCount}</span>
          </button>

          <button
            type="button"
            className={
              "cb-presence__tab" +
              (activeTab === "recap" ? " cb-presence__tab--active" : "")
            }
            onClick={() => setActiveTab("recap")}
          >
            Récap
            <span className="cb-presence__tab-badge">
              {tabStatus.presenceFilled === tabStatus.employeesCount &&
              cashTotals.grand > 0
                ? "✓"
                : "!"}
            </span>
          </button>
        </div>
        {/* HEADER */}
        <div className="cb-presence__header">
          <div>
            <h2 className="cb-presence__title">Feuille de présence</h2>
            <p className="cb-presence__subtitle">
              Suivi quotidien de l&apos;équipe
            </p>
          </div>
          <div className="cb-presence__actions">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="cb-presence__input"
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
      {activeTab === "recap" && (
      <section className="cb-presence-section">
        <div className="cb-presence__panel">
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
            <span className="cb-presence-summary__label">Caisse (CB)</span>
            <div className="cb-presence-summary__value">
              {cashTotals.totalCB.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">Caisse (TR)</span>
            <div className="cb-presence-summary__value">
              {cashTotals.totalTR.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
          <div>
            <span className="cb-presence-summary__label">Total caisse (CB/TR/AMEX/Espèces)</span>
            <div className="cb-presence-summary__value">
              {cashTotals.grand.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          </div>
        </div>

        {cashTotals.grand === 0 && (
          <p className="cb-presence-summary__hint">
            ⚠️ Aucune caisse saisie — complète l’onglet “Caisse” pour matcher les télécollectes.
          </p>
        )}

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
        </div>
      </section>
      )}

      {/* TABLEAU PRINCIPAL (ÉCRAN + MOBILE) */}
      {activeTab === "presence" && (
      <section className="cb-presence-section">
        <div className="cb-presence__panel">
        <div className="cb-presence__table-wrap">
          <table className="cb-presence__table cb-presence__table--main">
            <thead className="cb-presence__thead">
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
            <tbody className="cb-presence__tbody">
              {displayedEmployees.map((emp) => {
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
                      <div className="cb-presence__emp">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            className={
                              "cb-role-dot cb-role-dot--" + roleSlug(emp.role)
                            }
                          />
                          <div>
                            <div className="cb-presence__emp-name">{emp.name}</div>
                            <div className="cb-presence__emp-sub">{emp.role}</div>
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
                        className="cb-presence__input cb-presence__input--time"
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
                        className="cb-presence__input cb-presence__input--time"
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
                          className="cb-presence__input cb-presence__input--money"
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
                        className="cb-presence__input"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="cb-presence-extras">
          <button
            type="button"
            className="cb-button cb-button--ghost"
            onClick={() => setIsAddEmployeeOpen(true)}
          >
            + Ajouter un employé existant
          </button>
          <button
            type="button"
            className="cb-button cb-button--secondary"
            onClick={() => setIsExtraOpen(true)}
          >
            + Ajouter un extra
          </button>

          {isExtraOpen && (
            <div className="cb-card cb-presence-extra-modal">
              <div className="cb-presence-extra-modal__row">
                <div className="cb-presence-extra-modal__field">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={extraName}
                    onChange={(e) => setExtraName(e.target.value)}
                    placeholder="Nom de l'extra"
                    className="cb-presence__input"
                  />
                </div>

                <div className="cb-presence-extra-modal__field">
                  <label>Rôle</label>
                  <select
                    value={extraRole}
                    onChange={(e) => setExtraRole(e.target.value as Role)}
                    className="cb-presence__select"
                  >
                    <option value="Patron">Patron</option>
                    <option value="Responsable">Responsable</option>
                    <option value="Barman">Barman</option>
                    <option value="Cuisine">Cuisine</option>
                    <option value="Serveur">Serveur</option>
                  </select>
                </div>

                <div className="cb-presence-extra-modal__field">
                  <label>Taux horaire (optionnel)</label>
                  <input
                    type="number"
                    value={extraRate}
                    onChange={(e) => setExtraRate(e.target.value)}
                    placeholder="0"
                    className="cb-presence__input cb-presence__input--money"
                  />
                </div>
              </div>

              <div className="cb-presence-extra-modal__actions">
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={() => {
                    setIsExtraOpen(false);
                    setExtraName("");
                    setExtraRole("Serveur");
                    setExtraRate("");
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="cb-button cb-button--secondary"
                  onClick={() => {
                    const name = extraName.trim();
                    if (!name) return;
                    const id = `extra-${date}-${crypto.randomUUID()}`;
                    const rateNum = Number(extraRate);
                    setExtras((prev) => [
                      ...prev,
                      {
                        id,
                        date,
                        name,
                        role: extraRole,
                        hourlyRate: Number.isNaN(rateNum) ? 0 : rateNum,
                      },
                    ]);
                    setIsExtraOpen(false);
                    setExtraName("");
                    setExtraRole("Serveur");
                    setExtraRate("");
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}
          {isAddEmployeeOpen && (
            <div className="cb-card cb-presence-extra-modal">
              <div className="cb-presence-extra-modal__row">
                <div className="cb-presence-extra-modal__field" style={{ width: "100%" }}>
                  <label>Employé</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="cb-presence__select"
                  >
                    <option value="">Sélectionner…</option>
                    {employees
                      .filter((e) => !displayedEmployees.some((d) => d.id === e.id))
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} — {e.role}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="cb-presence-extra-modal__actions">
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={() => {
                    setIsAddEmployeeOpen(false);
                    setSelectedEmployeeId("");
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="cb-button cb-button--secondary"
                  onClick={() => {
                    const id = selectedEmployeeId;
                    if (!id) return;

                    setAdditions((prev) => {
                      if (prev.some((a) => a.date === date && a.employeeId === id)) return prev;
                      return [...prev, { date, employeeId: id }];
                    });

                    setIsAddEmployeeOpen(false);
                    setSelectedEmployeeId("");
                  }}
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </section>
      )}

      {/* CAISSE */}
      {activeTab === "caisse" && (
        <section className="cb-presence-section">
          <div className="cb-presence__panel">
          <div className="cb-presence-cash__head">
            <h2 className="cb-presence-cash__title">Feuille de caisse (service)</h2>
            <p className="cb-presence-cash__sub">
              Uniquement les employés de service présents. Saisis CB / TR / AMEX / Espèces.
            </p>
          </div>

          <div className="cb-presence-cash__table">
            <div className="cb-presence-cash__row cb-presence-cash__row--head">
              <div className="cb-presence-cash__cell">Employé</div>
              <div className="cb-presence-cash__cell">CB</div>
              <div className="cb-presence-cash__cell">TR</div>
              <div className="cb-presence-cash__cell">AMEX</div>
              <div className="cb-presence-cash__cell">Espèces</div>
              <div className="cb-presence-cash__cell">Total</div>
            </div>

            {displayedEmployees
              .filter((emp) => {
                const rec = getRecord(date, emp.id);
                const isService =
                  emp.role === "Patron" ||
                  emp.role === "Responsable" ||
                  emp.role === "Serveur";
                return isService && rec.present;
              })
              .map((emp) => {
                const rec = getCashRecord(date, emp.id);
                const cb = rec.cb ?? 0;
                const tr = rec.tr ?? 0;
                const amex = rec.amex ?? 0;
                const especes = rec.especes ?? 0;
                const total = cb + tr + amex + especes;

                const onChange = (k: PaymentKey, v: string) => {
                  const raw = v.replace(",", ".");
                  const num = Number(raw);
                  updateCashRecord(date, emp.id, (prev) => ({
                    ...prev,
                    [k]: Number.isNaN(num) ? undefined : num,
                  }));
                };

                return (
                  <div key={emp.id} className="cb-presence-cash__row">
                    <div className="cb-presence-cash__cell cb-presence-cash__emp" data-label="Employé">
                      {emp.name}
                    </div>
                    <div className="cb-presence-cash__cell" data-label="CB">
                      <input
                        type="number"
                        className="cb-presence__input cb-presence__input--money"
                        value={cb ? cb : ""}
                        onChange={(e) => onChange("cb", e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="cb-presence-cash__cell" data-label="TR">
                      <input
                        type="number"
                        className="cb-presence__input cb-presence__input--money"
                        value={tr ? tr : ""}
                        onChange={(e) => onChange("tr", e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="cb-presence-cash__cell" data-label="AMEX">
                      <input
                        type="number"
                        className="cb-presence__input cb-presence__input--money"
                        value={amex ? amex : ""}
                        onChange={(e) => onChange("amex", e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="cb-presence-cash__cell" data-label="Espèces">
                      <input
                        type="number"
                        className="cb-presence__input cb-presence__input--money"
                        value={especes ? especes : ""}
                        onChange={(e) => onChange("especes", e.target.value)}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="cb-presence-cash__cell cb-presence-cash__total" data-label="Total">
                      {total > 0
                        ? total.toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })
                        : "—"}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="cb-presence-cash__totals">
            {(() => {
              const servicePresent = displayedEmployees.filter((emp) => {
                const rec = getRecord(date, emp.id);
                const isService =
                  emp.role === "Patron" ||
                  emp.role === "Responsable" ||
                  emp.role === "Serveur";
                return isService && rec.present;
              });

              const sum = (k: PaymentKey) =>
                servicePresent.reduce((acc, emp) => {
                  const r = getCashRecord(date, emp.id);
                  return acc + (r[k] ?? 0);
                }, 0);

              const totalCB = sum("cb");
              const totalTR = sum("tr");
              const totalAMEX = sum("amex");
              const totalESPECES = sum("especes");
              const grand = totalCB + totalTR + totalAMEX + totalESPECES;

              return (
                <div className="cb-presence-cash__totals-grid">
                  <div>
                    <span>CB</span>
                    <strong>
                      {totalCB.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                  <div>
                    <span>TR</span>
                    <strong>
                      {totalTR.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                  <div>
                    <span>AMEX</span>
                    <strong>
                      {totalAMEX.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                  <div>
                    <span>Espèces</span>
                    <strong>
                      {totalESPECES.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                  <div className="cb-presence-cash__grand">
                    <span>Total caisse</span>
                    <strong>
                      {grand.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                </div>
              );
            })()}
          </div>

          <p className="cb-presence-cash__hint">
            Astuce : le total caisse doit correspondre aux télécollectes (CB/AMEX) faites en fin de service.
          </p>
          </div>
        </section>
      )}

      {/* DÉPENSES */}
      {activeTab === "depenses" && (
        <section className="cb-presence-section">
          <div className="cb-presence__panel">
          <div className="cb-presence-expenses__head">
            <h2 className="cb-presence-expenses__title">Dépenses journalières</h2>
            <p className="cb-presence-expenses__sub">
              Saisis ici les dépenses du jour (plus besoin d&apos;une page séparée).
            </p>
          </div>

            <PresenceExpensesEditor
              date={date}
              expenses={expenses}
              setExpenses={setExpenses}
            />
          </div>
        </section>
      )}

      {/* VERSION PDF / IMPRESSION */}
      {activeTab === "recap" && (
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
          <div className="cb-presence__table-wrap cb-presence-print__table-wrap">
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
                {displayedEmployees.map((emp) => {
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
      )}
      
      </div>
    </div>
  );
}

// Helper composant pour l'édition des dépenses du jour
function PresenceExpensesEditor({
  date,
  expenses,
  setExpenses,
}: {
  date: string;
  expenses: ExpenseItem[];
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseItem[]>>;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const list = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );

  const total = useMemo(
    () => list.reduce((s, e) => s + (e.amount || 0), 0),
    [list]
  );

  const add = () => {
    const l = label.trim();
    if (!l) return;
    const raw = amount.replace(",", ".");
    const n = Number(raw);
    if (Number.isNaN(n) || n <= 0) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        date,
        label: l,
        amount: n,
      },
    ]);
    setLabel("");
    setAmount("");
  };

  const remove = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div>
      <div className="cb-presence__actions">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ex : Course, Uber, Fournisseur..."
          className="cb-presence__input"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="cb-presence__input cb-presence__input--money"
        />
        <button type="button" className="cb-button cb-button--secondary" onClick={add}>
          Ajouter
        </button>
      </div>

      {list.length === 0 ? (
        <div className="cb-presence__empty">Aucune dépense aujourd&apos;hui.</div>
      ) : (
        <div className="cb-presence__cards">
          {list.map((e) => (
            <div key={e.id} className="cb-presence__card">
              <div>
                <div className="cb-presence__card-label">{e.label}</div>
                <div className="cb-presence__muted">{e.date}</div>
              </div>
              <div>
                <div className="cb-presence__card-value">
                  {e.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </div>
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={() => remove(e.id)}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}

          <div className="cb-presence__card">
            <span>Total</span>
            <div className="cb-presence__card-value">
              {total.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}