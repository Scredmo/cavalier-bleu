"use client";

import { useEffect, useState } from "react";

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type Employee = {
  id: string;
  name: string;
  role: Role;
  hourlyRate: number;
};

type StoredEmployee = {
  id: string;
  name: string;
  role: Role;
  hourlyRate?: number;
};

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";

const EMPLOYEES_BASE: Omit<Employee, "hourlyRate">[] = [
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

function roleLabel(role: Role): string {
  switch (role) {
    case "Patron":
      return "Patron";
    case "Responsable":
      return "Responsable";
    case "Barman":
      return "Barman";
    case "Cuisine":
      return "Cuisine";
    case "Serveur":
      return "Serveur";
    default:
      return role;
  }
}

export default function EmployesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Charger depuis localStorage et fusionner avec EMPLOYEES_BASE
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredEmployee[];
        if (Array.isArray(parsed)) {
          const merged: Employee[] = EMPLOYEES_BASE.map((base) => {
            const match = parsed.find(
              (e) => e.id === base.id || e.name === base.name
            );
            return {
              ...base,
              hourlyRate: match?.hourlyRate ?? 0,
            };
          });
          setEmployees(merged);
          return;
        }
      }
    } catch (err) {
      console.error("Erreur chargement employés", err);
    }

    // fallback : aucun stockage, on part de 0€
    setEmployees(
      EMPLOYEES_BASE.map((e) => ({
        ...e,
        hourlyRate: 0,
      }))
    );
  }, []);

  // Sauvegarde dans localStorage à chaque changement
  useEffect(() => {
    if (typeof window === "undefined") return;
    const toStore: StoredEmployee[] = employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      hourlyRate: e.hourlyRate,
    }));
    window.localStorage.setItem(STORAGE_EMPLOYEES_KEY, JSON.stringify(toStore));
  }, [employees]);

  const handleRateChange = (id: string, value: string) => {
    const raw = value.replace(",", ".");
    const num = Number(raw);

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              hourlyRate: Number.isNaN(num) || num < 0 ? 0 : num,
            }
          : e
      )
    );
  };

  const totalHourlyCost = employees.reduce(
    (sum, e) => sum + (e.hourlyRate || 0),
    0
  );

  return (
    <div>
      {/* HEADER */}
      <div className="cb-planning__header">
        <div>
          <h2 className="cb-dashboard__title">Équipe du Cavalier Bleu</h2>
          <p className="cb-dashboard__subtitle">
            Rôles et taux horaires utilisés dans le planning et la présence
          </p>
        </div>
      </div>

      {/* TABLE EMPLOYÉS */}
      <section className="cb-card cb-employees-card">
        <div className="cb-employees-header">
          <h3 className="cb-section-title">Paramètres des employés</h3>
          <div className="cb-employees-header__summary">
            Masse horaire potentielle :{" "}
            <strong>
              {totalHourlyCost.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
              <span className="cb-employees-header__summary-unit"> / heure</span>
            </strong>
          </div>
        </div>

        <div className="cb-employees-table-wrapper">
          <table className="cb-employees-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Rôle</th>
                <th>Taux horaire (€)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="cb-employees-name-cell">
                      <span className={`cb-role-dot cb-role-dot--${emp.role.toLowerCase()}`}></span>
                      <span>{emp.name}</span>
                    </div>
                  </td>
                  <td>{roleLabel(emp.role)}</td>
                  <td>
                    <input
                      type="number"
                      className="cb-employees-rate-input"
                      value={
                        emp.hourlyRate > 0 ? emp.hourlyRate.toString() : ""
                      }
                      onChange={(e) =>
                        handleRateChange(emp.id, e.target.value)
                      }
                      placeholder="0,00"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="cb-employees-hint">
          Ces taux sont utilisés pour calculer le coût des plannings et la
          feuille de présence. Tu peux les ajuster à tout moment.
        </p>
      </section>
    </div>
  );
}