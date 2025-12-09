// utils/calcHours.ts
import { getPresenceForEmployee } from "@/data/usePresence";

export function calculateMonthlyHours(employeeId: string, month: number) {
  const records = getPresenceForEmployee(employeeId, month);
  const total = records.reduce((sum, r) => sum + r.hours, 0);
  return total; // en heures
}