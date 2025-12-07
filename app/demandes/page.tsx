"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type EmployeeBase = {
  id: string;
  name: string;
  role: Role;
};

type EmployeeFromStorage = {
  id: string;
  name: string;
  role: Role;
  hourlyRate?: number;
};

type Employee = EmployeeBase & { hourlyRate: number };

type RequestType = "retard" | "conge" | "absence";

export type EmployeeRequest = {
  id: string;
  employeeId: string;
  type: RequestType;
  date: string; // YYYY-MM-DD
  heure?: string;
  message?: string;
  treated: boolean; // true = congé accepté (pris en compte sur le planning)
  createdAt?: string;
};

const EMPLOYEES_BASE: EmployeeBase[] = [
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

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";
const STORAGE_REQUESTS_KEY = "CB_REQUESTS";

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function typeLabel(t: RequestType): string {
  switch (t) {
    case "retard":
      return "Retard";
    case "conge":
      return "Congé";
    case "absence":
      return "Absence";
    default:
      return t;
  }
}

export default function DemandesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);

  const [employeeId, setEmployeeId] = useState<string>("amine");
  const [type, setType] = useState<RequestType>("conge");
  const [date, setDate] = useState<string>(todayISO());
  const [heure, setHeure] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // Charger employés
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EmployeeFromStorage[];
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
          if (!merged.find((e) => e.id === employeeId)) {
            setEmployeeId(merged[0]?.id ?? "");
          }
          return;
        }
      }
    } catch (err) {
      console.error("Erreur chargement employés (demandes)", err);
    }

    setEmployees(
      EMPLOYEES_BASE.map((e) => ({
        ...e,
        hourlyRate: 0,
      }))
    );
  }, []);

  // Charger demandes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_REQUESTS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EmployeeRequest[];
      if (Array.isArray(parsed)) {
        setRequests(parsed);
      }
    } catch (err) {
      console.error("Erreur chargement demandes", err);
    }
  }, []);

  // Sauvegarde demandes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
  }, [requests]);

  const handleAddRequest = () => {
    if (!employeeId || !date) return;

    const newReq: EmployeeRequest = {
      id: `REQ-${Date.now()}`,
      employeeId,
      type,
      date,
      heure: heure || undefined,
      message: message.trim() || undefined,
      treated: false,
      createdAt: new Date().toISOString(),
    };

    setRequests((prev) => [newReq, ...prev]);
    setHeure("");
    setMessage("");
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAccept = (id: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              treated: true,
            }
          : r
      )
    );
  };

  const pendingRequests = useMemo(
    () => requests.filter((r) => !r.treated),
    [requests]
  );
  const treatedRequests = useMemo(
    () => requests.filter((r) => r.treated),
    [requests]
  );

  const pendingToday = pendingRequests.filter((r) => r.date === todayISO());

  const findEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)?.name ?? "Inconnu";

  return (
    <div>
      {/* HEADER */}
      <div className="cb-planning__header">
        <div>
          <h2 className="cb-dashboard__title">Demandes des employés</h2>
          <p className="cb-dashboard__subtitle">
            Retards, congés et absences, connectés au planning
          </p>
        </div>
      </div>

      {/* FORMULAIRE */}
      <section className="cb-card cb-requests-form">
        <h3 className="cb-section-title">Nouvelle demande</h3>

        <div className="cb-requests-form__grid">
          <div className="cb-requests-form__field">
            <label>Employé</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} · {emp.role}
                </option>
              ))}
            </select>
          </div>

          <div className="cb-requests-form__field cb-requests-form__field--small">
            <label>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RequestType)}
            >
              <option value="conge">Congé</option>
              <option value="retard">Retard</option>
              <option value="absence">Absence</option>
            </select>
          </div>

          <div className="cb-requests-form__field cb-requests-form__field--small">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="cb-requests-form__field cb-requests-form__field--small">
            <label>Heure (optionnel)</label>
            <input
              type="time"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
            />
          </div>

          <div className="cb-requests-form__field cb-requests-form__field--full">
            <label>Message (facultatif)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex. : Demande de congé, retard RER, enfant malade..."
              rows={2}
            />
          </div>

          <div className="cb-requests-form__actions">
            <button
              type="button"
              className="cb-button cb-button--secondary"
              onClick={handleAddRequest}
            >
              Enregistrer
            </button>
          </div>
        </div>

        <p className="cb-requests-form__hint">
          Quand tu <strong>acceptes un congé</strong>, il est automatiquement
          pris en compte dans le planning de l&apos;équipe.
        </p>
      </section>

      {/* DEMANDES EN ATTENTE */}
      <section className="cb-card cb-requests-list">
        <div className="cb-requests-list__header">
          <h3 className="cb-section-title">
            Demandes en attente ({pendingRequests.length})
          </h3>
          {pendingToday.length > 0 && (
            <div className="cb-requests-list__today">
              {pendingToday.length} demande(s) pour aujourd&apos;hui
            </div>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <p className="cb-requests-empty">
            Aucune demande en attente pour le moment.
          </p>
        ) : (
          <ul className="cb-requests-cards">
            {pendingRequests.map((req) => (
              <li key={req.id} className="cb-request-card">
                <div className="cb-request-card__top">
                  <div>
                    <div className="cb-request-card__employee">
                      {findEmployeeName(req.employeeId)}
                    </div>
                    <div className="cb-request-card__meta">
                      <span>{typeLabel(req.type)}</span>
                      <span>·</span>
                      <span>{req.date}</span>
                      {req.heure && (
                        <>
                          <span>·</span>
                          <span>{req.heure}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="cb-chip cb-chip--warning">En attente</span>
                </div>

                {req.message && (
                  <p className="cb-request-card__message">{req.message}</p>
                )}

                <div className="cb-request-card__actions">
                  {req.type === "conge" && (
                    <button
                      type="button"
                      className="cb-button cb-button--secondary cb-request-card__btn"
                      onClick={() => handleAccept(req.id)}
                    >
                      Accepter le congé
                    </button>
                  )}
                  <button
                    type="button"
                    className="cb-button cb-button--ghost cb-request-card__btn"
                    onClick={() => handleDelete(req.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* HISTORIQUE TRAITÉ */}
      {treatedRequests.length > 0 && (
        <section className="cb-card cb-requests-history">
          <h3 className="cb-section-title">Congés acceptés</h3>
          <ul className="cb-requests-history__list">
            {treatedRequests.map((req) => (
              <li key={req.id} className="cb-requests-history__item">
                <span className="cb-requests-history__main">
                  {findEmployeeName(req.employeeId)} · {typeLabel(req.type)} ·{" "}
                  {req.date}
                </span>
                <span className="cb-requests-history__status">
                  Accepté · impacte le planning
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}