"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type EmployeeStored = {
  id: string;
  name: string;
  role: Role;
  hourlyRate?: number; // utilisé aussi par le planning
  phone?: string;
  email?: string;
  address?: string;
  contractHoursMonth?: number;
  hoursDoneMonth?: number;
  hourlyNet?: number;
  hourlyGross?: number;
  hasContractPdf?: boolean;
  // Infos admin "Voir plus"
  socialSecurityNumber?: string;
  iban?: string;
  adminNotes?: string;
};

type Employee = EmployeeStored;

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";

const EMPLOYEES_BASE: { id: string; name: string; role: Role }[] = [
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

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function computeIndicator(hoursDone: number, contractHours: number) {
  const diff = hoursDone - contractHours;
  let level: "low" | "ok" | "almost" | "extra" | "none" = "none";

  if (contractHours <= 0 && hoursDone <= 0) {
    level = "none";
  } else if (diff <= -8) {
    level = "low";
  } else if (diff <= -3) {
    level = "almost";
  } else if (diff <= 0) {
    level = "ok";
  } else {
    level = "extra";
  }

  return { diff, level };
}

type NewEmployeeDraft = {
  name: string;
  role: Role;
  phone: string;
  email: string;
  address: string;
  contractHoursMonth: number;
  hourlyNet: number;
  hourlyGross: number;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal d'ajout
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployeeDraft, setNewEmployeeDraft] = useState<NewEmployeeDraft>({
    name: "",
    role: "Serveur",
    phone: "",
    email: "",
    address: "",
    contractHoursMonth: 0,
    hourlyNet: 0,
    hourlyGross: 0,
  });

  // Charger depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as EmployeeStored[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed);
          return;
        }
      }

      // Si aucun employé enregistré, on initialise avec la base
      const initial: Employee[] = EMPLOYEES_BASE.map((base) => ({
        id: base.id,
        name: base.name,
        role: base.role,
        hourlyRate: 0,
        contractHoursMonth: 0,
        hoursDoneMonth: 0,
        hourlyNet: 0,
        hourlyGross: 0,
        phone: "",
        email: "",
        address: "",
        hasContractPdf: false,
        socialSecurityNumber: "",
        iban: "",
        adminNotes: "",
      }));
      setEmployees(initial);
    } catch (err) {
      console.error("Erreur chargement employés", err);
    }
  }, []);

  // Sauvegarder dans localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_EMPLOYEES_KEY, JSON.stringify(employees));
  }, [employees]);

  const handlePrev = () => {
    setActiveIndex((prev) =>
      prev <= 0 ? Math.max(employees.length - 1, 0) : prev - 1
    );
  };

  const handleNext = () => {
    setActiveIndex((prev) =>
      prev >= employees.length - 1 ? 0 : prev + 1
    );
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleChangeField = (
    id: string,
    field: keyof Employee,
    value: string
  ) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp;

        if (
          field === "contractHoursMonth" ||
          field === "hoursDoneMonth" ||
          field === "hourlyNet" ||
          field === "hourlyGross" ||
          field === "hourlyRate"
        ) {
          const num = value === "" ? 0 : Number(value.replace(",", "."));
          return {
            ...emp,
            [field]: Number.isNaN(num) ? emp[field] ?? 0 : num,
          } as Employee;
        }

        return {
          ...emp,
          [field]: value,
        } as Employee;
      })
    );
  };

  const handleToggleContractPdf = (id: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, hasContractPdf: !emp.hasContractPdf } : emp
      )
    );
  };

  const handleDeleteEmployee = (id: string) => {
    if (typeof window !== "undefined") {
      if (!window.confirm("Supprimer cet employé ?")) return;
    }
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
    setEditingId((prev) => (prev === id ? null : prev));
    setActiveIndex((prev) =>
      prev >= Math.max(prev - 1, 0) && prev >= employees.length - 1
        ? Math.max(prev - 1, 0)
        : prev
    );
  };

  // Ajout via modal
  const openAddModal = () => {
    setNewEmployeeDraft({
      name: "",
      role: "Serveur",
      phone: "",
      email: "",
      address: "",
      contractHoursMonth: 0,
      hourlyNet: 0,
      hourlyGross: 0,
    });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleSubmitNewEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeDraft.name.trim()) {
      alert("Merci de renseigner au moins le nom/prénom.");
      return;
    }

    const newId = `emp-${Date.now()}`;
    const newEmp: Employee = {
      id: newId,
      name: newEmployeeDraft.name.trim(),
      role: newEmployeeDraft.role,
      phone: newEmployeeDraft.phone.trim(),
      email: newEmployeeDraft.email.trim(),
      address: newEmployeeDraft.address.trim(),
      contractHoursMonth: newEmployeeDraft.contractHoursMonth,
      hoursDoneMonth: 0,
      hourlyNet: newEmployeeDraft.hourlyNet,
      hourlyGross: newEmployeeDraft.hourlyGross,
      hourlyRate: newEmployeeDraft.hourlyNet,
      hasContractPdf: false,
      socialSecurityNumber: "",
      iban: "",
      adminNotes: "",
    };

    setEmployees((prev) => [...prev, newEmp]);
    setActiveIndex(employees.length);
    setIsAddModalOpen(false);
  };

  const computed = useMemo(
    () =>
      employees.map((emp) => {
        const contractHours = emp.contractHoursMonth ?? 0;
        const hoursDone = emp.hoursDoneMonth ?? 0;
        const netRate =
          typeof emp.hourlyNet === "number" && emp.hourlyNet > 0
            ? emp.hourlyNet
            : emp.hourlyRate ?? 0;
        const grossRate = emp.hourlyGross ?? 0;

        const netSalary = netRate * hoursDone;
        const grossSalary = grossRate > 0 ? grossRate * hoursDone : 0;

        const { diff, level } = computeIndicator(hoursDone, contractHours);

        return {
          ...emp,
          contractHours,
          hoursDone,
          netRate,
          grossRate,
          netSalary,
          grossSalary,
          diff,
          indicatorLevel: level,
        };
      }),
    [employees]
  );

  if (employees.length === 0) {
    return (
      <div className="cb-employees">
        <div className="cb-employees__header">
          <div>
            <h2 className="cb-dashboard__title">Fiches employés</h2>
            <p className="cb-dashboard__subtitle">
              Gère ici les informations clés de ton équipe.
            </p>
          </div>
          <button
            type="button"
            className="cb-button cb-button--primary"
            onClick={openAddModal}
          >
            + Ajouter un employé
          </button>
        </div>
        <p>Aucun employé pour le moment.</p>

        {isAddModalOpen && (
          <AddEmployeeModal
            draft={newEmployeeDraft}
            setDraft={setNewEmployeeDraft}
            onClose={closeAddModal}
            onSubmit={handleSubmitNewEmployee}
          />
        )}
      </div>
    );
  }

  return (
    <div className="cb-employees">
      <div className="cb-employees__header">
        <div>
          <h2 className="cb-dashboard__title">Fiches employés</h2>
          <p className="cb-dashboard__subtitle">
            Coordonnées, contrat, heures effectuées et salaire estimé.
          </p>
        </div>
        <button
          type="button"
          className="cb-button cb-button--primary"
          onClick={openAddModal}
        >
          + Ajouter un employé
        </button>
      </div>

      {/* Slider mobile */}
      {employees.length > 1 && (
        <div className="cb-employees__mobile-slider">
          <button
            type="button"
            className="cb-button cb-button--ghost cb-employees__slider-btn"
            onClick={handlePrev}
          >
            ◀
          </button>
          <span className="cb-employees__slider-label">
            {employees[activeIndex]?.name} •{" "}
            {roleLabel(employees[activeIndex]?.role)} (
            {activeIndex + 1}/{employees.length})
          </span>
          <button
            type="button"
            className="cb-button cb-button--ghost cb-employees__slider-btn"
            onClick={handleNext}
          >
            ▶
          </button>
        </div>
      )}

      <div className="cb-employees__grid">
        {computed.map((emp, index) => {
          const isActive = index === activeIndex;
          const isExpanded = expandedId === emp.id;
          const isEditing = editingId === emp.id;

          const indicatorClass =
            emp.indicatorLevel === "low"
              ? "cb-employee__indicator--low"
              : emp.indicatorLevel === "almost"
              ? "cb-employee__indicator--almost"
              : emp.indicatorLevel === "ok"
              ? "cb-employee__indicator--ok"
              : emp.indicatorLevel === "extra"
              ? "cb-employee__indicator--extra"
              : "cb-employee__indicator--none";

          return (
            <article
              key={emp.id}
              className={
                "cb-card cb-employee-card" +
                (isActive ? " cb-employee-card--active" : "")
              }
            >
              {/* Mode lecture */}
              {!isEditing && (
                <>
                  <header className="cb-employee-card__header">
                    <div>
                      <h3 className="cb-employee-card__name">
                        {emp.name || "Employé"}
                      </h3>
                      <p className="cb-employee-card__role">
                        {roleLabel(emp.role)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="cb-button cb-button--ghost cb-employee-card__edit-btn"
                      onClick={() => handleStartEdit(emp.id)}
                    >
                      ✏️
                    </button>
                  </header>

                  <div className="cb-employee-card__body">
                    <div className="cb-employee-card__info">
                      {emp.phone && (
                        <div className="cb-employee-card__line">
                          <span className="cb-employee-card__icon">📞</span>
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      {emp.email && (
                        <div className="cb-employee-card__line">
                          <span className="cb-employee-card__icon">✉️</span>
                          <span>{emp.email}</span>
                        </div>
                      )}
                      {emp.address && (
                        <div className="cb-employee-card__line">
                          <span className="cb-employee-card__icon">📍</span>
                          <span>{emp.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="cb-employee-card__section">
                      <div className="cb-employee-card__section-header">
                        <span>Contrat & heures</span>
                      </div>
                      <div className="cb-employee-card__row">
                        <span className="cb-employee-card__label">
                          Heures contrat (mois)
                        </span>
                        <span className="cb-employee-card__value">
                          {emp.contractHours} h
                        </span>
                      </div>
                      <div className="cb-employee-card__row">
                        <span className="cb-employee-card__label">
                          Heures effectuées
                        </span>
                        <span className="cb-employee-card__value">
                          {emp.hoursDone} h
                        </span>
                      </div>
                      <div className="cb-employee-card__row cb-employee-card__row--indicator">
                        <span className="cb-employee-card__label">Écart</span>
                        <span
                          className={
                            "cb-employee__indicator " + indicatorClass
                          }
                        >
                          {emp.diff === 0
                            ? "OK"
                            : emp.diff > 0
                            ? `+${emp.diff}h`
                            : `${emp.diff}h`}
                        </span>
                      </div>
                    </div>

                    <div className="cb-employee-card__section">
                      <div className="cb-employee-card__section-header">
                        <span>Salaire estimé</span>
                      </div>
                      <div className="cb-employee-card__row">
                        <span className="cb-employee-card__label">
                          Taux horaire net
                        </span>
                        <span className="cb-employee-card__value">
                          {emp.netRate > 0
                            ? `${emp.netRate.toFixed(2)} €`
                            : "—"}
                        </span>
                      </div>
                      <div className="cb-employee-card__row">
                        <span className="cb-employee-card__label">
                          Salaire net estimé
                        </span>
                        <span className="cb-employee-card__value">
                          {emp.netSalary > 0
                            ? formatCurrency(emp.netSalary)
                            : "—"}
                        </span>
                      </div>
                      <div className="cb-employee-card__row">
                        <span className="cb-employee-card__label">
                          Salaire brut estimé
                        </span>
                        <span className="cb-employee-card__value">
                          {emp.grossSalary > 0
                            ? formatCurrency(emp.grossSalary)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <footer className="cb-employee-card__footer">
                    <button
                      type="button"
                      className="cb-button cb-button--secondary"
                      onClick={() => {
                        if (!emp.hasContractPdf) {
                          handleToggleContractPdf(emp.id);
                          alert(
                            "Contrat marqué comme disponible. La génération/visualisation PDF sera ajoutée ensuite."
                          );
                        } else {
                          alert(
                            "Ici tu pourras ouvrir le contrat PDF de l'employé (viewer ou lien)."
                          );
                        }
                      }}
                    >
                      {emp.hasContractPdf
                        ? "Voir contrat PDF"
                        : "Faire un contrat PDF"}
                    </button>

                    <button
                      type="button"
                      className="cb-button cb-button--ghost"
                      onClick={() => handleToggleExpand(emp.id)}
                    >
                      {isExpanded ? "Voir moins ▲" : "Voir plus ▼"}
                    </button>

                    <button
                      type="button"
                      className="cb-button cb-button--ghost cb-employee-card__delete"
                      onClick={() => handleDeleteEmployee(emp.id)}
                    >
                      Supprimer
                    </button>
                  </footer>

                  {/* Détails "Voir plus" */}
                  <div
                    className={
                      "cb-employee-card__details" +
                      (isExpanded
                        ? " cb-employee-card__details--open"
                        : " cb-employee-card__details--closed")
                    }
                  >
                    <div className="cb-employee-card__details-section">
                      <h4>Infos administratives</h4>
                      <div className="cb-employee-card__details-row">
                        <span className="cb-employee-card__details-label">
                          N° Sécurité sociale
                        </span>
                        <span className="cb-employee-card__details-value">
                          {emp.socialSecurityNumber || "Non renseigné"}
                        </span>
                      </div>
                      <div className="cb-employee-card__details-row">
                        <span className="cb-employee-card__details-label">
                          RIB / IBAN
                        </span>
                        <span className="cb-employee-card__details-value">
                          {emp.iban || "Non renseigné"}
                        </span>
                      </div>
                      <div className="cb-employee-card__details-row">
                        <span className="cb-employee-card__details-label">
                          Notes RH
                        </span>
                        <span className="cb-employee-card__details-value">
                          {emp.adminNotes || "Aucune note pour le moment."}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Mode édition */}
              {isEditing && (
                <form
                  className="cb-employee-card__edit-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEditingId(null);
                  }}
                >
                  <header className="cb-employee-card__header">
                    <div>
                      <h3 className="cb-employee-card__name">
                        {emp.name || "Nouvel employé"}
                      </h3>
                      <p className="cb-employee-card__role">
                        {roleLabel(emp.role)}
                      </p>
                    </div>
                  </header>

                  <div className="cb-employee-card__edit-grid">
                    <div className="cb-employee-card__field">
                      <label>Nom / prénom</label>
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) =>
                          handleChangeField(emp.id, "name", e.target.value)
                        }
                        placeholder="Nom complet"
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Poste</label>
                      <select
                        value={emp.role}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "role",
                            e.target.value as Role
                          )
                        }
                      >
                        <option value="Patron">Patron</option>
                        <option value="Responsable">Responsable</option>
                        <option value="Barman">Barman</option>
                        <option value="Cuisine">Cuisine</option>
                        <option value="Serveur">Serveur</option>
                      </select>
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Téléphone</label>
                      <input
                        type="tel"
                        value={emp.phone ?? ""}
                        onChange={(e) =>
                          handleChangeField(emp.id, "phone", e.target.value)
                        }
                        placeholder="06..."
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Email</label>
                      <input
                        type="email"
                        value={emp.email ?? ""}
                        onChange={(e) =>
                          handleChangeField(emp.id, "email", e.target.value)
                        }
                        placeholder="prenom@exemple.fr"
                      />
                    </div>

                    <div className="cb-employee-card__field cb-employee-card__field--full">
                      <label>Adresse</label>
                      <input
                        type="text"
                        value={emp.address ?? ""}
                        onChange={(e) =>
                          handleChangeField(emp.id, "address", e.target.value)
                        }
                        placeholder="Adresse complète"
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Heures contrat (mois)</label>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={emp.contractHoursMonth ?? 0}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "contractHoursMonth",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Heures effectuées (mois)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={emp.hoursDoneMonth ?? 0}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "hoursDoneMonth",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Taux horaire net (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={emp.hourlyNet ?? 0}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "hourlyNet",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>Taux horaire brut (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={emp.hourlyGross ?? 0}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "hourlyGross",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    {/* Infos admin dans Voir plus */}
                    <div className="cb-employee-card__field">
                      <label>N° Sécurité sociale</label>
                      <input
                        type="text"
                        value={emp.socialSecurityNumber ?? ""}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "socialSecurityNumber",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="cb-employee-card__field">
                      <label>RIB / IBAN</label>
                      <input
                        type="text"
                        value={emp.iban ?? ""}
                        onChange={(e) =>
                          handleChangeField(emp.id, "iban", e.target.value)
                        }
                      />
                    </div>

                    <div className="cb-employee-card__field cb-employee-card__field--full">
                      <label>Notes RH</label>
                      <input
                        type="text"
                        value={emp.adminNotes ?? ""}
                        onChange={(e) =>
                          handleChangeField(
                            emp.id,
                            "adminNotes",
                            e.target.value
                          )
                        }
                        placeholder="Observations internes…"
                      />
                    </div>
                  </div>

                  <footer className="cb-employee-card__footer cb-employee-card__footer--edit">
                    <button
                      type="button"
                      className="cb-button cb-button--ghost"
                      onClick={handleCancelEdit}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="cb-button cb-button--primary"
                    >
                      Enregistrer
                    </button>
                  </footer>
                </form>
              )}
            </article>
          );
        })}
      </div>

      {isAddModalOpen && (
        <AddEmployeeModal
          draft={newEmployeeDraft}
          setDraft={setNewEmployeeDraft}
          onClose={closeAddModal}
          onSubmit={handleSubmitNewEmployee}
        />
      )}
    </div>
  );
}

// Modal d'ajout employé
type AddEmployeeModalProps = {
  draft: NewEmployeeDraft;
  setDraft: React.Dispatch<React.SetStateAction<NewEmployeeDraft>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

function AddEmployeeModal({
  draft,
  setDraft,
  onClose,
  onSubmit,
}: AddEmployeeModalProps) {
  return (
    <div className="cb-modal">
      <div className="cb-modal__backdrop" onClick={onClose} />
      <div className="cb-modal__content">
        <h3 className="cb-modal__title">Ajouter un employé</h3>
        <p className="cb-modal__subtitle">
          Renseigne les informations essentielles, tu pourras compléter plus tard.
        </p>

        <form className="cb-modal__form" onSubmit={onSubmit}>
          <div className="cb-modal__grid">
            <div className="cb-modal__field cb-modal__field--full">
              <label>Nom / prénom</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nom complet"
              />
            </div>

            <div className="cb-modal__field">
              <label>Poste</label>
              <select
                value={draft.role}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    role: e.target.value as Role,
                  }))
                }
              >
                <option value="Patron">Patron</option>
                <option value="Responsable">Responsable</option>
                <option value="Barman">Barman</option>
                <option value="Cuisine">Cuisine</option>
                <option value="Serveur">Serveur</option>
              </select>
            </div>

            <div className="cb-modal__field">
              <label>Téléphone</label>
              <input
                type="tel"
                value={draft.phone}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="06..."
              />
            </div>

            <div className="cb-modal__field cb-modal__field--full">
              <label>Email</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="prenom@exemple.fr"
              />
            </div>

            <div className="cb-modal__field cb-modal__field--full">
              <label>Adresse</label>
              <input
                type="text"
                value={draft.address}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Adresse complète"
              />
            </div>

            <div className="cb-modal__field">
              <label>Heures contrat (mois)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.contractHoursMonth}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    contractHoursMonth: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="cb-modal__field">
              <label>Taux horaire net (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.hourlyNet}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    hourlyNet: Number(e.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="cb-modal__field">
              <label>Taux horaire brut (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.hourlyGross}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    hourlyGross: Number(e.target.value || 0),
                  }))
                }
              />
            </div>
          </div>

          <div className="cb-modal__footer">
            <button
              type="button"
              className="cb-button cb-button--ghost"
              onClick={onClose}
            >
              Annuler
            </button>
            <button type="submit" className="cb-button cb-button--primary">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}