"use client";

import { useEffect, useState, FormEvent } from "react";

type RequestType = "retard" | "conge" | "absence";

type EmployeeRequest = {
  id: string;
  employeeName: string;
  type: RequestType;
  date: string;
  heure?: string;
  message?: string;
  treated: boolean;
  createdAt: string;
};

const STORAGE_KEY = "cb-employee-requests-v1";

export default function DemandesPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [type, setType] = useState<RequestType>("retard");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [message, setMessage] = useState("");

  // Charger depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EmployeeRequest[];
      setRequests(parsed);
    } catch (e) {
      console.error("Erreur de chargement des demandes", e);
    }
  }, []);

  // Sauvegarder dès qu'on modifie la liste
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !date) return;

    const newReq: EmployeeRequest = {
      id: `REQ-${Date.now()}`,
      employeeName: employeeName.trim(),
      type,
      date,
      heure: heure || undefined,
      message: message.trim() || undefined,
      treated: false,
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [newReq, ...prev]);
    setEmployeeName("");
    setDate("");
    setHeure("");
    setMessage("");
    setType("retard");
  };

  const toggleTreated = (id: string) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, treated: !req.treated } : req
      )
    );
  };

  const deleteRequest = (id: string) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    setRequests((prev) => prev.filter((req) => req.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="cb-demandes">
      <div className="cb-demandes__header">
        <h2 className="cb-dashboard__title">Demandes des employés</h2>
        <p className="cb-dashboard__subtitle">
          Retards, congés, absences – suivi centralisé pour le responsable.
        </p>
      </div>

      <div className="cb-demandes__grid">
        {/* Formulaire */}
        <section className="cb-card cb-demandes__card-form">
          <h3 className="cb-card__title">Nouvelle demande</h3>
          <p className="cb-card__subtitle">
            Enregistre une demande pour un membre de l’équipe.
          </p>

          <form className="cb-form" onSubmit={handleSubmit}>
            <div className="cb-form__group">
              <label className="cb-form__label">Employé</label>
              <input
                className="cb-form__input"
                type="text"
                placeholder="Ex : Amine, Harouna, Raja..."
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
              />
            </div>

            <div className="cb-form__inline">
              <div className="cb-form__group">
                <label className="cb-form__label">Type</label>
                <select
                  className="cb-form__input"
                  value={type}
                  onChange={(e) => setType(e.target.value as RequestType)}
                >
                  <option value="retard">Retard</option>
                  <option value="absence">Absence</option>
                  <option value="conge">Congé</option>
                </select>
              </div>

              <div className="cb-form__group">
                <label className="cb-form__label">Date</label>
                <input
                  className="cb-form__input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="cb-form__group">
                <label className="cb-form__label">Heure (optionnel)</label>
                <input
                  className="cb-form__input"
                  type="time"
                  value={heure}
                  onChange={(e) => setHeure(e.target.value)}
                />
              </div>
            </div>

            <div className="cb-form__group">
              <label className="cb-form__label">Message (optionnel)</label>
              <textarea
                className="cb-form__textarea"
                placeholder="Détails : raison du retard, durée de l’absence, etc."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="cb-form__actions">
              <button type="submit" className="cb-button cb-button--primary">
                Enregistrer la demande
              </button>
            </div>
          </form>
        </section>

        {/* Liste des demandes */}
        <section className="cb-card cb-demandes__card-list">
          <h3 className="cb-card__title">
            Historique des demandes ({requests.length})
          </h3>
          <p className="cb-card__subtitle">
            Tu peux valider, marquer comme traitée ou supprimer chaque demande.
          </p>

          {requests.length === 0 ? (
            <p className="cb-demandes__empty">
              Aucune demande enregistrée pour le moment.
            </p>
          ) : (
            <ul className="cb-demandes__list">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className={`cb-demandes__item ${
                    req.treated ? "cb-demandes__item--treated" : ""
                  }`}
                >
                  <div className="cb-demandes__item-main">
                    <div className="cb-demandes__item-header">
                      <span className="cb-demandes__employee">
                        {req.employeeName}
                      </span>
                      <span
                        className={`cb-pill cb-pill--${req.type} ${
                          req.treated ? "cb-pill--soft" : ""
                        }`}
                      >
                        {req.type === "retard" && "Retard"}
                        {req.type === "absence" && "Absence"}
                        {req.type === "conge" && "Congé"}
                      </span>
                    </div>

                    <div className="cb-demandes__meta">
                      <span className="cb-demandes__meta-item">
                        📅 {req.date}
                        {req.heure && ` • 🕒 ${req.heure}`}
                      </span>
                      <span className="cb-demandes__meta-item">
                        Créée le {formatDate(req.createdAt)}
                      </span>
                    </div>

                    {req.message && (
                      <p className="cb-demandes__message">{req.message}</p>
                    )}
                  </div>

                  <div className="cb-demandes__actions">
                    <button
                      type="button"
                      className="cb-chip cb-chip--primary"
                      onClick={() => toggleTreated(req.id)}
                    >
                      {req.treated ? "Marquer comme en attente" : "Marquer traitée"}
                    </button>
                    <button
                      type="button"
                      className="cb-chip cb-chip--danger"
                      onClick={() => deleteRequest(req.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}