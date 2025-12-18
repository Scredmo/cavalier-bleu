"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// Dashboard (v1)
// 1er composant: Historique des caisses via calendrier + aperçu totaux

type TelecollectRecord = {
  raz?: number;
  totalCb?: number; // CB + AMEX
};

type TelecollectState = {
  [date: string]: TelecollectRecord;
};

const STORAGE_TELECOLLECT_KEY = "CB_TELECOLLECT_V1";
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


type LocksState = {
  // date => true
  [date: string]: true;
};

const STORAGE_CASH_KEY = "CB_CASH_V1";
const STORAGE_PRESENCE_LOCKS_KEY = "CB_PRESENCE_LOCKS_V1";
const STORAGE_DASHBOARD_UI_KEY = "CB_DASHBOARD_UI_V1";

function getDayStatus(date: string, cashDates: Set<string>, lockedDates: Set<string>) {
  const hasCash = cashDates.has(date);
  const isLocked = lockedDates.has(date);

  // Statuses for UI colors:
  // - empty: no cash
  // - pending: cash entered but not locked yet
  // - ok: locked + cash exists
  // - error: locked but no cash (inconsistent)
  if (!hasCash && !isLocked) return "empty";
  if (hasCash && !isLocked) return "pending";
  if (hasCash && isLocked) return "ok";
  return "error";
}

function isoToday(): string {
  // Local (no UTC shift)
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampMonth(date: Date): Date {
  // force to 1st day of month
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isoFromParts(y: number, m0: number, d: number) {
  // Build an ISO date in LOCAL time (no UTC shift that can move the day).
  const dt = new Date(y, m0, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function currencyEUR(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function approxEqual(a: number, b: number, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}


function isSameMonthIso(iso: string, cursor: Date) {
  // iso: YYYY-MM-DD
  return iso.slice(0, 7) === monthKey(cursor);
}

function monthKeyFromIso(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function safeNum(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function DashboardPageInner() {
  const [telecollect, setTelecollect] = useState<TelecollectState>({});
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [monthCursor, setMonthCursor] = useState<Date>(() => clampMonth(new Date()));

  const [selectedDate, setSelectedDate] = useState<string>(() => isoToday());

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [showKpiDetails, setShowKpiDetails] = useState(false);

  type KpiFocus = "locked" | "pending" | "diffCb" | "diffRaz" | null;
  const [kpiFocus, setKpiFocus] = useState<KpiFocus>(null);
  const drawerTopRef = useRef<HTMLDivElement | null>(null);

  const openDrawerForDate = (iso: string) => {
    setSelectedDate(iso);
    setIsPreviewOpen(true);
    const d = new Date(iso + "T00:00:00");
    if (!Number.isNaN(d.getTime())) setMonthCursor(clampMonth(d));
    // Smooth scroll to the top of the drawer (after it mounts)
    setTimeout(() => {
      drawerTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const openDrawerAndFocus = (focus: KpiFocus, fallbackDate?: string) => {
    setKpiFocus(focus);
    if (fallbackDate) {
      openDrawerForDate(fallbackDate);
      return;
    }
    // If no date provided, just open the drawer on selectedDate
    setIsPreviewOpen(true);
    setTimeout(() => {
      drawerTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };
  const closePreview = () => setIsPreviewOpen(false);

  const [cash, setCash] = useState<CashState>({});
  const [locks, setLocks] = useState<LocksState>({});
  const totalsByDate = useMemo(() => {
    const map: Record<
      string,
      { cb: number; tr: number; amex: number; especes: number; grand: number; cbAndAmex: number }
    > = {};

    for (const [k, rec] of Object.entries(cash)) {
      const d = k.split("::")[0];
      if (!d || d.length !== 10) continue;

      if (!map[d]) map[d] = { cb: 0, tr: 0, amex: 0, especes: 0, grand: 0, cbAndAmex: 0 };

      const cb = typeof rec.cb === "number" ? rec.cb : Number((rec as any).cb) || 0;
      const tr = typeof rec.tr === "number" ? rec.tr : Number((rec as any).tr) || 0;
      const amex = typeof rec.amex === "number" ? rec.amex : Number((rec as any).amex) || 0;
      const especes = typeof rec.especes === "number" ? rec.especes : Number((rec as any).especes) || 0;

      map[d].cb += cb;
      map[d].tr += tr;
      map[d].amex += amex;
      map[d].especes += especes;
    }

    for (const d of Object.keys(map)) {
      map[d].cbAndAmex = map[d].cb + map[d].amex;
      map[d].grand = map[d].cb + map[d].tr + map[d].amex + map[d].especes;
    }

    return map;
  }, [cash]);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawCash = window.localStorage.getItem(STORAGE_CASH_KEY);
      if (rawCash) {
        const parsed = JSON.parse(rawCash) as CashState;
        if (parsed && typeof parsed === "object") setCash(parsed);
      }
    } catch (e) {
      console.error("Dashboard: erreur chargement cash", e);
    }

    try {
      const rawLocks = window.localStorage.getItem(STORAGE_PRESENCE_LOCKS_KEY);
      if (rawLocks) {
        const parsed = JSON.parse(rawLocks) as LocksState;
        if (parsed && typeof parsed === "object") setLocks(parsed);
      }
    } catch (e) {
      console.error("Dashboard: erreur chargement locks", e);
    }

    try {
      const rawUI = window.localStorage.getItem(STORAGE_DASHBOARD_UI_KEY);
      if (rawUI) {
        const parsed = JSON.parse(rawUI) as { selectedDate?: string };
        if (parsed?.selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.selectedDate)) {
          setSelectedDate(parsed.selectedDate);
        }
        // Intentionally DO NOT restore month from storage.
        // The dashboard should always open on the current month.
        setMonthCursor(clampMonth(new Date()));
      }
    } catch (e) {
      console.error("Dashboard: erreur chargement UI", e);
    }
    try {
  const rawTele = window.localStorage.getItem(STORAGE_TELECOLLECT_KEY);
  if (rawTele) {
    const parsed = JSON.parse(rawTele) as TelecollectState;
    if (parsed && typeof parsed === "object") setTelecollect(parsed);
  }
} catch (e) {
  console.error("Dashboard: erreur chargement telecollect", e);
}
  }, []);

  // URL param override: /dashboard?date=YYYY-MM-DD
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlDate = searchParams?.get("date") ?? "";
    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(urlDate);
    if (!isIso) return;

    setSelectedDate(urlDate);
    setIsPreviewOpen(true);
    const d = new Date(urlDate + "T00:00:00");
    if (!Number.isNaN(d.getTime())) setMonthCursor(clampMonth(d));
  }, [searchParams]);
  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPreviewOpen]);


  // Persist dashboard UI (selected day + month) to avoid reset on navigation
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        STORAGE_DASHBOARD_UI_KEY,
        JSON.stringify({
          selectedDate,
        })
      );
    } catch (e) {
      console.error("Dashboard: erreur sauvegarde UI", e);
    }
  }, [selectedDate]);

  // Dates which have any cash entries
  const cashDates = useMemo(() => {
    const s = new Set<string>();
    for (const k of Object.keys(cash)) {
      const date = k.split("::")[0];
      if (date && date.length === 10) s.add(date);
    }
    return s;
  }, [cash]);

  const lockedDates = useMemo(() => new Set(Object.keys(locks)), [locks]);

  const getIssuesForDate = useMemo(() => {
  return (d: string) => {
    const hasCash = cashDates.has(d);
    const isLockedDay = lockedDates.has(d);

    const issues: Array<{ level: "warn" | "bad"; text: string }> = [];

    // Anomalie historique: verrouillée sans caisse
    if (isLockedDay && !hasCash) {
      issues.push({ level: "bad", text: "Anomalie : journée verrouillée sans caisse" });
      return { issues, canLock: false };
    }

    // Si pas de caisse ou déjà verrouillée : rien à faire
    if (!hasCash || isLockedDay) return { issues: [], canLock: false };

    const totals =
      totalsByDate[d] ??
      ({ cb: 0, tr: 0, amex: 0, especes: 0, grand: 0, cbAndAmex: 0 } as const);

    const tele = telecollect?.[d] ?? {};

    const raz = typeof tele.raz === "number" ? tele.raz : Number((tele as any).raz);
    const totalCb = typeof tele.totalCb === "number" ? tele.totalCb : Number((tele as any).totalCb);

    const hasRaz = Number.isFinite(raz) && (raz as number) > 0;
    const hasTele = Number.isFinite(totalCb) && (totalCb as number) > 0;

    if (!hasRaz) issues.push({ level: "warn", text: "RAZ manquante" });
    if (!hasTele) issues.push({ level: "warn", text: "Télécollecte CB manquante" });

    if (hasRaz && !approxEqual(round2(totals.grand), round2(raz as number))) {
      const diff = round2((raz as number) - totals.grand);
      const sign = diff > 0 ? "+" : "";
      issues.push({ level: "bad", text: `Écart CA (RAZ - caisse) : ${sign}${currencyEUR(diff)}` });
    }

    // ✅ CB regroupé = CB + AMEX
    if (hasTele && !approxEqual(round2(totals.cbAndAmex), round2(totalCb as number))) {
      const diff = round2((totalCb as number) - totals.cbAndAmex);
      const sign = diff > 0 ? "+" : "";
      issues.push({ level: "bad", text: `Écart CB (télécollecte - saisi) : ${sign}${currencyEUR(diff)}` });
    }

    return { issues, canLock: issues.length === 0 };
  };
}, [cashDates, lockedDates, totalsByDate, telecollect]);

  // --- Moved useMemo blocks here to ensure dependencies are initialized ---
  const lockedOkDatesInMonth = useMemo(() => {
    const mk = monthKey(monthCursor);
    const dates = new Set<string>();

    // Locked dates are keys of locks; keep only current month
    for (const d of Object.keys(locks)) {
      if (monthKeyFromIso(d) === mk) dates.add(d);
    }

    // Also ensure we only keep those that are really OK (has cash)
    const res = Array.from(dates)
      .filter((d) => getDayStatus(d, cashDates, lockedDates) === "ok")
      .sort();

    return res;
  }, [monthCursor, locks, cashDates, lockedDates]);

  const diffCbDatesInMonth = useMemo(() => {
    const mk = monthKey(monthCursor);
    const candidates = new Set<string>();

    Object.keys(totalsByDate).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });
    Object.keys(telecollect || {}).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });

    const res: Array<{ date: string; label: string }> = [];

    for (const d of Array.from(candidates).sort()) {
      if (getDayStatus(d, cashDates, lockedDates) !== "ok") continue;
      const { issues } = getIssuesForDate(d);
      const cbIssue = issues.find((i) => i.text.startsWith("Écart CB"));
      if (cbIssue) res.push({ date: d, label: cbIssue.text });
    }

    return res;
  }, [monthCursor, totalsByDate, telecollect, cashDates, lockedDates, getIssuesForDate]);

  const diffRazDatesInMonth = useMemo(() => {
    const mk = monthKey(monthCursor);
    const candidates = new Set<string>();

    Object.keys(totalsByDate).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });
    Object.keys(telecollect || {}).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });

    const res: Array<{ date: string; label: string }> = [];

    for (const d of Array.from(candidates).sort()) {
      if (getDayStatus(d, cashDates, lockedDates) !== "ok") continue;
      const { issues } = getIssuesForDate(d);
      const razIssue = issues.find((i) => i.text.startsWith("Écart CA"));
      if (razIssue) res.push({ date: d, label: razIssue.text });
    }

    return res;
  }, [monthCursor, totalsByDate, telecollect, cashDates, lockedDates, getIssuesForDate]);

  // Calendar grid for the current month
  const calendar = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m0 = monthCursor.getMonth();

    const first = new Date(y, m0, 1);
    const last = new Date(y, m0 + 1, 0);
    const daysInMonth = last.getDate();

    // JS: 0=Sunday..6=Saturday; we want Monday start
    const firstDow = first.getDay();
    const mondayIndex = (firstDow + 6) % 7; // 0 for Monday ... 6 for Sunday

    const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    // previous month padding
    const prevLast = new Date(y, m0, 0);
    const prevDays = prevLast.getDate();
    for (let i = mondayIndex - 1; i >= 0; i--) {
      const d = prevDays - i;
      cells.push({ iso: isoFromParts(y, m0 - 1, d), day: d, inMonth: false });
    }

    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: isoFromParts(y, m0, d), day: d, inMonth: true });
    }

    // next month padding to complete weeks (42 cells = 6 weeks max)
    const nextCount = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= nextCount; d++) {
      cells.push({ iso: isoFromParts(y, m0 + 1, d), day: d, inMonth: false });
    }

    return { y, m0, cells };
  }, [monthCursor]);

  const selectedTotals = useMemo(() => {
    let cb = 0,
      tr = 0,
      amex = 0,
      especes = 0;

    for (const [k, rec] of Object.entries(cash)) {
      const d = k.split("::")[0];
      if (d !== selectedDate) continue;
      cb += typeof rec.cb === "number" ? rec.cb : Number(rec.cb) || 0;
      tr += typeof rec.tr === "number" ? rec.tr : Number(rec.tr) || 0;
      amex += typeof rec.amex === "number" ? rec.amex : Number(rec.amex) || 0;
      especes += typeof rec.especes === "number" ? rec.especes : Number(rec.especes) || 0;
    }

    const grand = cb + tr + amex + especes;
    return { cb, tr, amex, especes, grand };
  }, [cash, selectedDate]);

  const selectedLocked = !!locks[selectedDate];
  const selectedHasCash = cashDates.has(selectedDate);
  const selectedStatus = getDayStatus(selectedDate, cashDates, lockedDates);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
      monthCursor
    );
  }, [monthCursor]);

  const monthAlerts = useMemo(() => {
    const toFix: Array<{ date: string; label: string; level: "warn" | "bad" }> = [];
    let okCount = 0;

    // Build a set of candidate dates for the month:
    // - any day in the displayed calendar month
    // - plus any cash/lock dates that fall in that month (safety)
    const candidates = new Set<string>();

    for (const c of calendar.cells) {
      if (c.inMonth) candidates.add(c.iso);
    }
    for (const d of cashDates) {
      if (isSameMonthIso(d, monthCursor)) candidates.add(d);
    }
    for (const d of lockedDates) {
      if (isSameMonthIso(d, monthCursor)) candidates.add(d);
    }

    const dates = Array.from(candidates).sort();

    for (const d of dates) {
      const st = getDayStatus(d, cashDates, lockedDates);

      if (st === "ok") {
        okCount += 1;
        continue;
      }

      if (st === "pending" || st === "error") {
        const { issues } = getIssuesForDate(d);

        // If no issues, it means: cash exists, not locked, and checks are OK -> ready to lock.
        if (issues.length === 0) {
          toFix.push({ date: d, label: "Prêt à verrouiller", level: "warn" });
        } else {
          const firstBad = issues.find((i) => i.level === "bad");
          const first = firstBad ?? issues[0];
          toFix.push({ date: d, label: first.text, level: first.level });
        }
      }
    }

    return { toFix, okCount };
  }, [calendar.cells, cashDates, lockedDates, monthCursor, getIssuesForDate]);

  const monthKpis = useMemo(() => {
    const mk = monthKey(monthCursor);

    let daysWithCash = 0;
    let daysLockedOk = 0;
    let daysPending = 0;

    let grandAll = 0;
    let grandLocked = 0;

    let cbAndAmexAll = 0;
    let cbAndAmexLocked = 0;

    let trAll = 0;
    let trLocked = 0;

    let especesAll = 0;
    let especesLocked = 0;

    // Télécollecte mensuelle (somme des valeurs saisies)
    let teleCbAll = 0;
    let teleCbLocked = 0;
    let razAll = 0;
    let razLocked = 0;

    // Candidate dates = toutes celles qui ont des totaux + celles qui ont une télécollecte
    const candidates = new Set<string>();
    Object.keys(totalsByDate).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });
    Object.keys(telecollect || {}).forEach((d) => {
      if (monthKeyFromIso(d) === mk) candidates.add(d);
    });

    const dates = Array.from(candidates).sort();

    for (const d of dates) {
      const hasCash = cashDates.has(d);
      const isLockedDay = lockedDates.has(d);

      if (hasCash) daysWithCash += 1;
      if (hasCash && !isLockedDay) daysPending += 1;

      const status = getDayStatus(d, cashDates, lockedDates);
      if (status === "ok") daysLockedOk += 1;

      const t = totalsByDate[d];
      if (t) {
        grandAll += safeNum(t.grand);
        cbAndAmexAll += safeNum(t.cbAndAmex);
        trAll += safeNum(t.tr);
        especesAll += safeNum(t.especes);

        if (status === "ok") {
          grandLocked += safeNum(t.grand);
          cbAndAmexLocked += safeNum(t.cbAndAmex);
          trLocked += safeNum(t.tr);
          especesLocked += safeNum(t.especes);
        }
      }

      const tc = telecollect?.[d];
      if (tc) {
        const raz = safeNum(tc.raz);
        const tcb = safeNum(tc.totalCb);
        razAll += raz;
        teleCbAll += tcb;
        if (status === "ok") {
          razLocked += raz;
          teleCbLocked += tcb;
        }
      }
    }

    // Écarts mensuels (sur jours verrouillés uniquement)
    const diffCbLocked = teleCbLocked - cbAndAmexLocked;
    const diffRazLocked = razLocked - grandLocked;

    return {
      mk,
      daysWithCash,
      daysPending,
      daysLockedOk,

      grandAll,
      grandLocked,

      cbAndAmexAll,
      cbAndAmexLocked,
      trAll,
      trLocked,
      especesAll,
      especesLocked,

      teleCbAll,
      teleCbLocked,
      razAll,
      razLocked,

      diffCbLocked,
      diffRazLocked,
    };
  }, [monthCursor, totalsByDate, telecollect, cashDates, lockedDates]);

  if (!mounted) return null;

  return (
    <div className="cb-dashboard">
      {/* Header */}
      <div className="cb-dashboard__head">
        <div>
          <h1 className="cb-dashboard__title">Dashboard</h1>
          <p className="cb-dashboard__sub">
            Vérifications rapides • Historique • Accès aux pages (on build au fur et à mesure)
          </p>
        </div>

        <div className="cb-dashboard__actions">
          <a className="cb-button cb-button--ghost" href="/presence">
            Aller à Présence / Caisse
          </a>
          <a className="cb-button cb-button--ghost" href="/depenses">
            Aller à Dépenses
          </a>
        </div>
      </div>

      {/* KPI mensuels */}
      <section className="cb-card" style={{ overflow: "hidden", width:"50%"
      }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 className="cb-dashboard__h2" style={{ margin: 0 }}>
            KPI mensuels
          </h2>
          <div style={{ fontWeight: 900, fontSize: 13, textTransform: "capitalize" }}>
            {monthLabel}
          </div>
        </div>

        <div className="cb-dashboard__divider" />

        {/* Résumé (4 KPI) */}
        <div
          className="cb-dashboard__stats"
          style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
        >
          <button
            type="button"
            className="cb-dashboard__stat"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => {
              const first = lockedOkDatesInMonth[lockedOkDatesInMonth.length - 1] ?? selectedDate;
              openDrawerAndFocus("locked", first);
            }}
            title="Voir les jours verrouillés OK"
          >
            <span>CA verrouillé (OK)</span>
            <strong>{currencyEUR(round2(monthKpis.grandLocked))}</strong>
          </button>

          <button
            type="button"
            className="cb-dashboard__stat"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => {
              const first = monthAlerts.toFix[0]?.date ?? selectedDate;
              openDrawerAndFocus("pending", first);
            }}
            title="Voir les jours à verrouiller"
          >
            <span>À verrouiller</span>
            <strong>{monthKpis.daysPending}</strong>
          </button>

          <button
            type="button"
            className="cb-dashboard__stat"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => {
              const first = diffCbDatesInMonth[0]?.date ?? selectedDate;
              openDrawerAndFocus("diffCb", first);
            }}
            title="Voir le détail des écarts CB (jours verrouillés)"
          >
            <span>Écart CB (verrouillés)</span>
            <strong>{currencyEUR(round2(monthKpis.diffCbLocked))}</strong>
          </button>

          <button
            type="button"
            className="cb-dashboard__stat"
            style={{ textAlign: "left", cursor: "pointer" }}
            onClick={() => {
              const first = diffRazDatesInMonth[0]?.date ?? selectedDate;
              openDrawerAndFocus("diffRaz", first);
            }}
            title="Voir le détail des écarts RAZ (jours verrouillés)"
          >
            <span>Écart RAZ (verrouillés)</span>
            <strong>{currencyEUR(round2(monthKpis.diffRazLocked))}</strong>
          </button>
        </div>

        <div className="cb-dashboard__footer-actions" style={{ justifyContent: "space-between" }}>

          <button
            type="button"
            className="cb-button cb-button--ghost"
            onClick={() => setShowKpiDetails((v) => !v)}
          >
            {showKpiDetails ? "Masquer les détails" : "Voir les détails"}
          </button>
        </div>

        {/* Détails (repliables) */}
        {showKpiDetails && (
          <>
            <div className="cb-dashboard__divider" />

            <div
              className="cb-dashboard__stats"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              <div className="cb-dashboard__stat">
                <span>Jours avec caisse</span>
                <strong>{monthKpis.daysWithCash}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>Jours verrouillés (OK)</span>
                <strong>{monthKpis.daysLockedOk}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>CA saisi (tous jours)</span>
                <strong>{currencyEUR(round2(monthKpis.grandAll))}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>CB+AMEX saisi</span>
                <strong>{currencyEUR(round2(monthKpis.cbAndAmexAll))}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>TR saisi</span>
                <strong>{currencyEUR(round2(monthKpis.trAll))}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>Espèces saisies</span>
                <strong>{currencyEUR(round2(monthKpis.especesAll))}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>Télécollecte CB (verrouillés)</span>
                <strong>{currencyEUR(round2(monthKpis.teleCbLocked))}</strong>
              </div>
              <div className="cb-dashboard__stat">
                <span>RAZ (verrouillés)</span>
                <strong>{currencyEUR(round2(monthKpis.razLocked))}</strong>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 1er composant: Caisses + calendrier */}
      <section className="cb-dashboard__grid">
        {/* Calendrier seul (la fiche du jour s'ouvre en tiroir à droite) */}
        <div className="cb-card cb-dashboard__calendar">
          <div className="cb-dashboard__calendar-head">
            <h2 className="cb-dashboard__h2">Caisses — calendrier</h2>
            <div className="cb-dashboard__month-nav">
              <button
                type="button"
                className="cb-button cb-button--ghost"
                onClick={() => setMonthCursor((d) => clampMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1)))}
                aria-label="Mois précédent"
              >
                ◀
              </button>
              <div className="cb-dashboard__month-label">{monthLabel}</div>
              <button
                type="button"
                className="cb-button cb-button--ghost"
                onClick={() => setMonthCursor((d) => clampMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1)))}
                aria-label="Mois suivant"
              >
                ▶
              </button>
            </div>
          </div>

          <div className="cb-dashboard__dow">
            <span>L</span>
            <span>M</span>
            <span>M</span>
            <span>J</span>
            <span>V</span>
            <span>S</span>
            <span>D</span>
          </div>

          <div className="cb-dashboard__calendar-grid">
            {calendar.cells.map((c) => {
              const isSelected = c.iso === selectedDate;
              const dayStatus = getDayStatus(c.iso, cashDates, lockedDates);

              return (
                <button
                  key={c.iso}
                  type="button"
                  className={
                    "cb-dashboard__day" +
                    (c.inMonth ? "" : " cb-dashboard__day--out") +
                    (isSelected ? " cb-dashboard__day--selected" : "") +
                    ` cb-dashboard__day--${dayStatus}`
                  }
                  onClick={() => {
                    setSelectedDate(c.iso);
                    setIsPreviewOpen(true);
                    if (!c.inMonth) {
                      const d = new Date(c.iso + "T00:00:00");
                      if (!Number.isNaN(d.getTime())) setMonthCursor(clampMonth(d));
                    }
                  }}
                  title={
                    dayStatus === "ok"
                      ? "Journée verrouillée (OK)"
                      : dayStatus === "pending"
                      ? "Caisse saisie (à verrouiller)"
                      : dayStatus === "error"
                      ? "Erreur: journée verrouillée sans caisse"
                      : "Aucune caisse"
                  }
                >
                  <span className="cb-dashboard__day-num">{c.day}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tiroir à droite (s'ouvre au clic sur un jour) */}
        {isPreviewOpen && (
          <div
            className="cb-dashboard__overlay"
            role="presentation"
            onMouseDown={(e) => {
              // clic en dehors du panneau => on ferme
              if (e.target === e.currentTarget) closePreview();
            }}
          >
            <aside
              className="cb-card cb-dashboard__drawer"
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`Aperçu du ${selectedDate}`}
            >
              <div ref={drawerTopRef} />
              <div className="cb-dashboard__preview-head">
                <h2 className="cb-dashboard__h2">Aperçu du {selectedDate}</h2>
                <div className="cb-dashboard__pillrow">
                  <span className={"cb-pill" + (selectedStatus === "ok" ? " cb-pill--ok" : "")}>
                    {selectedStatus === "empty"
                      ? "Aucune caisse"
                      : selectedStatus === "pending"
                      ? "À verrouiller"
                      : selectedStatus === "ok"
                      ? "OK"
                      : "Erreur"}
                  </span>
                  <span className={"cb-pill" + (selectedStatus === "ok" ? " cb-pill--ok" : "")}>
                    {selectedStatus === "ok" ? "Verrouillée" : "Non verrouillée"}
                  </span>
                </div>
              </div>

              <div className="cb-dashboard__stats">
                <div className="cb-dashboard__stat">
                  <span>CB</span>
                  <strong>{currencyEUR(selectedTotals.cb)}</strong>
                </div>
                <div className="cb-dashboard__stat">
                  <span>TR</span>
                  <strong>{currencyEUR(selectedTotals.tr)}</strong>
                </div>
                <div className="cb-dashboard__stat">
                  <span>AMEX</span>
                  <strong>{currencyEUR(selectedTotals.amex)}</strong>
                </div>
                <div className="cb-dashboard__stat">
                  <span>Espèces</span>
                  <strong>{currencyEUR(selectedTotals.especes)}</strong>
                </div>
                <div className="cb-dashboard__stat cb-dashboard__stat--grand">
                  <span>Total caisse</span>
                  <strong>{currencyEUR(selectedTotals.grand)}</strong>
                </div>
              </div>

              {kpiFocus && (
                <div style={{ marginTop: 12 }}>
                  <div className="cb-dashboard__divider" style={{ margin: "12px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 1000 }}>
                      {kpiFocus === "pending"
                        ? "Jours à verrouiller"
                        : kpiFocus === "diffCb"
                        ? "Écarts CB (jours verrouillés)"
                        : kpiFocus === "diffRaz"
                        ? "Écarts RAZ (jours verrouillés)"
                        : "Jours verrouillés OK"}
                    </div>
                    <button
                      type="button"
                      className="cb-button cb-button--ghost"
                      onClick={() => setKpiFocus(null)}
                    >
                      Fermer
                    </button>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {kpiFocus === "pending" && (
                      monthAlerts.toFix.length === 0 ? (
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>✅ Aucun jour à verrouiller ce mois-ci.</div>
                      ) : (
                        monthAlerts.toFix.map((item) => (
                          <div
                            key={item.date}
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(248,250,252,.7)",
                              border: "1px solid rgba(148,163,184,.26)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <span style={{ fontWeight: 900 }}>{item.date}</span>
                              <button
                                type="button"
                                className="cb-button cb-button--ghost"
                                onClick={() => openDrawerForDate(item.date)}
                              >
                                Voir
                              </button>
                            </div>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: 12,
                                color: item.level === "bad" ? "rgba(185,28,28,1)" : "rgba(100,116,139,1)",
                              }}
                            >
                              {item.label}
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {kpiFocus === "diffCb" && (
                      diffCbDatesInMonth.length === 0 ? (
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>✅ Aucun écart CB sur les jours verrouillés.</div>
                      ) : (
                        diffCbDatesInMonth.map((item) => (
                          <div
                            key={item.date}
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(248,250,252,.7)",
                              border: "1px solid rgba(148,163,184,.26)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <span style={{ fontWeight: 900 }}>{item.date}</span>
                              <button
                                type="button"
                                className="cb-button cb-button--ghost"
                                onClick={() => openDrawerForDate(item.date)}
                              >
                                Voir
                              </button>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(185,28,28,1)" }}>
                              {item.label}
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {kpiFocus === "diffRaz" && (
                      diffRazDatesInMonth.length === 0 ? (
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>✅ Aucun écart RAZ sur les jours verrouillés.</div>
                      ) : (
                        diffRazDatesInMonth.map((item) => (
                          <div
                            key={item.date}
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(248,250,252,.7)",
                              border: "1px solid rgba(148,163,184,.26)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <span style={{ fontWeight: 900 }}>{item.date}</span>
                              <button
                                type="button"
                                className="cb-button cb-button--ghost"
                                onClick={() => openDrawerForDate(item.date)}
                              >
                                Voir
                              </button>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(185,28,28,1)" }}>
                              {item.label}
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {kpiFocus === "locked" && (
                      lockedOkDatesInMonth.length === 0 ? (
                        <div style={{ opacity: 0.85, fontWeight: 800 }}>Aucun jour verrouillé OK ce mois-ci.</div>
                      ) : (
                        lockedOkDatesInMonth
                          .slice()
                          .reverse()
                          .slice(0, 12)
                          .map((d) => {
                            const t = totalsByDate[d];
                            const grand = t ? safeNum(t.grand) : 0;
                            return (
                              <div
                                key={d}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: 10,
                                  borderRadius: 14,
                                  background: "rgba(236,253,245,.7)",
                                  border: "1px solid rgba(34,197,94,.22)",
                                }}
                              >
                                <div style={{ display: "grid", gap: 2 }}>
                                  <span style={{ fontWeight: 1000 }}>{d}</span>
                                  <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.85 }}>{currencyEUR(round2(grand))}</span>
                                </div>
                                <button
                                  type="button"
                                  className="cb-button cb-button--ghost"
                                  onClick={() => openDrawerForDate(d)}
                                >
                                  Voir
                                </button>
                              </div>
                            );
                          })
                      )
                    )}

                    {kpiFocus === "locked" && lockedOkDatesInMonth.length > 12 && (
                      <div style={{ opacity: 0.8, fontWeight: 800 }}>
                        + {lockedOkDatesInMonth.length - 12} autres jours…
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="cb-dashboard__alerts">
                <div className="cb-dashboard__alert-card cb-dashboard__alert-card--warn">
                  <div className="cb-dashboard__alert-title">À verrouiller — {monthAlerts.toFix.length}</div>
                  <div className="cb-dashboard__alert-detail">
                    {monthAlerts.toFix.length === 0 ? (
                      "✅ Rien à faire : aucune journée à verrouiller ce mois-ci."
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {monthAlerts.toFix.slice(0, 8).map((item) => (
                          <div
                            key={item.date}
                            style={{
                              display: "grid",
                              gap: 6,
                              padding: 10,
                              borderRadius: 14,
                              background: "rgba(248,250,252,.7)",
                              border: "1px solid rgba(148,163,184,.26)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "center",
                              }}
                            >
                              <span style={{ fontWeight: 900 }}>{item.date}</span>
                              <a className="cb-button cb-button--ghost" href={`/presence?date=${item.date}`}>
                                Ouvrir
                              </a>
                            </div>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: 12,
                                color:
                                  item.level === "bad" ? "rgba(185,28,28,1)" : "rgba(100,116,139,1)",
                              }}
                            >
                              {item.label}
                            </div>
                          </div>
                        ))}

                        {monthAlerts.toFix.length > 8 && (
                          <div style={{ opacity: 0.8, fontWeight: 800 }}>
                            + {monthAlerts.toFix.length - 8} autres jours…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cb-dashboard__alert-card cb-dashboard__alert-card--ok">
                  <div className="cb-dashboard__alert-title">OK — {monthAlerts.okCount} jours verrouillés</div>
                  <div className="cb-dashboard__alert-detail">
                    {monthAlerts.okCount === 0
                      ? "Aucune journée verrouillée ce mois-ci."
                      : "✅ Journées verrouillées (caisse + contrôles OK)."}
                  </div>
                  <div className="cb-dashboard__alert-actions">
                    <a className="cb-button cb-button--ghost" href={`/presence?date=${selectedDate}`}>
                      Ouvrir le jour sélectionné
                    </a>
                  </div>
                </div>
              </div>

              <div className="cb-dashboard__footer-actions">
                <button type="button" className="cb-button cb-button--ghost" onClick={() => { setKpiFocus(null); closePreview(); }}>
                  Fermer
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div> 
    );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}