"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// =====================================================
// 🔹 TYPES + CONSTANTES (Dépenses)
// =====================================================

type ExpenseCategory =
  | "Extras service"
  | "Fournisseurs"
  | "Courses"
  | "Boissons"
  | "Entretien"
  | "Gaz"
  | "Électricité"
  | "Eau"
  | "Loyer"
  | "Assurance"
  | "Divers";

type ExpenseItem = {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string;
  amount: number;
  category: ExpenseCategory;
  vendor?: string;
  note?: string;
  // Justificatif (photo)
  receiptName?: string;
  receiptDataUrl?: string; // base64 data url
  createdAt: number;
};

const STORAGE_EXPENSES_KEY = "CB_EXPENSES_V1";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Extras service",
  "Fournisseurs",
  "Courses",
  "Boissons",
  "Entretien",
  "Gaz",
  "Électricité",
  "Eau",
  "Loyer",
  "Assurance",
  "Divers",
];

// =====================================================
// 🔹 HELPERS
// =====================================================

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function makeId() {
  // crypto.randomUUID is available in modern browsers; fallback for older ones
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${String(Math.floor(Math.random() * 1e9))}`;
  }
}

// =====================================================
// 🔹 PAGE DÉPENSES
//    State -> chargement LS -> filtrage -> rendu
// =====================================================

export default function DepensesPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [label, setLabel] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<ExpenseCategory>("Divers");
  const [vendor, setVendor] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [receiptName, setReceiptName] = useState<string>("");
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  // Charger depuis localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as
        | ExpenseItem[]
        | { [date: string]: ExpenseItem[] };

      if (Array.isArray(parsed)) {
        setExpenses(
          parsed.map((e: any) => ({
            id: String(e.id ?? makeId()),
            date: String(e.date ?? todayISO()),
            label: String(e.label ?? ""),
            amount: Number(e.amount) || 0,
            category: (e.category as ExpenseCategory) ?? "Divers",
            vendor: e.vendor ? String(e.vendor) : undefined,
            note: e.note ? String(e.note) : undefined,
            receiptName: e.receiptName ? String(e.receiptName) : undefined,
            receiptDataUrl: e.receiptDataUrl ? String(e.receiptDataUrl) : undefined,
            createdAt: Number(e.createdAt) || Date.now(),
          }))
        );
      } else if (parsed && typeof parsed === "object") {
        const flat: ExpenseItem[] = [];
        Object.keys(parsed).forEach((d) => {
          const arr = (parsed as any)[d];
          if (Array.isArray(arr)) {
            arr.forEach((item: any) => {
              flat.push({
                id: String(item.id ?? makeId()),
                date: String(item.date ?? d),
                label: String(item.label ?? ""),
                amount: Number(item.amount) || 0,
                category: (item.category as ExpenseCategory) ?? "Divers",
                vendor: item.vendor ? String(item.vendor) : undefined,
                note: item.note ? String(item.note) : undefined,
                receiptName: item.receiptName ? String(item.receiptName) : undefined,
                receiptDataUrl: item.receiptDataUrl ? String(item.receiptDataUrl) : undefined,
                createdAt: Number(item.createdAt) || Date.now(),
              });
            });
          }
        });
        setExpenses(flat);
      }
    } catch (err) {
      console.error("Erreur chargement dépenses", err);
    }
  }, []);

  // Sauvegarde
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const expensesForDay = useMemo(
    () => expenses.filter((e) => e.date === date),
    [expenses, date]
  );

  const totalDay = expensesForDay.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  const handleReceiptChange = (file: File | null) => {
    if (!file) {
      setReceiptName("");
      setReceiptDataUrl("");
      return;
    }

    setReceiptName(file.name);

    // Small UX: suggest label from filename if empty
    if (!label.trim()) {
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      if (base) setLabel(base);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setReceiptDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    const rawAmount = amount.replace(",", ".");
    const num = Number(rawAmount);
    if (Number.isNaN(num) || num <= 0) return;

    const newItem: ExpenseItem = {
      id: makeId(),
      date,
      label: trimmedLabel,
      amount: num,
      category,
      vendor: vendor.trim() ? vendor.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      receiptName: receiptName || undefined,
      receiptDataUrl: receiptDataUrl || undefined,
      createdAt: Date.now(),
    };

    setExpenses((prev) => [...prev, newItem]);
    setLabel("");
    setAmount("");
    setVendor("");
    setNote("");
    setCategory("Divers");
    setReceiptName("");
    setReceiptDataUrl("");
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const allDatesSorted = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.date));
    return Array.from(set).sort();
  }, [expenses]);

  return (
    <div>
      {/* HEADER */}
      <div className="cb-planning__header">
        <div>
          <h2 className="cb-dashboard__title">Dépenses journalières</h2>
          <p className="cb-dashboard__subtitle">
            Suivi des extras service et frais du jour
          </p>
        </div>

        <div className="cb-presence__header-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="cb-input-date"
          />
        </div>
      </div>

      {/* FORMULAIRE AJOUT */}
      <section className="cb-card cb-expenses-form">
        <h3 className="cb-section-title">Ajouter une dépense</h3>
        <div className="cb-expenses-form__row">
          <div className="cb-expenses-form__field">
            <label>Libellé</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Croissants, baguettes, jus de tomates..."
            />
          </div>

          <div className="cb-expenses-form__field cb-expenses-form__field--small">
            <label>Montant (€)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <button
            type="button"
            className="cb-button cb-button--secondary cb-expenses-form__add"
            onClick={handleAdd}
          >
            Ajouter
          </button>
        </div>

        <div className="cb-expenses-form__row cb-expenses-form__row--mt">
          <div className="cb-expenses-form__field">
            <label>Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="cb-expenses-form__field">
            <label>Fournisseur (optionnel)</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Metro, Promocash, Uber, EDF..."
            />
          </div>
        </div>

        <div className="cb-expenses-form__row cb-expenses-form__row--mt">
          <div className="cb-expenses-form__field cb-expenses-form__field--full">
            <label>Note (optionnel)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : facture du midi, avance, correction..."
            />
          </div>
        </div>

        <div className="cb-expenses-form__row cb-expenses-form__row--mt cb-expenses-form__row--end">
          <div className="cb-expenses-form__field cb-expenses-form__field--full">
            <label>Facture / justificatif (photo)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleReceiptChange(e.target.files?.[0] ?? null)}
            />
            <p className="cb-expenses-form__hint cb-expenses-form__hint--mt-sm">
              Astuce : tu peux prendre une photo rapide. Analyse automatique (montant / fournisseur) viendra ensuite.
            </p>
          </div>
        </div>

        {receiptDataUrl ? (
          <div className="cb-expenses-receipt-wrap">
            <div className="cb-expenses-receipt">
              <div className="cb-expenses-receipt__meta">
                <strong>Justificatif</strong>
                <span>{receiptName || "photo"}</span>
                <button
                  type="button"
                  className="cb-chip cb-chip--ghost"
                  onClick={() => handleReceiptChange(null)}
                >
                  Retirer
                </button>
              </div>
              <Image
                src={receiptDataUrl}
                alt="Justificatif"
                className="cb-expenses-receipt__img"
                width={500}
                height={500}
                unoptimized
              />
            </div>
          </div>
        ) : null}

        <p className="cb-expenses-form__hint cb-expenses-form__hint--mt">
          Ces dépenses sont utilisées dans la feuille de présence et dans la dashboard mensuelle.
        </p>
      </section>

      {/* LISTE DU JOUR */}
      <section className="cb-card cb-expenses-list">
        <div className="cb-expenses-list__header">
          <h3 className="cb-section-title">Dépenses du jour</h3>
          <div className="cb-expenses-list__total">
            Total :{" "}
            <strong>
              {totalDay.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </strong>
          </div>
        </div>

        {expensesForDay.length === 0 ? (
          <p className="cb-expenses-empty">
            Aucune dépense enregistrée pour cette journée.
          </p>
        ) : (
          <div className="cb-expenses-table-wrapper">
            <table className="cb-expenses-table">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Catégorie</th>
                  <th>Montant</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expensesForDay.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>{exp.label}</div>
                      <div className="cb-expenses-table__meta">
                        {exp.vendor ? exp.vendor : ""}{exp.vendor && exp.note ? " · " : ""}{exp.note ? exp.note : ""}
                      </div>
                      {exp.receiptDataUrl ? (
                        <button
                          type="button"
                          className="cb-chip cb-chip--ghost cb-expenses-chip--mt"
                          onClick={() => window.open(exp.receiptDataUrl, "_blank")}
                        >
                          Voir facture
                        </button>
                      ) : null}
                    </td>
                    <td>{exp.category}</td>
                    <td>
                      {exp.amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td className="cb-expenses-table__actions">
                      <button
                        type="button"
                        className="cb-chip cb-chip--danger"
                        onClick={() => handleDelete(exp.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PETIT HISTORIQUE PAR DATE (OPTIONNEL MAIS VENDABLE) */}
      {allDatesSorted.length > 1 && (
        <section className="cb-card cb-expenses-history">
          <h3 className="cb-section-title">Historique rapide</h3>
          <div className="cb-expenses-history__chips">
            {allDatesSorted.map((d) => {
              const total = expenses
                .filter((e) => e.date === d)
                .reduce((sum, e) => sum + (e.amount || 0), 0);
              return (
                <button
                  key={d}
                  type="button"
                  className={`cb-chip ${
                    d === date ? "cb-chip--active" : "cb-chip--ghost"
                  }`}
                  onClick={() => setDate(d)}
                >
                  <span>{d}</span>
                  <span>
                    {total.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
