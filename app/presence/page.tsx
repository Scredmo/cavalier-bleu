"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
const STORAGE_CASH_INCLUDE_KEY = "CB_CASH_INCLUDE_V1";
const STORAGE_PRESENCE_EXTRAS_KEY = "CB_PRESENCE_EXTRAS_V1";
const STORAGE_PRESENCE_ADDITIONS_KEY = "CB_PRESENCE_ADDITIONS_V1";
const STORAGE_PRESENCE_LOCKS_KEY = "CB_PRESENCE_LOCKS_V1";
const STORAGE_TELECOLLECT_KEY = "CB_TELECOLLECT_V1"; // RAZ + télécollectes CB (par date)
const STORAGE_DAILY_SHEETS_KEY = "CB_DAILY_SHEETS_V1";
const STORAGE_PRESENCE_UI_KEY = "CB_PRESENCE_UI_V1";

type PresenceUIState = {
  date: string;
  activeTab: "presence" | "caisse" | "depenses" | "recap";
};

type DailySheetRow = {
  id: string;
  name: string;
  role: Role;
  present: boolean;
  start?: string;
  end?: string;
  hours: number;
  cash?: { cb?: number; tr?: number; amex?: number; especes?: number };
};

type DailySheet = {
  date: string;
  createdAt: string;
  telecollect?: { raz?: number; cb?: number };
  totals: { cb: number; tr: number; amex: number; especes: number; grand: number; serviceCbApex: number; barCbApex: number };
  expenses: ExpenseItem[];
  rows: DailySheetRow[];
};

type DailySheetsState = { [date: string]: DailySheet };

type LocksState = {
  // date => true
  [date: string]: true;
};

type TelecollectRecord = {
  raz?: number; // CA total journalier issu du RAZ
  cb?: number;  // Total télécollectes CB (CB + AMEX)
};

type TelecollectState = {
  // date => record
  [date: string]: TelecollectRecord;
};

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
type CashIncludeState = {
  // `${date}::${employeeId}` => true (inclus) / false (exclu)
  [key: string]: boolean;
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseHours(start?: string, end?: string): number {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  if (
    Number.isNaN(sh) || Number.isNaN(sm) ||
    Number.isNaN(eh) || Number.isNaN(em)
  ) return 0;

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  // ✅ Si l’heure de fin est “avant” l’heure de début,
  // on considère que ça passe après minuit (+24h).
  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

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
  // ✅ Force local day interpretation (avoid UTC shifting YYYY-MM-DD)
  const d = new Date(date + "T00:00:00");
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

function PresencePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [date, setDate] = useState<string>(todayISO());
  const [presence, setPresence] = useState<PresenceState>({});
  const [planning, setPlanning] = useState<PlanningState>({});
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [locks, setLocks] = useState<LocksState>({});
  const isLocked = !!locks[date];
  const [telecollect, setTelecollect] = useState<TelecollectState>({});
  const [dailySheets, setDailySheets] = useState<DailySheetsState>({});
  const [activeTab, setActiveTab] = useState<"presence" | "caisse" | "depenses" | "recap">("presence");

  // ✅ Empêche l'écrasement du LocalStorage au 1er render (reset lors du changement de page)
  const didSaveUIRef = useRef(false);
  const didSaveDailySheetsRef = useRef(false);
  const didSaveTelecollectRef = useRef(false);
  const didSaveCashRef = useRef(false);
  const didSaveCashIncludeRef = useRef(false);
  const didSaveExtrasRef = useRef(false);
  const didSaveExpensesRef = useRef(false);
  const didSaveAdditionsRef = useRef(false);
  const didSaveLocksRef = useRef(false);
  const didSavePresenceRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ✅ 1) Priorité à l'URL (dashboard -> présence)
    try {
      const urlDate = searchParams?.get("date") ?? "";
      const urlTab = (searchParams?.get("tab") ?? "") as PresenceUIState["activeTab"] | "";

      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(urlDate);
      const isValidTab = urlTab === "presence" || urlTab === "caisse" || urlTab === "depenses" || urlTab === "recap";

      if (isValidDate) setDate(urlDate);
      if (isValidTab) setActiveTab(urlTab);

      // Si l'URL est complète, on ne charge pas le LS (sinon il écrase)
      if (isValidDate || isValidTab) return;
    } catch (e) {
      console.error("Erreur lecture URL (présence)", e);
    }

    // ✅ 2) Fallback: LocalStorage
    try {
      const raw = window.localStorage.getItem(STORAGE_PRESENCE_UI_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PresenceUIState>;

      if (typeof parsed.date === "string" && parsed.date) setDate(parsed.date);

      if (
        parsed.activeTab === "presence" ||
        parsed.activeTab === "caisse" ||
        parsed.activeTab === "depenses" ||
        parsed.activeTab === "recap"
      ) {
        setActiveTab(parsed.activeTab);
      }
    } catch (e) {
      console.error("Erreur chargement UI présence", e);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip 1st run: sinon on écrase la UI persistée par défaut (reset)
    if (!didSaveUIRef.current) {
      didSaveUIRef.current = true;
      return;
    }

    const payload: PresenceUIState = { date, activeTab };
    window.localStorage.setItem(STORAGE_PRESENCE_UI_KEY, JSON.stringify(payload));

    // ✅ Sync URL (évite le bug "ça ouvre la dernière date")
    const basePath = window.location.pathname || "/presence";
    const nextUrl = `${basePath}?date=${encodeURIComponent(date)}&tab=${encodeURIComponent(activeTab)}`;
    router.replace(nextUrl, { scroll: false });
  }, [date, activeTab, router]);

  useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_DAILY_SHEETS_KEY);
    if (raw) setDailySheets(JSON.parse(raw));
  } catch {}
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;
  if (!didSaveDailySheetsRef.current) {
    didSaveDailySheetsRef.current = true;
    return;
  }
  window.localStorage.setItem(STORAGE_DAILY_SHEETS_KEY, JSON.stringify(dailySheets));
}, [dailySheets]);

  // Charger télécollectes (RAZ + total CB)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_TELECOLLECT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TelecollectState;
        if (parsed && typeof parsed === "object") setTelecollect(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement télécollectes", err);
    }
  }, []);

  // Sauvegarde télécollectes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!didSaveTelecollectRef.current) {
      didSaveTelecollectRef.current = true;
      return;
    }
    window.localStorage.setItem(STORAGE_TELECOLLECT_KEY, JSON.stringify(telecollect));
  }, [telecollect]);

  // Caisse (service)
  const [cash, setCash] = useState<CashState>({});
  const [cashInclude, setCashInclude] = useState<CashIncludeState>({});


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
  // insert helper before return

  const renderPresenceMiniTable = (list: Employee[], title: string) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginTop: 16 }}>
        <div className="cb-presence-cash__head" style={{ marginBottom: 10 }}>
          <h3 className="cb-presence-cash__title" style={{ fontSize: 16 }}>
            {title}
          </h3>
          <p className="cb-presence-cash__sub">Présents (sans ventilation de caisse).</p>
        </div>

        <div className="cb-presence-cash__table">
          <div className="cb-presence-cash__row cb-presence-cash__row--head">
            <div className="cb-presence-cash__cell">Employé</div>
            <div className="cb-presence-cash__cell">Arrivée</div>
            <div className="cb-presence-cash__cell">Départ</div>
            <div className="cb-presence-cash__cell">Heures</div>
          </div>

          {list.map((emp) => {
            const pres = getRecord(date, emp.id);
            const hours =
              pres.present && pres.start && pres.end
                ? parseHours(pres.start, pres.end)
                : 0;

            return (
              <div key={emp.id} className="cb-presence-cash__row">
                <div className="cb-presence-cash__cell cb-presence-cash__emp" data-label="Employé">
                  <span className="cb-presence-cash__emp-name">{emp.name}</span>
                </div>

                <div className="cb-presence-cash__cell" data-label="Arrivée">
                  <span className="cb-presence__muted">{pres.start ?? "—"}</span>
                </div>

                <div className="cb-presence-cash__cell" data-label="Départ">
                  <span className="cb-presence__muted">{pres.end ?? "—"}</span>
                </div>

                <div className="cb-presence-cash__cell" data-label="Heures">
                  <span className="cb-presence-cash__total">
                    {hours > 0 ? `${hours.toFixed(1)} h` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCashTable = (list: Employee[]) => {
    return (
      <div className="cb-presence-cash__table">
        <div className="cb-presence-cash__row cb-presence-cash__row--head">
          <div className="cb-presence-cash__cell">Employé</div>
          <div className="cb-presence-cash__cell">CB</div>
          <div className="cb-presence-cash__cell">TR</div>
          <div className="cb-presence-cash__cell">AMEX</div>
          <div className="cb-presence-cash__cell">Espèces</div>
          <div className="cb-presence-cash__cell">Total</div>
        </div>

        {list.map((emp) => {
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
              <div
                className="cb-presence-cash__cell cb-presence-cash__emp"
                data-label="Employé"
              >
                <span className="cb-presence-cash__emp-name">{emp.name}</span>
              </div>

              <div className="cb-presence-cash__cell" data-label="CB">
                <input
                  type="number"
                  className="cb-presence__input cb-presence__input--money"
                  value={cb ? cb : ""}
                  onChange={(e) => onChange("cb", e.target.value)}
                  placeholder="0"
                  inputMode="decimal"
                  disabled={isLocked}
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
                  disabled={isLocked}
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
                  disabled={isLocked}
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
                  disabled={isLocked}
                />
              </div>

              <div
                className="cb-presence-cash__cell cb-presence-cash__total"
                data-label="Total"
              >
                <span className="cb-presence-cash__total-value">
                  {total > 0
                    ? total.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const saveDailySheetSnapshot = () => {
  const rows: DailySheetRow[] = displayedEmployees.map((emp) => {
    const pres = getRecord(date, emp.id);
    const hours = pres.present && pres.start && pres.end ? parseHours(pres.start, pres.end) : 0;

    const isCashRole =
      emp.role === "Patron" || emp.role === "Responsable" || emp.role === "Serveur" || emp.role === "Barman";

    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      present: !!pres.present,
      start: pres.start,
      end: pres.end,
      hours,
      cash: isCashRole ? getCashRecord(date, emp.id) : undefined,
    };
  });

  const sheet: DailySheet = {
    date,
    createdAt: new Date().toISOString(),
    telecollect: {
      raz: typeof razValue === "number" ? razValue : undefined,
      cb: typeof teleCbValue === "number" ? teleCbValue : undefined,
    },
    totals: {
      cb: cashTotals.totalCB,
      tr: cashTotals.totalTR,
      amex: cashTotals.totalAMEX,
      especes: cashTotals.totalESPECES,
      grand: cashTotals.grand,
      serviceCbApex: cashTotals.service.cb + cashTotals.service.amex,
      barCbApex: cashTotals.bar.cb + cashTotals.bar.amex,
    },
    expenses: expensesForDay.slice(),
    rows,
  };

  setDailySheets((prev) => ({ ...prev, [date]: sheet }));
};

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
    if (!didSaveCashRef.current) {
      didSaveCashRef.current = true;
      return;
    }
    window.localStorage.setItem(STORAGE_CASH_KEY, JSON.stringify(cash));
  }, [cash]);
  // Charger inclusion caisse
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_CASH_INCLUDE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CashIncludeState;
      if (parsed && typeof parsed === "object") setCashInclude(parsed);
    }
  } catch (err) {
    console.error("Erreur chargement inclusion caisse", err);
  }
}, []);

// Sauvegarde inclusion caisse
useEffect(() => {
  if (typeof window === "undefined") return;
  if (!didSaveCashIncludeRef.current) {
    didSaveCashIncludeRef.current = true;
    return;
  }
  window.localStorage.setItem(STORAGE_CASH_INCLUDE_KEY, JSON.stringify(cashInclude));
}, [cashInclude]);

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
    if (!didSaveExtrasRef.current) {
      didSaveExtrasRef.current = true;
      return;
    }
    window.localStorage.setItem(
      STORAGE_PRESENCE_EXTRAS_KEY,
      JSON.stringify(extras)
    );
  }, [extras]);
  // Sauvegarde dépenses
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!didSaveExpensesRef.current) {
      didSaveExpensesRef.current = true;
      return;
    }
    window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);
useEffect(() => {
  if (typeof window === "undefined") return;
  if (!didSaveAdditionsRef.current) {
    didSaveAdditionsRef.current = true;
    return;
  }
  window.localStorage.setItem(
    STORAGE_PRESENCE_ADDITIONS_KEY,
    JSON.stringify(additions)
  );
}, [additions]);
useEffect(() => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_PRESENCE_LOCKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocksState;
      if (parsed && typeof parsed === "object") setLocks(parsed);
    }
  } catch (err) {
    console.error("Erreur chargement locks", err);
  }
}, []);

useEffect(() => {
  if (typeof window === "undefined") return;
  if (!didSaveLocksRef.current) {
    didSaveLocksRef.current = true;
    return;
  }
  window.localStorage.setItem(STORAGE_PRESENCE_LOCKS_KEY, JSON.stringify(locks));
}, [locks]);

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
    if (!didSavePresenceRef.current) {
      didSavePresenceRef.current = true;
      return;
    }
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
    if (isLocked) return;
    const key = getCashKey(d, employeeId);
    setCash((prev) => {
      const current = prev[key] ?? {};
      return {
        ...prev,
        [key]: updater(current),
      };
    });
  };
  const getCashIncludeKey = (d: string, employeeId: string) => `${d}::${employeeId}`;

const isIncludedInCash = useCallback(
  (d: string, employeeId: string) => {
    const key = getCashIncludeKey(d, employeeId);
    // ✅ Par défaut: inclus
    return cashInclude[key] !== false;
  },
  [cashInclude]
);

const toggleCashInclude = (d: string, employeeId: string) => {
  if (isLocked) return;

  const key = getCashIncludeKey(d, employeeId);
  const currentlyIncluded = cashInclude[key] !== false;
  const nextIncluded = !currentlyIncluded;

  setCashInclude((prev) => ({ ...prev, [key]: nextIncluded }));

  // Si on EXCLUT, on purge sa caisse pour éviter des totaux fantômes
  if (!nextIncluded) {
    const cashKey = getCashKey(d, employeeId);
    setCash((prev) => {
      if (!prev[cashKey]) return prev;
      const next = { ...prev };
      delete next[cashKey];
      return next;
    });
  }
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
    // Sécurité: si la journée est verrouillée, on bloque toute modif
    if (isLocked) return;

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
            (existing.note && existing.note.trim() !== ""))
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
    if (isLocked) return;
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
    if (isLocked) return;
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      [field]: value || undefined,
      present: true,
    }));
  };

  const handleNoteChange = (employeeId: string, value: string) => {
    if (isLocked) return;
    updateRecord(date, employeeId, (prev) => ({
      ...prev,
      note: value || undefined,
    }));
  };
  
  const handleResetDay = () => {
    if (isLocked) return;
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

  // Totaux caisse (CB/TR/AMEX/Espèces)
  // - Service = Patron/Responsable/Serveur présents
  // - Bar = Barman présent
  // - Grand total = Service + Bar
  const cashTotals = useMemo(() => {
    const servicePresent = displayedEmployees.filter((emp) => {
      const rec = getRecord(date, emp.id);
      const isService =
        emp.role === "Patron" || emp.role === "Responsable" || emp.role === "Serveur";
      return isService && rec.present && isIncludedInCash(date, emp.id);
    });

    const barPresent = displayedEmployees.filter((emp) => {
      const rec = getRecord(date, emp.id);
      return emp.role === "Barman" && rec.present && isIncludedInCash(date, emp.id);
    });

    const sumGroup = (group: Employee[], k: PaymentKey) =>
      group.reduce((acc, emp) => {
        const r = getCashRecord(date, emp.id);
        return acc + (r[k] ?? 0);
      }, 0);

    const sumAnyFilled = (group: Employee[]) =>
      group.reduce((acc, emp) => {
        const r = getCashRecord(date, emp.id);
        const any =
          typeof r.cb === "number" ||
          typeof r.tr === "number" ||
          typeof r.amex === "number" ||
          typeof r.especes === "number";
        return acc + (any ? 1 : 0);
      }, 0);

    // Service totals
    const serviceCB = sumGroup(servicePresent, "cb");
    const serviceTR = sumGroup(servicePresent, "tr");
    const serviceAMEX = sumGroup(servicePresent, "amex");
    const serviceESPECES = sumGroup(servicePresent, "especes");
    const serviceGrand = serviceCB + serviceTR + serviceAMEX + serviceESPECES;
    const serviceFilledRows = sumAnyFilled(servicePresent);

    // Bar totals
    const barCB = sumGroup(barPresent, "cb");
    const barTR = sumGroup(barPresent, "tr");
    const barAMEX = sumGroup(barPresent, "amex");
    const barESPECES = sumGroup(barPresent, "especes");
    const barGrand = barCB + barTR + barAMEX + barESPECES;
    const barFilledRows = sumAnyFilled(barPresent);

    // Combined totals
    const totalCB = serviceCB + barCB;
    const totalTR = serviceTR + barTR;
    const totalAMEX = serviceAMEX + barAMEX;
    const totalESPECES = serviceESPECES + barESPECES;
    const grand = totalCB + totalTR + totalAMEX + totalESPECES;

    return {
      // groups
      servicePresent,
      barPresent,

      // counts
      servicePresentCount: servicePresent.length,
      barPresentCount: barPresent.length,
      serviceFilledRows,
      barFilledRows,

      // totals combined
      totalCB,
      totalTR,
      totalAMEX,
      totalESPECES,
      grand,

      // totals per group (useful for UI)
      service: {
        cb: serviceCB,
        tr: serviceTR,
        amex: serviceAMEX,
        especes: serviceESPECES,
        grand: serviceGrand,
      },
      bar: {
        cb: barCB,
        tr: barTR,
        amex: barAMEX,
        especes: barESPECES,
        grand: barGrand,
      },
    };
  }, [displayedEmployees, date, getRecord, getCashRecord, isIncludedInCash]);

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

    // Caisse complète si toutes les lignes service + bar présentes ont au moins un champ saisi
    const totalPresentCashRows = cashTotals.servicePresentCount + cashTotals.barPresentCount;
    const totalFilledCashRows = cashTotals.serviceFilledRows + cashTotals.barFilledRows;

    const cashComplete =
      totalPresentCashRows === 0 ? false : totalFilledCashRows >= totalPresentCashRows;

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
  const netRate = 0.78; // estimation net ≈ 78% du brut
  const salaryCostBrut = totals.totalCost;
  const salaryCostNet = salaryCostBrut * netRate;
  const realCost = salaryCostBrut * (1 + chargesRate / 100);
  // Ratio masse salariale: on le compare au total caisse (proxy CA)
  const turnoverBase = cashTotals.grand;
  const masseSalarialePct =
    turnoverBase > 0 ? (realCost / turnoverBase) * 100 : null;

  const approxEqual = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

  const teleForDay = telecollect[date] ?? {};
  const razValue = typeof teleForDay.raz === "number" ? teleForDay.raz : undefined;
  const teleCbValue = typeof teleForDay.cb === "number" ? teleForDay.cb : undefined;

  // On compare le RAZ au total des caisses (proxy CA journalier)
  const totalCaisses = cashTotals.grand;

  // Télécollectes CB = CB + AMEX (on regroupe)
  const totalCbFromCaisses = cashTotals.totalCB + cashTotals.totalAMEX;

  const razOk = typeof razValue === "number" && approxEqual(razValue, totalCaisses);
  const cbOk = typeof teleCbValue === "number" && approxEqual(teleCbValue, totalCbFromCaisses);

  const canLockToday = razOk && cbOk;

  const cashGateParts: string[] = [];
  if (!razOk) {
    if (typeof razValue !== "number") cashGateParts.push("RAZ manquant");
    else cashGateParts.push(`RAZ écart ${ (razValue - totalCaisses).toFixed(2) } €`);
  }
  if (!cbOk) {
    if (typeof teleCbValue !== "number") cashGateParts.push("Télécollecte CB manquante");
    else cashGateParts.push(
      `Télécollecte CB écart ${ (teleCbValue - totalCbFromCaisses).toFixed(2) } €`
    );
  }
  const cashGateHint = cashGateParts.join(" · ");

  const setTeleField = (field: keyof TelecollectRecord, raw: string) => {
    if (isLocked) return;
    const cleaned = raw.replace(",", ".").trim();
    const num = cleaned === "" ? undefined : Number(cleaned);
    setTelecollect((prev) => {
      const current = prev[date] ?? {};
      const nextForDay: TelecollectRecord = {
        ...current,
        [field]: num === undefined || Number.isNaN(num) ? undefined : num,
      };
      return { ...prev, [date]: nextForDay };
    });
  };

  const formattedDateLong = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(new Date(date + "T00:00:00"));

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
          
          <div className="cb-presence__actions">
            <input
              type="date"
              value={date}
              onChange={(e) => {
              const next = e.target.value;
              setDate(next);
            }}
              className="cb-presence__input"
            />
            <button
              type="button"
              className="cb-button cb-button--ghost"
              onClick={handleResetDay}
              disabled={isLocked}
              aria-disabled={isLocked}
              title={isLocked ? "Journée verrouillée" : undefined}
            >
              Réinitialiser
            </button>
          </div>
        </div>

      {/* RÉCAP JOURNALIER */}
      {activeTab === "recap" && (
      <section className="cb-presence-section">
        <div className="cb-presence__panel">
          <div
            className="cb-presence__actions"
            style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
          >
            {/* Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {!isLocked ? (
                <button
                  type="button"
                  className="cb-button cb-button--secondary"
                  onClick={() => {
                    // Bloque le verrouillage tant que ça ne match pas
                    if (!canLockToday) {
                      const parts: string[] = [];
                      if (!razOk) {
                        if (typeof razValue !== "number") {
                          parts.push(`RAZ manquant (attendu ≈ ${totalCaisses.toFixed(2)} €)`);
                        } else {
                          const diff = razValue - totalCaisses;
                          parts.push(
                            `RAZ ≠ total caisses (écart ${diff.toFixed(2)} €)`
                          );
                        }
                      }
                      if (!cbOk) {
                        if (typeof teleCbValue !== "number") {
                          parts.push(`Télécollecte CB manquante (attendu ≈ ${totalCbFromCaisses.toFixed(2)} €)`);
                        } else {
                          const diff = teleCbValue - totalCbFromCaisses;
                          parts.push(
                            `Télécollecte CB ≠ (CB+AMEX) caisses (écart ${diff.toFixed(2)} €)`
                          );
                        }
                      }
                      window.alert(
                        `Impossible de verrouiller :\n\n${parts.join("\n")}\n\n➡️ Vérifie le RAZ et la Télécollecte CB dans l’onglet “Caisse”.`
                      );
                      return;
                    }

                   if (!window.confirm("Verrouiller la journée ? (plus de modifications)")) return;
                   saveDailySheetSnapshot();
                   setLocks((prev) => ({ ...prev, [date]: true }));
                  }}
                >
                  🔒 Verrouiller la journée
                </button>
              ) : (
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={() => {
                    if (!window.confirm("Déverrouiller la journée ?")) return;
                    setLocks((prev) => {
                      const next = { ...prev };
                      delete next[date];
                      return next;
                    });
                  }}
                >
                  🔓 Déverrouiller
                </button>
              )}

              <button
                type="button"
                className="cb-button cb-button--secondary"
                onClick={handleExportPdf}
              >
                📄 Export PDF
              </button>
            </div>
          </div>


{isLocked && (
  <p className="cb-presence__hint" style={{ marginTop: 10 }}>
    ✅ Journée verrouillée : présence, caisse et dépenses ne sont plus modifiables.
  </p>
)}

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
              Coût salarial net (estimé)
            </span>
            <div className="cb-presence-summary__value">
              {salaryCostNet.toLocaleString("fr-FR", {
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
              Masse salariale / Total caisse
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
          Planning pré-rempli automatiquement. Complète les présences, la caisse
          et les dépenses journalières pour avoir une vision complète de ta journée.
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
                          disabled={isLocked}
                        />
                        <span />
                      </label>

                      {(() => {
                        const cashEligible =
                          emp.role === "Patron" ||
                          emp.role === "Responsable" ||
                          emp.role === "Serveur" ||
                          emp.role === "Barman";
                        if (!cashEligible) return null;

                        const included = isIncludedInCash(date, emp.id);

                        return (
                          <button
                            type="button"
                            className={
                              "cb-presence__cash-toggle" +
                              (included ? " cb-presence__cash-toggle--on" : "")
                            }
                            onClick={() => toggleCashInclude(date, emp.id)}
                            disabled={isLocked || !rec.present}
                            aria-disabled={isLocked || !rec.present}
                            title={
                              isLocked
                                ? "Journée verrouillée"
                                : !rec.present
                                ? "Active 'Présent' pour gérer la caisse"
                                : included
                                ? "Retirer de la caisse"
                                : "Ajouter à la caisse"
                            }
                          >
                            {included ? "✓ En caisse" : "+ Mettre en caisse"}
                          </button>
                        );
                      })()}
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
                        disabled={isLocked}
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
                        disabled={isLocked}
                      />
                    </td>

                    {/* Heures */}
                    <td className="cb-presence__cell cb-presence__cell--hours">
                      <span className="cb-presence__cell-label">Heures</span>
                      <span className="cb-presence__hours-value">
                        {hours > 0 ? `${hours.toFixed(1)} h` : "—"}
                      </span>
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
                        disabled={isLocked}
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
            disabled={isLocked}
            aria-disabled={isLocked}
            title={isLocked ? "Journée verrouillée" : undefined}
          >
            + Ajouter un employé existant
          </button>
          <button
            type="button"
            className="cb-button cb-button--secondary"
            onClick={() => setIsExtraOpen(true)}
            disabled={isLocked}
            aria-disabled={isLocked}
            title={isLocked ? "Journée verrouillée" : undefined}
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
                  disabled={isLocked}
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
                  disabled={isLocked}
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
            <h2 className="cb-presence-cash__title">Feuille de caisse</h2>
          </div>
          <div
            className={
              "cb-presence-cash__banner " +
              (canLockToday ? "cb-presence-cash__banner--ok" : "cb-presence-cash__banner--warn")
            }
            role="status"
            aria-live="polite"
            title={!canLockToday && cashGateHint ? cashGateHint : undefined}
          >
            <span className="cb-presence-cash__banner-icon" aria-hidden>
              {canLockToday ? "✅" : "⚠️"}
            </span>
            <div className="cb-presence-cash__banner-body">
              <strong className="cb-presence-cash__banner-title">
                {canLockToday
                  ? "OK — tu peux verrouiller la journée"
                  : "Écarts à corriger avant verrouillage"}
              </strong>
              {!canLockToday && cashGateHint ? (
                <span className="cb-presence-cash__banner-sub">{cashGateHint}</span>
              ) : null}
            </div>
          </div>
          {/* RAZ + Télécollectes (validation avant verrouillage) */}
          <div className="cb-presence-cash__checks">
            <div className="cb-presence-cash__check">
              <span className="cb-presence__hint">RAZ (CA jour)</span>
              <div className="cb-presence-cash__check-row">
                <input
                  type="number"
                  className="cb-presence__input cb-presence__input--money"
                  placeholder="RAZ"
                  value={typeof razValue === "number" ? String(razValue) : ""}
                  onChange={(e) => setTeleField("raz", e.target.value)}
                  disabled={isLocked}
                />
                <span
                  className={
                    "cb-presence__pill " +
                    (razOk ? "cb-presence__pill--ok" : "cb-presence__pill--warn")
                  }
                  title={
                    razOk
                      ? "OK"
                      : typeof razValue === "number"
                      ? `Écart: ${(razValue - totalCaisses).toFixed(2)} €`
                      : `À renseigner (attendu ≈ ${totalCaisses.toFixed(2)} €)`
                  }
                >
                  {razOk ? "✓" : "!"}
                </span>
              </div>
            </div>

            <div className="cb-presence-cash__check">
              <span className="cb-presence__hint">Télécollecte CB</span>
              <div className="cb-presence-cash__check-row">
                <input
                  type="number"
                  className="cb-presence__input cb-presence__input--money"
                  placeholder="CB (CB+AMEX)"
                  value={typeof teleCbValue === "number" ? String(teleCbValue) : ""}
                  onChange={(e) => setTeleField("cb", e.target.value)}
                  disabled={isLocked}
                />
                <span
                  className={
                    "cb-presence__pill " +
                    (cbOk ? "cb-presence__pill--ok" : "cb-presence__pill--warn")
                  }
                  title={
                    cbOk
                      ? "OK"
                      : typeof teleCbValue === "number"
                      ? `Écart: ${(teleCbValue - totalCbFromCaisses).toFixed(2)} €`
                      : `À renseigner (attendu ≈ ${totalCbFromCaisses.toFixed(2)} €)`
                  }
                >
                  {cbOk ? "✓" : "!"}
                </span>
              </div>
            </div>
          </div>

          {renderCashTable(
            displayedEmployees.filter((emp) => {
              const rec = getRecord(date, emp.id);
              const isService =
                emp.role === "Patron" ||
                emp.role === "Responsable" ||
                emp.role === "Serveur";
              return isService && rec.present && isIncludedInCash(date, emp.id);
            })
          )}

          {/* BAR */}
          {cashTotals.barPresent.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="cb-presence-cash__head" style={{ marginBottom: 10 }}>
                <h3 className="cb-presence-cash__title" style={{ fontSize: 16 }}>
                  Caisse Bar
                </h3>
                <p className="cb-presence-cash__sub">
                  Uniquement les barmans présents.
                </p>
              </div>

              {renderCashTable(cashTotals.barPresent)}
            </div>
          )}

          {/* CUISINE (présence uniquement) */}
          {renderPresenceMiniTable(
            displayedEmployees.filter((emp) => {
              const rec = getRecord(date, emp.id);
              return emp.role === "Cuisine" && rec.present;
            }),
            "Présence Cuisine"
          )}

          {/* AUTRES (si jamais) */}
          {renderPresenceMiniTable(
            displayedEmployees.filter((emp) => {
              const rec = getRecord(date, emp.id);
              const isCashRole =
                emp.role === "Patron" ||
                emp.role === "Responsable" ||
                emp.role === "Serveur" ||
                emp.role === "Barman";
              return !isCashRole && emp.role !== "Cuisine" && rec.present;
            }),
            "Autres présents"
          )}

          <div className="cb-presence-cash__totals">
            <div className="cb-presence-cash__totals-grid">
              <div>
                <span>CB</span>
                <strong>
                  {cashTotals.totalCB.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              <div>
                <span>TR</span>
                <strong>
                  {cashTotals.totalTR.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              <div>
                <span>AMEX</span>
                <strong>
                  {cashTotals.totalAMEX.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              <div>
                <span>Espèces</span>
                <strong>
                  {cashTotals.totalESPECES.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              <div className="cb-presence-cash__grand">
                <span>Total caisse (Service + Bar)</span>
                <strong>
                  {cashTotals.grand.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
            </div>
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
              disabled={isLocked}
            />
          </div>
        </section>
      )}

      {/* VERSION PDF / IMPRESSION (format “feuille” compacte) */}
      {activeTab === "recap" && (
        <section className="cb-presence-print">
          <div className="cb-presence-print__sheet">
            <div className="cb-presence-print__sheet-head">
              <h1 className="cb-presence-print__sheet-title">Feuille de caisse</h1>
              <div className="cb-presence-print__sheet-date">Date : {formattedDateLong}</div>
            </div>

            <div className="cb-presence-print__sheet-kpis">
              <div className="cb-presence-print__sheet-kpi">
                <div className="cb-presence-print__kpi-line">
                  <span>CB</span>
                  <strong>
                    {cashTotals.totalCB.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
                <div className="cb-presence-print__kpi-line">
                  <span>TR</span>
                  <strong>
                    {cashTotals.totalTR.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
                <div className="cb-presence-print__kpi-line">
                  <span>AMEX</span>
                  <strong>
                    {cashTotals.totalAMEX.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
                <div className="cb-presence-print__kpi-line">
                  <span>Espèces</span>
                  <strong>
                    {cashTotals.totalESPECES.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
              </div>

              <div className="cb-presence-print__sheet-kpi">
                <div className="cb-presence-print__kpi-line">
                  <span>Total caisse</span>
                  <strong>
                    {cashTotals.grand.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
              </div>

              <div className="cb-presence-print__sheet-kpi">
                <div className="cb-presence-print__kpi-line">
                  <span>Télécollecte CB</span>
                  <strong>
                    {typeof teleCbValue === "number"
                      ? teleCbValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                      : "—"}
                  </strong>
                </div>
                <div className="cb-presence-print__kpi-line">
                  <span>CB+AMEX (total)</span>
                  <strong>
                    {totalCbFromCaisses.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </strong>
                </div>
                <div className="cb-presence-print__kpi-line">
                  <span>Écart</span>
                  <strong>
                    {typeof teleCbValue === "number"
                      ? (teleCbValue - totalCbFromCaisses).toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="cb-presence-print__sheet-expenses">
              <div className="cb-presence-print__sheet-box-title">Dépenses</div>
              {expensesForDay.length === 0 ? (
                <div className="cb-presence-print__sheet-empty">Aucune dépense saisie.</div>
              ) : (
                <div className="cb-presence-print__sheet-expenses-list">
                  {expensesForDay.map((exp) => (
                    <div key={exp.id} className="cb-presence-print__expense-row">
                      <span>{exp.label}</span>
                      <strong>
                        {exp.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </strong>
                    </div>
                  ))}
                  <div className="cb-presence-print__expense-row cb-presence-print__expense-row--total">
                    <span>Total dépenses</span>
                    <strong>
                      {totalExpenses.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="cb-presence-print__sheet-table">
              <div className="cb-presence-print__sheet-box-title">Employés</div>
              <table className="cb-presence-print__grid">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th>CB+AMEX</th>
                    <th>TR</th>
                    <th>Espèces</th>
                    <th>Total</th>
                    <th>Arrivée</th>
                    <th>Départ</th>
                    <th>Heures</th>
                  </tr>
                </thead>
                <tbody>
                  {/* SERVICE: ventilation règlements */}
                  {cashTotals.servicePresent.map((emp) => {
                    const pres = getRecord(date, emp.id);
                    const hours =
                      pres.present && pres.start && pres.end
                        ? parseHours(pres.start, pres.end)
                        : 0;

                    const cashRec = getCashRecord(date, emp.id);
                    const cbApex = (cashRec.cb ?? 0) + (cashRec.amex ?? 0);
                    const tr = cashRec.tr ?? 0;
                    const especes = cashRec.especes ?? 0;
                    const total = cbApex + tr + especes;

                    return (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td style={{ textAlign: "right" }}>
                          {cbApex > 0
                            ? cbApex.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {tr > 0
                            ? tr.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {especes > 0
                            ? especes.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {total > 0
                            ? total.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td>{pres.start ?? ""}</td>
                        <td>{pres.end ?? ""}</td>
                        <td style={{ textAlign: "right" }}>
                          {hours > 0 ? `${hours.toFixed(1)} h` : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {/* BAR: ventilation règlements */}
                  {cashTotals.barPresent.map((emp) => {
                    const pres = getRecord(date, emp.id);
                    const hours =
                      pres.present && pres.start && pres.end
                        ? parseHours(pres.start, pres.end)
                        : 0;

                    const cashRec = getCashRecord(date, emp.id);
                    const cbApex = (cashRec.cb ?? 0) + (cashRec.amex ?? 0);
                    const tr = cashRec.tr ?? 0;
                    const especes = cashRec.especes ?? 0;
                    const total = cbApex + tr + especes;

                    return (
                      <tr key={emp.id}>
                        <td>{emp.name} (Bar)</td>
                        <td style={{ textAlign: "right" }}>
                          {cbApex > 0
                            ? cbApex.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {tr > 0
                            ? tr.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
            <td style={{ textAlign: "right" }}>
              {especes > 0
                ? especes.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })
                : ""}
            </td>
                        <td style={{ textAlign: "right" }}>
                          {total > 0
                            ? total.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })
                            : ""}
                        </td>
                        <td>{pres.start ?? ""}</td>
                        <td>{pres.end ?? ""}</td>
                        <td style={{ textAlign: "right" }}>
                          {hours > 0 ? `${hours.toFixed(1)} h` : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {/* CUISINE */}
                  {displayedEmployees
                    .filter((emp) => emp.role === "Cuisine" && getRecord(date, emp.id).present)
                    .map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.name} (Cuisine)</td>
                        <td colSpan={4}></td>
                        <td>{getRecord(date, emp.id).start ?? ""}</td>
                        <td>{getRecord(date, emp.id).end ?? ""}</td>
                        <td style={{ textAlign: "right" }}>
                          {parseHours(
                            getRecord(date, emp.id).start,
                            getRecord(date, emp.id).end
                          ) > 0
                            ? `${parseHours(
                                getRecord(date, emp.id).start,
                                getRecord(date, emp.id).end
                              ).toFixed(1)} h`
                            : ""}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="cb-presence-print__sheet-summary">
              <div className="cb-presence-print__summary-row">
                <span>Heures totales</span>
                <strong>{totals.totalHours.toFixed(1)} h</strong>
              </div>
              <div className="cb-presence-print__summary-row">
                <span>Coût salarial net</span>
                <strong>
                  {salaryCostNet.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              <div className="cb-presence-print__summary-row">
                <span>Coût réel + charges</span>
                <strong>
                  {realCost.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </strong>
              </div>
              {masseSalarialePct !== null && (
                <div className="cb-presence-print__summary-row">
                  <span>Masse salariale / CA</span>
                  <strong>{masseSalarialePct.toFixed(1)} %</strong>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

// =====================================================
// 🔹 PAGE WRAPPER (avec Suspense)
// =====================================================

export default function PresencePage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <PresencePageInner />
    </Suspense>
  );
}

// =====================================================
// 🔹 ÉDITEUR DÉPENSES (composant séparé)
// =====================================================

function PresenceExpensesEditor({
  date,
  expenses,
  setExpenses,
  disabled,
}: {
  date: string;
  expenses: ExpenseItem[];
  setExpenses: (updater: (prev: ExpenseItem[]) => ExpenseItem[]) => void;
  disabled: boolean;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const expensesForDay = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );

  const handleAddExpense = () => {
    const l = label.trim();
    if (!l) return;

    const cleaned = amount.replace(",", ".");
    const num = Number(cleaned);
    if (Number.isNaN(num) || num <= 0) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: `${date}-${crypto.randomUUID()}`,
        date,
        label: l,
        amount: num,
      },
    ]);

    setLabel("");
    setAmount("");
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="cb-presence-expenses">
      <div className="cb-presence-expenses__form">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé"
          className="cb-presence__input"
          disabled={disabled}
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="cb-presence__input cb-presence__input--money"
          inputMode="decimal"
          disabled={disabled}
        />
        <button
          type="button"
          className="cb-button cb-button--secondary"
          onClick={handleAddExpense}
          disabled={disabled}
        >
          + Ajouter
        </button>
      </div>

      {expensesForDay.length === 0 ? (
        <p className="cb-presence__hint">Aucune dépense pour cette journée.</p>
      ) : (
        <div className="cb-presence-expenses__list">
          {expensesForDay.map((exp) => (
            <div key={exp.id} className="cb-presence-expenses__item">
              <div className="cb-presence-expenses__item-content">
                <span className="cb-presence-expenses__item-label">{exp.label}</span>
                <span className="cb-presence-expenses__item-amount">
                  {exp.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <button
                type="button"
                className="cb-button cb-button--ghost"
                onClick={() => handleRemoveExpense(exp.id)}
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
