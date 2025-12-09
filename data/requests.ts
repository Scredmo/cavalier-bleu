import type { Employee } from './employees';

export type RequestType = 'retard' | 'conge' | 'absence';

export type EmployeeRequest = {
  id: string;
  employeeId: string;
  type: RequestType;
  date: string;      // 'YYYY-MM-DD'
  heure?: string;    // pour retard
  message?: string;
  createdAt: string; // ISO
  treated: boolean;
};

const STORAGE_KEY = 'cavalier_requests';

export function loadRequests(): EmployeeRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveRequests(list: EmployeeRequest[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}