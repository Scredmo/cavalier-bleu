"use client";

import { useEffect, useState } from "react";

/* ============================================================
   TYPES
============================================================ */

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  hourlyRate: number;
  monthlyContractHours: number;
};

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";

/* ============================================================
   HELPERS
============================================================ */

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function calcIndicator(hours: number, contract: number) {
  if (contract === 0) return { label: "—", className: "none" };
  if (hours === 0) return { label: "0 h", className: "none" };
  if (hours < contract * 0.6) return { label: `${hours} h`, className: "low" };
  if (hours < contract) return { label: `${hours} h`, className: "almost" };
  if (hours === contract) return { label: `${hours} h`, className: "ok" };
  return { label: `+${hours - contract} h`, className: "extra" };
}

/* MOCK – en production tu récupéreras depuis presence */
function getHoursForEmployeeMonthly(employeeId: string): number {
  return Math.floor(Math.random() * 160);
}

/* ============================================================
   PAGE EMPLOYÉS
============================================================ */

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  /* ------------------------------------------------------------
     LOAD EMPLOYEES
  ------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        setEmployees(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Erreur chargement employés", e);
    }
  }, []);

  /* ------------------------------------------------------------
     SAVE EMPLOYEES
  ------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  /* ------------------------------------------------------------
     ADD / EDIT
  ------------------------------------------------------------ */

  function openAdd() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setShowModal(true);
  }

  function saveEmployee(e: any) {
    e.preventDefault();
    const form = new FormData(e.target);

    const data: Employee = {
      id: editing?.id ?? generateId(),
      firstName: form.get("firstName")!.toString(),
      lastName: form.get("lastName")!.toString(),
      role: form.get("role")!.toString() as Role,
      hourlyRate: Number(form.get("hourlyRate") || 0),
      monthlyContractHours: Number(form.get("monthlyContractHours") || 0),
    };

    if (editing) {
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === editing.id ? data : emp))
      );
    } else {
      setEmployees((prev) => [...prev, data]);
    }

    setShowModal(false);
    setEditing(null);
  }

  function deleteEmployee(id: string) {
    if (!confirm("Supprimer cet employé ?")) return;
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  /* ============================================================
     RENDER
  ============================================================ */

  const current = employees[activeIndex];

  return (
    <div className="cb-employees">
      {/* HEADER */}
      <div className="cb-employees__header">
        <h2 className="cb-dashboard__title">Employés</h2>
        <button className="cb-button cb-button--secondary" onClick={openAdd}>
          Ajouter un employé
        </button>
      </div>

      {/* === MOBILE SLIDER === */}
      {employees.length > 0 && (
        <div className="cb-employees__mobile-slider">
          <button
            className="cb-employees__slider-btn"
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          >
            ⬅
          </button>

          <span className="cb-employees__slider-label">
            {current.firstName} {current.lastName}
          </span>

          <button
            className="cb-employees__slider-btn"
            onClick={() =>
              setActiveIndex((i) => Math.min(employees.length - 1, i + 1))
            }
          >
            ➝
          </button>
        </div>
      )}

      {/* === GRID DESKTOP === */}
      <div className="cb-employees__grid">
        {employees.map((emp, i) => {
          const hours = getHoursForEmployeeMonthly(emp.id);
          const indicator = calcIndicator(hours, emp.monthlyContractHours);

          return (
            <div
              key={emp.id}
              className={`cb-employee-card ${
                i === activeIndex ? "cb-employee-card--active" : ""
              }`}
              onClick={() => setActiveIndex(i)}
            >
              <div className="cb-employee-card__header">
                <div>
                  <div className="cb-employee-card__name">
                    {emp.firstName} {emp.lastName}
                  </div>
                  <div className="cb-employee-card__role">{emp.role}</div>
                </div>

                <button
                  className="cb-button cb-button--ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(emp);
                  }}
                >
                  Modifier
                </button>
              </div>

              {/* Données principales */}
              <div className="cb-employee-card__section">
                <div className="cb-employee-card__row">
                  <span className="cb-employee-card__label">
                    Taux horaire :
                  </span>
                  <span className="cb-employee-card__value">
                    {emp.hourlyRate} €
                  </span>
                </div>

                <div className="cb-employee-card__row">
                  <span className="cb-employee-card__label">
                    Contrat mensuel :
                  </span>
                  <span className="cb-employee-card__value">
                    {emp.monthlyContractHours} h
                  </span>
                </div>

                {/* Indicateur */}
                <div className="cb-employee-card__row cb-employee-card__row--indicator">
                  <span className="cb-employee-card__label">Effectuées :</span>
                  <span
                    className={`cb-employee__indicator cb-employee__indicator--${indicator.className}`}
                  >
                    {indicator.label}
                  </span>
                </div>
              </div>

              <div className="cb-employee-card__footer">
                <a className="cb-dashboard-card__link" href="#">
                  Voir contrat PDF
                </a>

                <button
                  className="cb-employee-card__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEmployee(emp.id);
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
         MODALE AJOUT / EDITION
      ============================================================ */}
      {showModal && (
        <div className="cb-modal">
          <div className="cb-modal__backdrop" onClick={() => setShowModal(false)} />

          <div className="cb-modal__content">
            <h3 className="cb-modal__title">
              {editing ? "Modifier l'employé" : "Nouvel employé"}
            </h3>

            <form className="cb-modal__form" onSubmit={saveEmployee}>
              <div className="cb-modal__grid">

                <div className="cb-modal__field">
                  <label>Prénom</label>
                  <input
                    name="firstName"
                    defaultValue={editing?.firstName || ""}
                    required
                  />
                </div>

                <div className="cb-modal__field">
                  <label>Nom</label>
                  <input
                    name="lastName"
                    defaultValue={editing?.lastName || ""}
                    required
                  />
                </div>

                <div className="cb-modal__field">
                  <label>Rôle</label>
                  <select name="role" defaultValue={editing?.role || "Serveur"}>
                    <option>Patron</option>
                    <option>Responsable</option>
                    <option>Barman</option>
                    <option>Cuisine</option>
                    <option>Serveur</option>
                  </select>
                </div>

                <div className="cb-modal__field">
                  <label>Taux horaire (€)</label>
                  <input
                    name="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing?.hourlyRate ?? 0}
                  />
                </div>

                <div className="cb-modal__field">
                  <label>Heures contrat / mois</label>
                  <input
                    name="monthlyContractHours"
                    type="number"
                    min="0"
                    defaultValue={editing?.monthlyContractHours ?? 0}
                  />
                </div>
              </div>

              <div className="cb-modal__footer">
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>

                <button type="submit" className="cb-button cb-button--secondary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}