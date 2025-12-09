"use client";

import { useState } from "react";
import { useEmployees } from "@/data/useEmployees"; // ton hook actuel
import { calculateMonthlyHours } from "@/utils/calcHours"; // nouvelle fonction (faite juste après)

export default function EmployeesPage() {
  const {
    employees,
    updateEmployee,
    addEmployee,
    deleteEmployee,
  } = useEmployees();

  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /** -----------------------
   * BADGE COULEUR HEURES
   ------------------------ */
  const getHoursStatus = (contractHours: number, realHours: number) => {
    const diff = realHours - contractHours;

    if (realHours === 0) return { label: "Aucune heure", type: "none" };
    if (diff < -5) return { label: `${diff}h`, type: "low" };
    if (diff >= -5 && diff < 0) return { label: `${diff}h`, type: "almost" };
    if (diff === 0) return { label: "OK", type: "ok" };
    if (diff > 0) return { label: `+${diff}h`, type: "extra" };

    return { label: diff, type: "none" };
  };

  /** -----------------------
   * CALCUL SALAIRE NET
   ------------------------ */
  const computeSalary = (hours: number, rate: number) => {
    return (hours * rate).toFixed(2);
  };

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="cb-employees">
      {/* ---- EN-TÊTE ---- */}
      <div className="cb-employees__header">
        <h2 className="cb-topbar__title">Équipe & Employés</h2>

        <button
          className="cb-button cb-button--secondary"
          onClick={() => setShowAddModal(true)}
        >
          + Ajouter un employé
        </button>
      </div>

      {/* ---- SLIDER MOBILE FIFA ---- */}
      <div className="cb-employees__mobile-slider">
        <button
          className="cb-button cb-button--ghost"
          onClick={() =>
            setActiveIndex((i) => (i === 0 ? employees.length - 1 : i - 1))
          }
        >
          ←
        </button>

        <span className="cb-employees__slider-label">
          {activeIndex + 1} / {employees.length}
        </span>

        <button
          className="cb-button cb-button--ghost"
          onClick={() =>
            setActiveIndex((i) => (i === employees.length - 1 ? 0 : i + 1))
          }
        >
          →
        </button>
      </div>

      {/* ---- GRID DES CARTES EMPLOYÉS ---- */}
      <div className="cb-employees__grid">
        {employees.map((emp, i) => {
          const monthlyHours = calculateMonthlyHours(emp.id, currentMonth); // hook utils
          const badge = getHoursStatus(emp.contractHours ?? 0, monthlyHours);
          const salary = computeSalary(monthlyHours, emp.hourlyRate ?? 0);

          return (
            <div
              key={emp.id}
              className={
                "cb-employee-card " +
                (i === activeIndex ? "cb-employee-card--active" : "")
              }
            >
              {/* HEADER */}
              <div className="cb-employee-card__header">
                <div>
                  <div className="cb-employee-card__name">{emp.name}</div>
                  <div className="cb-employee-card__role">{emp.role}</div>
                </div>

                <button
                  className="cb-button cb-button--ghost cb-employee-card__edit-btn"
                >
                  Modifier
                </button>
              </div>

              {/* ---- SECTIONS PRINCIPALES ---- */}
              <div className="cb-employee-card__body">
                {/* CONTRAT */}
                <div className="cb-employee-card__section">
                  <div className="cb-employee-card__section-header">
                    Contrat
                  </div>

                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">Type :</span>
                    <span className="cb-employee-card__value">
                      {emp.contractType || "—"}
                    </span>
                  </div>

                  <div className="cb-employee-card__row cb-employee-card__row--indicator">
                    <span className="cb-employee-card__label">
                      Heures prévues :
                    </span>
                    <span
                      className={
                        "cb-employee__indicator cb-employee__indicator--" +
                        badge.type
                      }
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* SALAIRE */}
                <div className="cb-employee-card__section">
                  <div className="cb-employee-card__section-header">
                    Salaire
                  </div>

                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">
                      Heures effectuées :
                    </span>
                    <span className="cb-employee-card__value">
                      {monthlyHours}h
                    </span>
                  </div>

                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">Taux horaire :</span>
                    <span className="cb-employee-card__value">
                      {emp.hourlyRate ?? 0} €
                    </span>
                  </div>

                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">
                      Salaire du mois :
                    </span>
                    <span className="cb-employee-card__value">{salary} €</span>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="cb-employee-card__footer">
                  <button
                    className="cb-button cb-button--ghost"
                    onClick={() =>
                      setExpanded((prev) => (prev === i ? null : i))
                    }
                  >
                    {expanded === i ? "Voir moins" : "Voir plus"}
                  </button>

                  <button className="cb-button cb-button--secondary">
                    Voir contrat PDF
                  </button>
                </div>

                {/* ---- DETAILS ---- */}
                <div
                  className={
                    "cb-employee-card__details " +
                    (expanded === i ? "cb-employee-card__details--open" : "")
                  }
                >
                  <div className="cb-employee-card__details-section">
                    <h4>Données personnelles</h4>

                    <div className="cb-employee-card__details-row">
                      <span className="cb-employee-card__details-label">
                        Téléphone :
                      </span>
                      <span className="cb-employee-card__details-value">
                        {emp.phone || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__details-row">
                      <span className="cb-employee-card__details-label">
                        Email :
                      </span>
                      <span className="cb-employee-card__details-value">
                        {emp.email || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__details-row">
                      <span className="cb-employee-card__details-label">
                        Adresse :
                      </span>
                      <span className="cb-employee-card__details-value">
                        {emp.address || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="cb-employee-card__details-section">
                    <h4>Documents</h4>
                    <div className="cb-employee-card__details-row">
                      <button className="cb-button cb-button--secondary">
                        Voir contrat PDF
                      </button>
                    </div>
                  </div>

                  <button
                    className="cb-employee-card__delete"
                    onClick={() => deleteEmployee(emp.id)}
                  >
                    Supprimer l’employé
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}