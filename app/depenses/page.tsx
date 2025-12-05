'use client';

import React, { useEffect, useMemo, useState } from 'react';

const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

type Expense = {
  id: string;
  date: string; // format YYYY-MM-DD
  label: string;
  amount: number;
  category: string;
  payment: string;
};

const STORAGE_KEY = 'cavalier_expenses';

function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Erreur loadExpenses', e);
    return [];
  }
}

function saveExpenses(list: Expense[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Erreur saveExpenses', e);
  }
}

export default function DepensesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('Extra service');
  const [payment, setPayment] = useState('Caisse');

  const [feedback, setFeedback] = useState<string | null>(null);

  // INIT
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(todayStr);

    const loaded = loadExpenses();
    setAllExpenses(loaded);
    setInitialized(true);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const expensesOfDay = useMemo(
    () => allExpenses.filter((e) => e.date === selectedDate),
    [allExpenses, selectedDate],
  );

  const totalOfDay = useMemo(
    () => expensesOfDay.reduce((sum, e) => sum + e.amount, 0),
    [expensesOfDay],
  );

  const lastExpenses = useMemo(
    () =>
      [...allExpenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 20),
    [allExpenses],
  );

  const rootStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0B1524',
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 12px',
    boxSizing: 'border-box',
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 900,
    background: '#F4F6F8',
    borderRadius: 22,
    boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
    padding: '18px 18px 24px',
    boxSizing: 'border-box',
  };

  const blocStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '10px 12px',
    boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
    boxSizing: 'border-box',
  };

  const labelSmall: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: '#6B7280',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    padding: '6px 8px',
    fontSize: 13,
    boxSizing: 'border-box',
    background: '#ffffff',
  };

  const labelField: React.CSSProperties = {
    fontSize: 11,
    color: '#4b5563',
    marginBottom: 2,
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!selectedDate) {
      setFeedback('Merci de choisir une date.');
      return;
    }
    if (!label.trim()) {
      setFeedback('Merci de décrire la dépense.');
      return;
    }
    const value = Number(amount.replace(',', '.'));
    if (!value || value <= 0) {
      setFeedback('Montant invalide.');
      return;
    }

    const newExp: Expense = {
      id: `EXP-${Date.now()}`,
      date: selectedDate,
      label: label.trim(),
      amount: value,
      category,
      payment,
    };

    const updated = [...allExpenses, newExp];
    setAllExpenses(updated);
    saveExpenses(updated);

    setLabel('');
    setAmount('');
    setFeedback('Dépense ajoutée ✅');
  };

  const handleDelete = (exp: Expense) => {
    const ok = window.confirm(
      `Supprimer la dépense "${exp.label}" de ${exp.amount.toLocaleString('fr-FR')} € ?`,
    );
    if (!ok) return;
    const updated = allExpenses.filter((e) => e.id !== exp.id);
    setAllExpenses(updated);
    saveExpenses(updated);
  };

  if (!initialized) {
    return (
      <div style={{ ...rootStyle, color: 'white' }}>
        <div style={{ opacity: 0.7 }}>Chargement des dépenses…</div>
      </div>
    );
  }

  // Pour afficher la date en français
  const niceDate =
    selectedDate &&
    (() => {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
    })();

  return (
    <div style={rootStyle}>
      <section style={cardStyle}>
        {/* HEADER */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 20,
                margin: 0,
                marginBottom: 3,
                color: '#0F172A',
              }}
            >
              Dépenses journalières
            </h1>
            <div
              style={{
                fontSize: 12,
                color: '#6B7485',
              }}
            >
              Suivi des petites dépenses de service (extras, courses, etc.)
            </div>
          </div>

          {/* Menu déroulant navigation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
            <select
              defaultValue="/depenses"
              onChange={(e) => {
                const value = e.target.value;
                if (value) window.location.href = value;
              }}
              style={{
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#111827',
                minWidth: 150,
              }}
            >
              <option value="" disabled>
                Aller à…
              </option>
              {navPages.map((p) => (
                <option key={p.href} value={p.href}>
                  {p.label}
                </option>
              ))}
            </select>

            <div
              style={{
                fontSize: 11,
                color: '#6B7280',
              }}
            >
              Date sélectionnée :{' '}
              <span style={{ fontWeight: 600 }}>
                {niceDate || '—'}
              </span>
            </div>
          </div>
        </header>

        {/* LIGNE 1 : FORMULAIRE + TOTAL JOUR */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {/* Formulaire */}
          <div style={blocStyle}>
            <div
              style={{
                ...labelSmall,
                marginBottom: 6,
              }}
            >
              Ajouter une dépense
            </div>

            <form onSubmit={handleAddExpense}>
              <div style={{ marginBottom: 8 }}>
                <div style={labelField}>Date</div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={labelField}>Description</div>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex : Croissants, baguettes, jus de tomate…"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 110 }}>
                  <div style={labelField}>Montant (€)</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={labelField}>Catégorie</div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Extra service">Extra de service</option>
                    <option value="Petit déjeuner">Petit déjeuner</option>
                    <option value="Boissons">Boissons</option>
                    <option value="Courses urgence">Courses d&apos;urgence</option>
                    <option value="Fournisseur">Fournisseur</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 8,
                }}
              >
                <div style={labelField}>Réglé avec</div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                    fontSize: 12,
                  }}
                >
                  {['Caisse', 'Espèces perso', 'Carte resto', 'Autre'].map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPayment(p)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          border:
                            payment === p
                              ? '1px solid #0f766e'
                              : '1px solid #d1d5db',
                          background:
                            payment === p ? '#ECFDF5' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {feedback && (
                <div
                  style={{
                    fontSize: 11,
                    marginBottom: 6,
                    color: feedback.includes('✅')
                      ? '#16a34a'
                      : '#b91c1c',
                  }}
                >
                  {feedback}
                </div>
              )}

              <button
                type="submit"
                style={{
                  marginTop: 4,
                  borderRadius: 999,
                  border: 'none',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#0f766e',
                  color: '#ffffff',
                  width: '100%',
                }}
              >
                Ajouter la dépense du jour
              </button>
            </form>
          </div>

          {/* Total du jour */}
          <div style={blocStyle}>
            <div style={labelSmall}>Total du jour</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 22,
                fontWeight: 700,
                color: '#0F172A',
              }}
            >
              {totalOfDay.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
              })}{' '}
              €
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#6B7280',
              }}
            >
              {expensesOfDay.length === 0 ? (
                <>Aucune dépense enregistrée pour cette date.</>
              ) : (
                <>
                  {expensesOfDay.length} dépense
                  {expensesOfDay.length > 1 ? 's' : ''} enregistrée
                  {expensesOfDay.length > 1 ? 's' : ''}.
                </>
              )}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: '#6B7280',
                borderTop: '1px solid #E5E7EB',
                paddingTop: 6,
              }}
            >
              Ce total peut être utilisé dans la feuille de présence et le
              dashboard pour suivre les dépenses variables du service.
            </div>
          </div>
        </section>

        {/* LIGNE 2 : LISTE DU JOUR + HISTORIQUE */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 10,
          }}
        >
          {/* LISTE DU JOUR */}
          <div style={blocStyle}>
            <div style={labelSmall}>Détail du jour</div>
            <div
              style={{
                fontSize: 12,
                color: '#6B7280',
                marginTop: 2,
                marginBottom: 6,
              }}
            >
              {niceDate || 'Choisis une date pour voir le détail.'}
            </div>

            {expensesOfDay.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                }}
              >
                Aucune dépense pour ce jour.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  fontSize: 12,
                }}
              >
                {expensesOfDay.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      padding: '6px 0',
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 500,
                          color: '#111827',
                        }}
                      >
                        {e.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#6B7280',
                        }}
                      >
                        {e.category} · {e.payment}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#0F172A',
                        }}
                      >
                        {e.amount.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        €
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(e)}
                        style={{
                          marginTop: 2,
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 999,
                          border: '1px solid #fecaca',
                          background: '#fee2e2',
                          color: '#b91c1c',
                          cursor: 'pointer',
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORIQUE RÉCENT */}
          <div style={blocStyle}>
            <div style={labelSmall}>Historique récent</div>
            <div
              style={{
                fontSize: 12,
                color: '#6B7280',
                marginTop: 2,
                marginBottom: 6,
              }}
            >
              Dernières dépenses ajoutées (20 dernières lignes)
            </div>

            {lastExpenses.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#9CA3AF',
                }}
              >
                Aucune dépense enregistrée pour l&apos;instant.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  fontSize: 12,
                }}
              >
                {lastExpenses.map((e) => {
                  const d = new Date(e.date);
                  const dateLabel = d.toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  });
                  return (
                    <div
                      key={e.id}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#6B7280',
                          }}
                        >
                          {dateLabel}
                        </div>
                        <div
                          style={{
                            fontWeight: 500,
                            color: '#111827',
                          }}
                        >
                          {e.label}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#6B7280',
                          }}
                        >
                          {e.category} · {e.payment}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: '#0F172A',
                        }}
                      >
                        {e.amount.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        €
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}