"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

// =====================================================
// 🔹 TYPES + CONSTANTES (Employés)
// =====================================================

type Role = "Patron" | "Responsable" | "Barman" | "Cuisine" | "Serveur";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  email?: string;
  address?: string;
  monthlyContractHours: number;
  hourlyRateNet: number;
  hourlyRateGross: number;

  // 🔹 Infos administratives (pour la fiche complète)
  socialSecurityNumber?: string;
  rib?: string;
  iban?: string;
  contractType?: string;
  bankName?: string;
  hireDate?: string; // "YYYY-MM-DD"
};

type StoredEmployee = Employee & {
  name: string; // compat pour la présence
  hourlyRate: number; // compat : on stocke le brut horaire ici
};

const STORAGE_EMPLOYEES_KEY = "CB_EMPLOYEES";
const STORAGE_PRESENCE_KEY = "CB_PRESENCE_V1";

// -----------------------------------------------------
// Données de base (fallback)
// -----------------------------------------------------

type PresenceRecord = {
  present: boolean;
  start?: string;
  end?: string;
};

type PresenceState = {
  [key: string]: PresenceRecord; // `${date}::${employeeId}`
};

// même mapping que dans la feuille de présence
const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "aurelie",
    firstName: "Aurélie",
    lastName: "",
    role: "Patron",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "hadrien",
    firstName: "Hadrien",
    lastName: "",
    role: "Responsable",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "eric",
    firstName: "Eric",
    lastName: "",
    role: "Responsable",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "harouna",
    firstName: "Harouna",
    lastName: "",
    role: "Barman",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "raja",
    firstName: "Raja",
    lastName: "",
    role: "Cuisine",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "pirakash",
    firstName: "PIRAKASH",
    lastName: "",
    role: "Cuisine",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "alan",
    firstName: "Alan",
    lastName: "",
    role: "Cuisine",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "amine",
    firstName: "Amine",
    lastName: "",
    role: "Serveur",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "tom",
    firstName: "Tom",
    lastName: "",
    role: "Serveur",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
  {
    id: "nazario",
    firstName: "Nazario",
    lastName: "",
    role: "Serveur",
    phone: "",
    email: "",
    address: "",
    monthlyContractHours: 0,
    hourlyRateNet: 0,
    hourlyRateGross: 0,
    socialSecurityNumber: "",
    rib: "",
    iban: "",
    contractType: "",
    bankName: "",
    hireDate: "",
  },
];

// -----------------------------------------------------
// Helpers temps + formattage
// -----------------------------------------------------
function parseHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  )
    return 0;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return (endMin - startMin) / 60;
}

function getCurrentMonthKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`; // 2025-12
}

function fullName(emp: Employee): string {
  return `${emp.firstName} ${emp.lastName ?? ""}`.trim();
}

type FormState = {
  id?: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string;
  email: string;
  address: string;
  monthlyContractHours: string;
  hourlyRateNet: string;
  hourlyRateGross: string;

  socialSecurityNumber: string;
  rib: string;
  iban: string;
  contractType: string;
  bankName: string;
  hireDate: string;
};

const emptyForm: FormState = {
  id: undefined,
  firstName: "",
  lastName: "",
  role: "Serveur",
  phone: "",
  email: "",
  address: "",
  monthlyContractHours: "",
  hourlyRateNet: "",
  hourlyRateGross: "",
  socialSecurityNumber: "",
  rib: "",
  iban: "",
  contractType: "",
  bankName: "",
  hireDate: "",
};

// =====================================================
// 🔹 PAGE EMPLOYÉS
//    State -> chargement LS -> dérivés -> rendu
// =====================================================
export default function EmployeesPage() {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const shouldCenterOnIndexRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const scrollDirRef = useRef<1 | -1>(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [presence, setPresence] = useState<PresenceState>({});
  const [isMobile, setIsMobile] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0); // index "carrousel" (sur mobile: liste étendue avec clones)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const monthKey = getCurrentMonthKey();

  /* -----------------------------
     1. Chargement initial
  ----------------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;

    // employés
    try {
      const raw = window.localStorage.getItem(STORAGE_EMPLOYEES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredEmployee[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: Employee[] = parsed.map((e) => ({
            id: e.id,
            firstName: (e as any).firstName ?? e.name.split(" ")[0] ?? "",
            lastName:
              (e as any).lastName ??
              e.name.split(" ").slice(1).join(" ") ??
              "",
            role: e.role,
            phone: (e as any).phone ?? "",
            email: (e as any).email ?? "",
            address: (e as any).address ?? "",
            monthlyContractHours:
              Number((e as any).monthlyContractHours) || 0,
            hourlyRateNet: Number((e as any).hourlyRateNet) || 0,
            hourlyRateGross:
              Number((e as any).hourlyRateGross) || e.hourlyRate || 0,

            // 🔹 On récupère aussi les champs admin s'ils existent déjà
            socialSecurityNumber: (e as any).socialSecurityNumber ?? "",
            rib: (e as any).rib ?? "",
            iban: (e as any).iban ?? "",
            contractType: (e as any).contractType ?? "",
            bankName: (e as any).bankName ?? "",
            hireDate: (e as any).hireDate ?? "",
          }));
          setEmployees(mapped);
        } else {
          setEmployees(DEFAULT_EMPLOYEES);
        }
      } else {
        setEmployees(DEFAULT_EMPLOYEES);
      }
    } catch (err) {
      console.error("Erreur chargement employés", err);
      setEmployees(DEFAULT_EMPLOYEES);
    }

    // présences
    try {
      const rawPresence = window.localStorage.getItem(STORAGE_PRESENCE_KEY);
      if (rawPresence) {
        const parsedPresence = JSON.parse(rawPresence) as PresenceState;
        if (parsedPresence && typeof parsedPresence === "object") {
          setPresence(parsedPresence);
        }
      }
    } catch (err) {
      console.error("Erreur chargement présences pour les employés", err);
    }
  }, []);

  /* -----------------------------
     2. Sauvegarde employés
  ----------------------------- */

  const persistEmployees = (list: Employee[]) => {
    if (typeof window === "undefined") return;
    const toStore: StoredEmployee[] = list.map((e) => ({
      ...e,
      name: fullName(e),
      hourlyRate: e.hourlyRateGross, // compat avec la feuille de présence
    }));
    window.localStorage.setItem(
      STORAGE_EMPLOYEES_KEY,
      JSON.stringify(toStore)
    );
  };

  /* -----------------------------
     3. Calcul heures mensuelles
  ----------------------------- */

  const monthlyHoursByEmployee = useMemo(() => {
    const result: Record<string, number> = {};

    Object.entries(presence).forEach(([key, rec]) => {
      const [datePart, employeeId] = key.split("::");
      if (!datePart || !employeeId) return;

      // filtrer sur le mois courant
      if (!datePart.startsWith(monthKey)) return;

      if (!rec.present || !rec.start || !rec.end) return;

      const hours = parseHours(rec.start, rec.end);
      if (!hours) return;

      result[employeeId] = (result[employeeId] || 0) + hours;
    });

    return result;
  }, [presence, monthKey]);

  /* -----------------------------
     4. Helpers d’indicateur
  ----------------------------- */

  function getIndicator(emp: Employee) {
    const monthlyHours = monthlyHoursByEmployee[emp.id] || 0;
    const contract = emp.monthlyContractHours || 0;

    if (!contract) {
      return {
        label: "Heures non définies",
        pillText: "—",
        pillClass: "cb-employee__indicator cb-employee__indicator--none",
        monthlyHours,
        diff: 0,
      };
    }

    const diff = monthlyHours - contract;

    let pillClass = "cb-employee__indicator cb-employee__indicator--none";
    const pillText = `${monthlyHours.toFixed(1)} h / ${contract} h`;

    if (monthlyHours === 0) {
      pillClass = "cb-employee__indicator cb-employee__indicator--none";
    } else if (diff < -5) {
      pillClass = "cb-employee__indicator cb-employee__indicator--low";
    } else if (Math.abs(diff) <= 5) {
      pillClass = "cb-employee__indicator cb-employee__indicator--ok";
    } else if (diff > 5) {
      pillClass = "cb-employee__indicator cb-employee__indicator--extra";
    } else {
      pillClass = "cb-employee__indicator cb-employee__indicator--almost";
    }

    return {
      label: `Contrat : ${contract} h / Mois`,
      pillText,
      pillClass,
      monthlyHours,
      diff,
    };
  }

  /* -----------------------------
     5. Ouverture / fermeture modal
  ----------------------------- */

  const openCreateModal = () => {
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setForm({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      role: emp.role,
      phone: emp.phone ?? "",
      email: emp.email ?? "",
      address: emp.address ?? "",
      monthlyContractHours:
        emp.monthlyContractHours > 0
          ? String(emp.monthlyContractHours)
          : "",
      hourlyRateNet:
        emp.hourlyRateNet > 0 ? String(emp.hourlyRateNet) : "",
      hourlyRateGross:
        emp.hourlyRateGross > 0 ? String(emp.hourlyRateGross) : "",

      socialSecurityNumber: emp.socialSecurityNumber ?? "",
      rib: emp.rib ?? "",
      iban: emp.iban ?? "",
      contractType: emp.contractType ?? "",
      bankName: emp.bankName ?? "",
      hireDate: emp.hireDate ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  /* -----------------------------
     6. Gestion formulaire
  ----------------------------- */

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const monthlyContractHours = Number(form.monthlyContractHours) || 0;
    const hourlyRateNet = Number(form.hourlyRateNet) || 0;
    const hourlyRateGross = Number(form.hourlyRateGross) || 0;

    const base: Employee = {
      id: form.id ?? crypto.randomUUID(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      monthlyContractHours,
      hourlyRateNet,
      hourlyRateGross,

      socialSecurityNumber: form.socialSecurityNumber.trim(),
      rib: form.rib.trim(),
      iban: form.iban.trim(),
      contractType: form.contractType.trim(),
      bankName: form.bankName.trim(),
      hireDate: form.hireDate.trim(),
    };

    setEmployees((prev) => {
      let next: Employee[];
      if (form.id) {
        // édition
        next = prev.map((e) => (e.id === form.id ? base : e));
      } else {
        // création
        next = [...prev, base];
      }
      persistEmployees(next);
      return next;
    });

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer cet employé ?")) return;
    setEmployees((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistEmployees(next);
      return next;
    });
  };

  // ===== Mobile loop "parfait" (clones) =====
  const hasLoop = isMobile && employees.length > 1;
  const mobileCards: Employee[] = useMemo(() => {
    if (!hasLoop) return employees;
    const first = employees[0];
    const last = employees[employees.length - 1];
    return [last, ...employees, first];
  }, [employees, hasLoop]);

  const toRealIndex = (idx: number) => {
    if (!hasLoop) return Math.max(0, Math.min(idx, employees.length - 1));
    if (idx === 0) return employees.length - 1;
    if (idx === employees.length + 1) return 0;
    return idx - 1;
  };

  const toLoopIndex = (realIdx: number) => (hasLoop ? realIdx + 1 : realIdx);

  /* -----------------------------
     7. Navigation mobile (slider)
  ----------------------------- */

const handlePrevMobile = () => {
  shouldCenterOnIndexRef.current = true;
  setMobileIndex((prev) => {
    if (!hasLoop) {
      return employees.length === 0 ? 0 : (prev - 1 + employees.length) % employees.length;
    }
    // carrousel étendu: on peut aller sur le clone (index 0)
    return prev <= 0 ? employees.length : prev - 1;
  });
  setExpandedIds(new Set());
};

const handleNextMobile = () => {
  shouldCenterOnIndexRef.current = true;
  setMobileIndex((prev) => {
    if (!hasLoop) {
      return employees.length === 0 ? 0 : (prev + 1) % employees.length;
    }
    // carrousel étendu: on peut aller sur le clone (index employees.length + 1)
    const maxIdx = employees.length + 1;
    return prev >= maxIdx ? 1 : prev + 1;
  });
  setExpandedIds(new Set());
};
  // Ajuste l'index quand la liste change (suppr / ajout)
  useEffect(() => {
    if (employees.length === 0) {
      setMobileIndex(0);
      return;
    }

    if (!hasLoop) {
      setMobileIndex((prev) => (prev >= employees.length ? employees.length - 1 : prev));
      return;
    }

    // Sur mobile avec clones: index par défaut = 1 (première vraie carte)
    setMobileIndex((prev) => {
      const maxIdx = employees.length + 1;
      if (prev < 0) return 1;
      if (prev > maxIdx) return 1;
      return prev === 0 || prev === maxIdx ? prev : prev;
    });
  }, [employees.length, hasLoop]);

  // Responsive : savoir si on est en mobile pour l'effet carrousel
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Bloque le scroll derrière la modal
  useEffect(() => {
    if (typeof document === "undefined") return;
    const original = document.body.style.overflow;
    document.body.style.overflow = isModalOpen ? "hidden" : original;
    return () => {
      document.body.style.overflow = original;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isMobile) return;
    if (!sliderRef.current) return;
    if (!shouldCenterOnIndexRef.current) return;

    const cards = sliderRef.current.querySelectorAll<HTMLElement>(
      ".cb-employee-card"
    );
    const activeCard = cards[mobileIndex];

    if (activeCard) {
      isProgrammaticScrollRef.current = true;
      activeCard.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 340);
    }

    shouldCenterOnIndexRef.current = false;
  }, [mobileIndex, isMobile, mobileCards.length]);

  const toggleExpanded = (id: string) => {
  setExpandedIds((prev) => {
    const next = new Set<string>();

    // si la carte est déjà ouverte -> on ferme tout
    if (prev.has(id)) {
      return next; // aucun ouvert
    }

    // sinon on ouvre seulement celle-ci
    next.add(id);
    return next;
  });
};


  // ✅ Mobile: la carte active suit le swipe (carte la plus centrée)
  useEffect(() => {
    if (!isMobile) return;
    const root = sliderRef.current;
    if (!root) return;

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(".cb-employee-card")
    );
    if (cards.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;

        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best?.isIntersecting) return;

        const el = best.target as HTMLElement;
        const idx = Number(el.dataset.index);
        if (!Number.isNaN(idx)) {
          setMobileIndex(idx);
        }
      },
      {
        root,
        threshold: [0.25, 0.4, 0.55, 0.7, 0.85],
        // fenêtre centrale pour favoriser la carte au milieu
        rootMargin: "0px -35% 0px -35%",
      }
    );

    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [isMobile, mobileCards.length]);


  // ✅ Mobile: loop parfait via clones (jump invisible après inertie)
  useEffect(() => {
    if (!hasLoop) return;
    const root = sliderRef.current;
    if (!root) return;

    let t: number | null = null;

    const jumpTo = (idx: number) => {
      const cards = root.querySelectorAll<HTMLElement>(".cb-employee-card");
      const target = cards[idx];
      if (!target) return;

      isProgrammaticScrollRef.current = true;
      // jump instantané, puis on relâche le flag
      target.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 60);
    };

    const onScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      if (t) window.clearTimeout(t);

      // attendre la fin de l'inertie
      t = window.setTimeout(() => {
        if (isProgrammaticScrollRef.current) return;

        // Si on est sur un clone, on saute vers la vraie carte correspondante
        if (mobileIndex === 0) {
          // clone du dernier -> vraie dernière (index employees.length)
          jumpTo(employees.length);
          setMobileIndex(employees.length);
          return;
        }
        if (mobileIndex === employees.length + 1) {
          // clone du premier -> vraie première (index 1)
          jumpTo(1);
          setMobileIndex(1);
        }
      }, 120);
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (t) window.clearTimeout(t);
    };
  }, [hasLoop, mobileIndex, employees.length]);

  // ✅ Au passage en mobile loop: on se place sur la première vraie carte
  useEffect(() => {
    if (!hasLoop) return;
    if (!sliderRef.current) return;
    if (employees.length === 0) return;

    // si on arrive en mobile, on force la première vraie carte
    setMobileIndex(1);
    window.setTimeout(() => {
      const root = sliderRef.current;
      if (!root) return;
      const cards = root.querySelectorAll<HTMLElement>(".cb-employee-card");
      const firstReal = cards[1];
      if (!firstReal) return;
      isProgrammaticScrollRef.current = true;
      firstReal.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 60);
    }, 0);
  }, [hasLoop, employees.length]);

  /* -----------------------------
     8. Rendu
  ----------------------------- */

  return (
    <div className="cb-employees">
      {/* Header */}
      <div className="cb-employees__header">
        <div>
          <h2 className="cb-dashboard__title">Employés</h2>
          <p className="cb-dashboard__subtitle">
            Fiches complètes, contrats, heures et informations administratives.
          </p>
        </div>
        <button
          type="button"
          className="cb-button cb-button--secondary"
          onClick={openCreateModal}
        >
          Ajouter un employé
        </button>
      </div>

      {/* Slider mobile (carrousel) */}
      {employees.length > 0 && (
        <div className="cb-employees__mobile-slider">
          <button
            type="button"
            className="cb-button cb-button--ghost cb-employees__slider-btn"
            onClick={handlePrevMobile}
          >
            ←
          </button>
          <span className="cb-employees__slider-label">
            Fiche {employees[toRealIndex(mobileIndex)]?.firstName || ""} (
            {employees.length ? toRealIndex(mobileIndex) + 1 : 0}/{employees.length})
          </span>
          <button
            type="button"
            className="cb-button cb-button--ghost cb-employees__slider-btn"
            onClick={handleNextMobile}
          >
            →
          </button>
          <div className="cb-employees__slider-progress" aria-hidden="true">
            <div
              className="cb-employees__slider-progress-bar"
              style={{
                width: `${employees.length ? ((toRealIndex(mobileIndex) + 1) / employees.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Cartes */}
      <div
        className={
          "cb-employees__grid" + (isMobile ? " cb-employees__grid--mobile" : "")
        }
        ref={sliderRef}
        style={
          isMobile
            ? {
                maxWidth: "100%",
                padding: "0px",
              }
            : undefined
        }
      >
        {(hasLoop ? mobileCards : employees).map((emp, index) => {
          const realEmp = hasLoop ? employees[toRealIndex(index)] ?? emp : emp;
          const { label, pillText, pillClass, monthlyHours } =
            getIndicator(realEmp);

          const salaryNet = monthlyHours * (realEmp.hourlyRateNet || 0);
          const salaryGross = monthlyHours * (realEmp.hourlyRateGross || 0);

          const isActive = isMobile ? index === mobileIndex : index === mobileIndex;
          const isExpanded = expandedIds.has(emp.id);

          return (
            <article
              key={emp.id}
              className={
                "cb-card cb-employee-card" +
                (isActive ? " cb-employee-card--active" : "") +
                (isExpanded ? " cb-employee-card--expanded" : "")
              }
              data-active={isActive ? "true" : "false"}
              data-index={index}
              role={isMobile ? "button" : undefined}
              tabIndex={isMobile ? 0 : undefined}
              aria-current={isActive ? "true" : undefined}
              style={
                isMobile
                  ? {
                      position: "relative",
                      zIndex: isActive ? 10 : 1,
                      transform: isActive
                        ? "translateY(-10px) scale(1.02)"
                        : "scale(0.965)",
                      opacity: isActive ? 1 : 0.82,
                      transition:
                        "transform 220ms ease, opacity 220ms ease, box-shadow 220ms ease",
                    }
                  : undefined
              }
              onClick={() => {
                if (!isMobile) return;
                if (!hasLoop) {
                  shouldCenterOnIndexRef.current = true;
                  setMobileIndex(index);
                  return;
                }

                // en mode clone: ignorer le clic sur les clones (0 et last)
                if (index === 0) {
                  shouldCenterOnIndexRef.current = true;
                  setMobileIndex(employees.length);
                  return;
                }
                if (index === employees.length + 1) {
                  shouldCenterOnIndexRef.current = true;
                  setMobileIndex(1);
                  return;
                }

                shouldCenterOnIndexRef.current = true;
                setMobileIndex(index);
              }}
              onKeyDown={(e) => {
                if (!isMobile) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  shouldCenterOnIndexRef.current = true;
                  setMobileIndex(index);
                }
              }}
            >
              {/* En-tête carte */}
              <header className="cb-employee-card__header">
                <div>
                  <div className="cb-employee-card__name">
                    {emp.firstName}
                  </div>
                  <div className="cb-employee-card__role">{realEmp.role}</div>
                </div>
                <button
                  type="button"
                  className="cb-button cb-button--ghost cb-employee-card__edit-btn"
                  onClick={(e) => {
    e.stopPropagation();
    openEditModal(emp);
  }}
                >
                  Modifier
                </button>
              </header>

              <div className="cb-employee-card__body">
                {/* Bloc contrat / heures (résumé) */}
                <section className="cb-employee-card__section">
                  <div className="cb-employee-card__section-header">
                    Contrat & heures
                  </div>
                  <div className="cb-employee-card__row cb-employee-card__row--indicator">
                    <span className="cb-employee-card__label">{label}</span>
                    <span className={pillClass}>{pillText}</span>
                  </div>
                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">
                      Taux brut / net
                    </span>
                    <span className="cb-employee-card__value">
                      {realEmp.hourlyRateGross > 0
                        ? `${realEmp.hourlyRateGross.toFixed(2)}€`
                        : "—"}{" "}
                      ·{" "}
                      {realEmp.hourlyRateNet > 0
                        ? `${realEmp.hourlyRateNet.toFixed(2)}€`
                        : "—"}
                    </span>
                  </div>
                </section>

                {/* Bloc contact (visible) */}
                <section className="cb-employee-card__section">
                  <div className="cb-employee-card__section-header">
                    Coordonnées
                  </div>
                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">
                      <span className="cb-employee-card__icon">📞</span>
                      Téléphone
                    </span>
                    <span className="cb-employee-card__value">
                      {realEmp.phone || "—"}
                    </span>
                  </div>
                  <div className="cb-employee-card__row">
                    <span className="cb-employee-card__label">
                      <span className="cb-employee-card__icon">✉️</span>
                      Email
                    </span>
                    <span className="cb-employee-card__value">
                      {realEmp.email || "—"}
                    </span>
                  </div>
                </section>

                                {/* Détails étendus (animés) */}
                <div className="cb-employee-card__details">
                  <section className="cb-employee-card__section">
                    <div className="cb-employee-card__section-header">
                      Salaire estimé
                    </div>
                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        Salaire brut estimé
                      </span>
                      <span className="cb-employee-card__value">
                        {salaryGross > 0
                          ? `${salaryGross.toFixed(2)} €`
                          : "—"}
                      </span>
                    </div>
                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        Salaire net estimé
                      </span>
                      <span className="cb-employee-card__value">
                        {salaryNet > 0 ? `${salaryNet.toFixed(2)} €` : "—"}
                      </span>
                    </div>
                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        Adresse
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.address || "—"}
                      </span>
                    </div>
                  </section>

                  <section className="cb-employee-card__section">
                    <div className="cb-employee-card__section-header">
                      Infos administratives
                    </div>

                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        <span className="cb-employee-card__icon">🧑‍💼</span>
                        N° Sécurité sociale
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.socialSecurityNumber || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        <span className="cb-employee-card__icon">🏦</span>
                        Banque
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.bankName || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        <span className="cb-employee-card__icon">🧾</span>
                        RIB / IBAN
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.rib || realEmp.iban || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        <span className="cb-employee-card__icon">📄</span>
                        Type de contrat
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.contractType || "—"}
                      </span>
                    </div>

                    <div className="cb-employee-card__row">
                      <span className="cb-employee-card__label">
                        <span className="cb-employee-card__icon">📅</span>
                        Date d&apos;embauche
                      </span>
                      <span className="cb-employee-card__value">
                        {realEmp.hireDate || "—"}
                      </span>
                    </div>
                  </section>
                </div>
              </div>

              <footer className="cb-employee-card__footer">
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={(e) => {
    e.stopPropagation();
    toggleExpanded(emp.id);
  }}
                >
                  {isExpanded ? "Voir moins" : "Voir plus"}
                </button>
                <button
                  type="button"
                  className="cb-employee-card__delete"
                  onClick={(e) => {
    e.stopPropagation();
    handleDelete(emp.id);
  }}
                >
                  Supprimer
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      {/* MODAL AJOUT / ÉDITION EMPLOYÉ */}
      {isModalOpen && (
        <div className="cb-employee-modal">
          <div
            className="cb-employee-modal__backdrop"
            onClick={closeModal}
          />
          <div className="cb-employee-modal__content">
            <h3 className="cb-employee-modal__title">
              {form.id ? "Modifier un employé" : "Ajouter un employé"}
            </h3>
            <p className="cb-employee-modal__subtitle">
              Renseigne les informations essentielles maintenant, tu pourras
              compléter les détails administratifs plus tard.
            </p>

            <form
              className="cb-employee-modal__form"
              onSubmit={handleSubmit}
            >
              <div className="cb-employee-modal__grid">
                {/* Identité */}
                <div className="cb-employee-modal__field">
                  <label>Prénom</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) =>
                      handleFormChange("firstName", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="cb-employee-modal__field">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) =>
                      handleFormChange("lastName", e.target.value)
                    }
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Poste</label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      handleFormChange("role", e.target.value as Role)
                    }
                  >
                    <option value="Patron">Patron</option>
                    <option value="Responsable">Responsable</option>
                    <option value="Barman">Barman</option>
                    <option value="Cuisine">Cuisine</option>
                    <option value="Serveur">Serveur</option>
                  </select>
                </div>

                {/* Coordonnées */}
                <div className="cb-employee-modal__field">
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      handleFormChange("phone", e.target.value)
                    }
                    placeholder="06..."
                  />
                </div>

                <div className="cb-employee-modal__field cb-employee-modal__field--full">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      handleFormChange("email", e.target.value)
                    }
                    placeholder="prenom@exemple.fr"
                  />
                </div>

                <div className="cb-employee-modal__field cb-employee-modal__field--full">
                  <label>Adresse</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      handleFormChange("address", e.target.value)
                    }
                    placeholder="Adresse complète"
                  />
                </div>

                {/* Contrat */}
                <div className="cb-employee-modal__field">
                  <label>Heures contrat (mois)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyContractHours}
                    onChange={(e) =>
                      handleFormChange(
                        "monthlyContractHours",
                        e.target.value
                      )
                    }
                    placeholder="151.67"
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Taux horaire net (€)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.hourlyRateNet}
                    onChange={(e) =>
                      handleFormChange("hourlyRateNet", e.target.value)
                    }
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Taux horaire brut (€)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.hourlyRateGross}
                    onChange={(e) =>
                      handleFormChange("hourlyRateGross", e.target.value)
                    }
                  />
                </div>

                {/* Admin / paie */}
                <div className="cb-employee-modal__field cb-employee-modal__field--full">
                  <label>N° Sécurité sociale</label>
                  <input
                    type="text"
                    value={form.socialSecurityNumber}
                    onChange={(e) =>
                      handleFormChange(
                        "socialSecurityNumber",
                        e.target.value
                      )
                    }
                    placeholder="15 chiffres"
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Banque</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) =>
                      handleFormChange("bankName", e.target.value)
                    }
                    placeholder="Nom de la banque"
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>RIB</label>
                  <input
                    type="text"
                    value={form.rib}
                    onChange={(e) =>
                      handleFormChange("rib", e.target.value)
                    }
                  />
                </div>

                <div className="cb-employee-modal__field cb-employee-modal__field--full">
                  <label>IBAN</label>
                  <input
                    type="text"
                    value={form.iban}
                    onChange={(e) =>
                      handleFormChange("iban", e.target.value)
                    }
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Type de contrat</label>
                  <input
                    type="text"
                    value={form.contractType}
                    onChange={(e) =>
                      handleFormChange("contractType", e.target.value)
                    }
                    placeholder="CDI, CDD, Extra..."
                  />
                </div>

                <div className="cb-employee-modal__field">
                  <label>Date d&apos;embauche</label>
                  <input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) =>
                      handleFormChange("hireDate", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="cb-employee-modal__footer">
                <button
                  type="button"
                  className="cb-button cb-button--ghost"
                  onClick={closeModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="cb-button cb-button--secondary"
                >
                  {form.id ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
