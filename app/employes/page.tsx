'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Employee, Zone, loadEmployees } from '@/app/_data/employees';

// Si tu n'as pas encore saveEmployees dans _data/employees.ts,
// ajoute la fonction indiquée plus bas (section 2).
import { saveEmployees } from '@/app/_data/employees';
const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

const rootStyle: React.CSSProperties = {
  minHeight: '100vh',
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

const sectionCard: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 16,
  padding: '10px 10px 12px',
  boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
  boxSizing: 'border-box',
};

type FormMode = 'idle' | 'create' | 'edit';

export default function EmployesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mode, setMode] = useState<FormMode>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);

  // champs du formulaire
  const [nom, setNom] = useState('');
  const [role, setRole] = useState('');
  const [zone, setZone] = useState<Zone>('Salle/Bar');
  const [tauxHoraire, setTauxHoraire] = useState<string>('14');

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);

    const emps = loadEmployees();
    setEmployees(emps);
    setInitialized(true);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const employeesSalleBar = useMemo(
    () => employees.filter((e) => e.zone === 'Salle/Bar'),
    [employees],
  );
  const employeesCuisine = useMemo(
    () => employees.filter((e) => e.zone === 'Cuisine'),
    [employees],
  );

  const resetForm = () => {
    setNom('');
    setRole('');
    setZone('Salle/Bar');
    setTauxHoraire('14');
    setEditingId(null);
    setMode('idle');
  };

  const startCreate = () => {
    setFeedback(null);
    setNom('');
    setRole('');
    setZone('Salle/Bar');
    setTauxHoraire('14');
    setEditingId(null);
    setMode('create');
  };

  const startEdit = (emp: Employee) => {
    setFeedback(null);
    setNom(emp.nom);
    setRole(emp.role);
    setZone(emp.zone);
    setTauxHoraire(emp.tauxHoraire.toString());
    setEditingId(emp.id);
    setMode('edit');
  };

  const handleDelete = (emp: Employee) => {
    const ok = window.confirm(
      `Supprimer ${emp.nom} ? Il/elle disparaîtra du planning.`
    );
    if (!ok) return;

    const updated = employees.filter((e) => e.id !== emp.id);
    setEmployees(updated);
    saveEmployees(updated);
    if (editingId === emp.id) resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!nom.trim() || !role.trim()) {
      setFeedback('Merci de remplir nom et poste.');
      return;
    }

    const tauxNum = Number(tauxHoraire.replace(',', '.'));
    if (!tauxNum || tauxNum <= 0) {
      setFeedback('Taux horaire invalide.');
      return;
    }

    if (mode === 'create') {
      const newEmp: Employee = {
        id: `EMP-${Date.now()}`,
        nom: nom.trim(),
        role: role.trim(),
        zone,
        tauxHoraire: tauxNum,
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      saveEmployees(updated);
      setFeedback('Employé ajouté ✅');
      resetForm();
    } else if (mode === 'edit' && editingId) {
      const updated = employees.map((e) =>
        e.id === editingId
          ? {
              ...e,
              nom: nom.trim(),
              role: role.trim(),
              zone,
              tauxHoraire: tauxNum,
            }
          : e,
      );
      setEmployees(updated);
      saveEmployees(updated);
      setFeedback('Employé mis à jour ✅');
      resetForm();
    }
  };

  if (!initialized) {
    return (
      <div
        style={{ ...rootStyle, background: '#0B1524', color: 'white' }}
      >
        <div style={{ opacity: 0.7 }}>Chargement des employés…</div>
      </div>
    );
  }

  return (
    <div
      style={{ ...rootStyle, background: '#0B1524' }}
    >
      <section style={cardStyle}>
        {/* HEADER */}
      <header
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  }}
>
  <div>
    <h1
      style={{
        fontSize: isMobile ? 18 : 20,
        margin: 0,
        marginBottom: 4,
      }}
    >
      Équipe du Cavalier Bleu
    </h1>
    <div
      style={{
        fontSize: 12,
        color: '#6B7485',
      }}
    >
      Gestion des employés · impacte le planning & la masse salariale
    </div>
  </div>

  {/* MENU DÉROULANT NAVIGATION */}
  <div>
    <select
      defaultValue=""
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
  </div>
</header>

        {/* BOUTONS & FORMULAIRE */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            marginBottom: 14,
          }}
        >
          {/* Formulaire d'édition / création */}
          <div
            style={{
              ...sectionCard,
              flex: 1.1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {mode === 'edit'
                  ? 'Modifier un employé'
                  : 'Ajouter un employé'}
              </div>
              <button
                type="button"
                onClick={startCreate}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#f9fafb',
                  cursor: 'pointer',
                }}
              >
                + Nouveau
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#4b5563',
                    marginBottom: 2,
                  }}
                >
                  Nom complet
                </div>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Aurélie Patron"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    padding: '6px 8px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#4b5563',
                    marginBottom: 2,
                  }}
                >
                  Poste
                </div>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Ex : Serveur, Barman, Cuisine…"
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    padding: '6px 8px',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
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
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#4b5563',
                      marginBottom: 2,
                    }}
                  >
                    Zone
                  </div>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value as Zone)}
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid #d1d5db',
                      padding: '6px 8px',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  >
                    <option value="Salle/Bar">Salle / Bar</option>
                    <option value="Cuisine">Cuisine</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: 120 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#4b5563',
                      marginBottom: 2,
                    }}
                  >
                    Taux horaire (brut)
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tauxHoraire}
                    onChange={(e) => setTauxHoraire(e.target.value)}
                    placeholder="Ex : 14"
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid #d1d5db',
                      padding: '6px 8px',
                      fontSize: 13,
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  />
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

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border: 'none',
                    padding: '7px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: '#0f766e',
                    color: '#ffffff',
                  }}
                >
                  {mode === 'edit'
                    ? 'Enregistrer les modifications'
                    : 'Ajouter à la liste'}
                </button>
                {mode !== 'idle' && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      borderRadius: 999,
                      border: '1px solid #d1d5db',
                      padding: '7px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: '#ffffff',
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Résumé employés */}
          <div
            style={{
              ...sectionCard,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Résumé rapide
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: 12,
                color: '#4b5563',
              }}
            >
              <li>
                • Total équipe :{' '}
                <strong>{employees.length}</strong> personne(s)
              </li>
              <li>
                • Salle / Bar :{' '}
                <strong>{employeesSalleBar.length}</strong>
              </li>
              <li>
                • Cuisine :{' '}
                <strong>{employeesCuisine.length}</strong>
              </li>
              <li>
                • Ces données sont utilisées par le planning et la masse
                salariale.
              </li>
            </ul>
          </div>
        </div>

        {/* LISTES PAR ZONE */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 10,
          }}
        >
          {/* Salle / Bar */}
          <div style={sectionCard}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Salle / Bar
            </div>
            {employeesSalleBar.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                }}
              >
                Aucun employé pour le moment.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Nom
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Poste
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Taux
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeesSalleBar.map((emp) => (
                    <tr key={emp.id}>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.nom}
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.role}
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        {emp.tauxHoraire.toFixed(2)} €
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(emp)}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 999,
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            cursor: 'pointer',
                            marginRight: 4,
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emp)}
                          style={{
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cuisine */}
          <div style={sectionCard}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Cuisine
            </div>
            {employeesCuisine.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                }}
              >
                Aucun employé pour le moment.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Nom
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Poste
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Taux
                    </th>
                    <th
                      style={{
                        textAlign: 'right',
                        padding: '4px 4px',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeesCuisine.map((emp) => (
                    <tr key={emp.id}>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.nom}
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {emp.role}
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        {emp.tauxHoraire.toFixed(2)} €
                      </td>
                      <td
                        style={{
                          padding: '4px 4px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(emp)}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 999,
                            border: '1px solid #d1d5db',
                            background: '#ffffff',
                            cursor: 'pointer',
                            marginRight: 4,
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emp)}
                          style={{
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}