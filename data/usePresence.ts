// data/usePresence.ts
// Petit module provisoire pour que le calcul des heures fonctionne
// sans encore connecter la vraie feuille de présence.

/** Enregistrement de présence agrégé par jour pour un employé. */
export type PresenceRecord = {
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  hours: number; // nombre d'heures payées ce jour-là
};

/**
 * Pour l’instant : base vide / démo.
 * Plus tard, on branchera ici les données réelles
 * (feuille de présence, API, base de données, etc.).
 */
const demoPresence: PresenceRecord[] = [
  // Exemple si tu veux tester :
  // { employeeId: "1", date: "2025-12-01", hours: 8 },
];

/**
 * Retourne tous les enregistrements de présence d’un employé
 * pour un mois donné (0 = janvier, 11 = décembre).
 */
export function getPresenceForEmployee(
  employeeId: string,
  month: number
): PresenceRecord[] {
  return demoPresence.filter((rec) => {
    if (rec.employeeId !== employeeId) return false;
    const recMonth = new Date(rec.date).getMonth();
    return recMonth === month;
  });
}