// utils/calcHours.ts
// Calcul des heures mensuelles à partir de la feuille de présence
// ---------------------------------------------------------------

const STORAGE_PRESENCE_KEY = "CB_PRESENCE_V1";

type PresenceRecord = {
  present: boolean;
  start?: string;
  end?: string;
  note?: string;
  ca?: number;
};

type PresenceState = {
  // clé : "YYYY-MM-DD::employeeId"
  [key: string]: PresenceRecord;
};

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

/**
 * Charge tout l'état de présence depuis le localStorage.
 * Si on est côté serveur ou s’il n’y a rien → objet vide.
 */
function loadPresenceState(): PresenceState {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_PRESENCE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PresenceState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (e) {
    console.error("Erreur lecture présence (calcHours)", e);
    return {};
  }
}

/**
 * Calcule les heures effectuées pour un employé sur un mois donné.
 *
 * @param employeeId  id de l’employé (ex : "amine")
 * @param year        année (ex : 2025)
 * @param month       mois (0–11, comme getMonth -> 0 = janvier)
 */
export function calculateMonthlyHours(
  employeeId: string,
  year: number,
  month: number
): number {
  const state = loadPresenceState();
  let total = 0;

  for (const [key, rec] of Object.entries(state)) {
    const [dateStr, empId] = key.split("::");
    if (!dateStr || empId !== employeeId) continue;

    const d = new Date(dateStr);
    if (
      Number.isNaN(d.getTime()) ||
      d.getFullYear() !== year ||
      d.getMonth() !== month
    ) {
      continue;
    }

    if (!rec.present || !rec.start || !rec.end) continue;

    total += parseHours(rec.start, rec.end);
  }

  return total;
}

/**
 * Petit helper pratique pour le mois en cours.
 */
export function calculateCurrentMonthHours(employeeId: string): number {
  const now = new Date();
  return calculateMonthlyHours(employeeId, now.getFullYear(), now.getMonth());
}