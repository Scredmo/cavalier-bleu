// app/_data/employees.ts
export type Role = 'Patron' | 'Responsable' | 'Barman' | 'Cuisine' | 'Serveur';
export type Zone = 'Salle/Bar' | 'Cuisine';

export type Employee = {
  id: string;        // identifiant unique (slug)
  nom: string;
  role: Role;
  zone: Zone;
  tauxHoraire: number;
};

// liste par défaut (peut être modifiée ensuite dans la page /employes)
export const defaultEmployees: Employee[] = [
  { id: 'aurelie',  nom: 'Aurélie',  role: 'Patron',       zone: 'Salle/Bar', tauxHoraire: 28 },
  { id: 'hadrien',  nom: 'Hadrien',  role: 'Responsable',  zone: 'Salle/Bar', tauxHoraire: 20 },
  { id: 'eric',     nom: 'Eric',     role: 'Responsable',  zone: 'Salle/Bar', tauxHoraire: 20 },
  { id: 'harouna',  nom: 'Harouna',  role: 'Barman',       zone: 'Salle/Bar', tauxHoraire: 14 },
  { id: 'raja',     nom: 'Raja',     role: 'Cuisine',      zone: 'Cuisine',   tauxHoraire: 15 },
  { id: 'pirakash', nom: 'Pirakash', role: 'Cuisine',      zone: 'Cuisine',   tauxHoraire: 15 },
  { id: 'alan',     nom: 'Alan',     role: 'Cuisine',      zone: 'Cuisine',   tauxHoraire: 15 },
  { id: 'amine',    nom: 'Amine',    role: 'Serveur',      zone: 'Salle/Bar', tauxHoraire: 14 },
  { id: 'tom',      nom: 'Tom',      role: 'Serveur',      zone: 'Salle/Bar', tauxHoraire: 14 },
  { id: 'nazario',  nom: 'Nazario',  role: 'Serveur',      zone: 'Salle/Bar', tauxHoraire: 14 },
];

// mini "API" locale basée sur localStorage
const STORAGE_KEY = 'cavalier_employees';

export function loadEmployees(): Employee[] {
  if (typeof window === 'undefined') return defaultEmployees;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultEmployees;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultEmployees;
    return parsed;
  } catch {
    return defaultEmployees;
  }
}

export function saveEmployees(list: Employee[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}