"use client";

import { useEffect, useMemo, useState } from "react";

// =====================================================
// 🔹 TYPES + CONSTANTES (Dépenses)
// =====================================================

type ExpenseItem = {
  id: string;
  date: string; // "YYYY-MM-DD"
  label: string;
  amount: number;
};

const STORAGE_EXPENSES_KEY = "CB_EXPENSES_V1";

// =====================================================
// 🔹 HELPERS
// =====================================================

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// =====================================================
// 🔹 PAGE DÉPENSES
//    State -> chargement LS -> filtrage -> rendu
// =====================================================

export default function DepensesPage() {
  const [date, setDate] = useState<string>(todayISO());
  const [label, setLabel] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
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
        setExpenses(parsed);
      } else if (parsed && typeof parsed === "object") {
        const flat: ExpenseItem[] = [];
        Object.keys(parsed).forEach((d) => {
          const arr = (parsed as any)[d];
          if (Array.isArray(arr)) {
            arr.forEach((item: any) => {
              flat.push({
                id: item.id ?? `${d}-${item.label}`,
                date: item.date ?? d,
                label: item.label ?? "",
                amount: Number(item.amount) || 0,
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

  const handleAdd = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    const rawAmount = amount.replace(",", ".");
    const num = Number(rawAmount);
    if (Number.isNaN(num) || num <= 0) return;

    const newItem: ExpenseItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date,
      label: trimmedLabel,
      amount: num,
    };

    setExpenses((prev) => [...prev, newItem]);
    setLabel("");
    setAmount("");
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
        <p className="cb-expenses-form__hint">
          Ces dépenses seront automatiquement reprises dans la feuille de
          présence pour cette date.
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
                  <th>Montant</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expensesForDay.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.label}</td>
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
