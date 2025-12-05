'use client';

import React, { useState } from 'react';

const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

// Données fictives pour l’instant – on branchera plus tard
const caJour = {
  total: 13700,
  salle: 9850,
  bar: 3850,
};

const depensesJour = {
  fixes: 420,
  variables: 260,
};

const masseSalarialeJour = {
  heures: 82,
  cout: 1480,
};

const reservationsJour = [
  { heure: '12:15', nom: 'Durand', personnes: 2, statut: 'Confirmée' },
  { heure: '12:30', nom: 'Martin', personnes: 4, statut: 'En attente' },
  { heure: '13:00', nom: 'Dupuis', personnes: 3, statut: 'Confirmée' },
  { heure: '20:00', nom: 'Entreprise X', personnes: 12, statut: 'Confirmée' },
];

const serviceDuJour = [
  { poste: 'Salle / Bar', nb: 7 },
  { poste: 'Cuisine', nb: 5 },
];

export default function DashboardPage() {
  const [selectedDay] = useState<'Aujourdhui'>('Aujourdhui');
  const margeEstimee =
    caJour.total - depensesJour.fixes - depensesJour.variables - masseSalarialeJour.cout;

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
    maxWidth: 1100,
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
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#6B7280',
  };

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
              Tableau de bord
            </h1>
            <div
              style={{
                fontSize: 12,
                color: '#6B7485',
              }}
            >
              Vue rapide de la journée · chiffres fictifs pour l&apos;instant
            </div>
          </div>

          {/* Menu déroulant de navigation */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#6B7280',
              }}
            >
              <span>Jour :</span>
              <button
                type="button"
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  fontSize: 11,
                  cursor: 'default',
                }}
              >
                Aujourd&apos;hui
              </button>
            </div>
          </div>
        </header>

        {/* LIGNE 1 : CHIFFRES CLÉS */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {/* CA total */}
          <div style={blocStyle}>
            <div style={labelSmall}>CA total du jour</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 4,
                color: '#0F172A',
              }}
            >
              {caJour.total.toLocaleString('fr-FR')} €
            </div>
            <div
              style={{
                fontSize: 11,
                marginTop: 4,
                color: '#16A34A',
              }}
            >
              +4,2 % vs. hier (fictif)
            </div>
          </div>

          {/* CA salle / bar */}
          <div style={blocStyle}>
            <div style={labelSmall}>CA par origine</div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Salle</div>
                <div style={{ fontWeight: 600 }}>
                  {caJour.salle.toLocaleString('fr-FR')} €
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Bar</div>
                <div style={{ fontWeight: 600 }}>
                  {caJour.bar.toLocaleString('fr-FR')} €
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                height: 6,
                borderRadius: 999,
                background: '#E5E7EB',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(caJour.salle / caJour.total) * 100}%`,
                  background: '#0EA5E9',
                }}
              />
            </div>
          </div>

          {/* Masse salariale */}
          <div style={blocStyle}>
            <div style={labelSmall}>Masse salariale (jour)</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 4,
                color: '#0F172A',
              }}
            >
              {masseSalarialeJour.cout.toLocaleString('fr-FR')} €
            </div>
            <div
              style={{
                fontSize: 11,
                marginTop: 4,
                color: '#6B7280',
              }}
            >
              {masseSalarialeJour.heures.toFixed(1)} h au total
            </div>
          </div>

          {/* Marge estimée */}
          <div style={blocStyle}>
            <div style={labelSmall}>Marge estimée rapide</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 4,
                color: margeEstimee >= 0 ? '#15803D' : '#B91C1C',
              }}
            >
              {margeEstimee.toLocaleString('fr-FR')} €
            </div>
            <div
              style={{
                fontSize: 11,
                marginTop: 4,
                color: '#6B7280',
              }}
            >
              CA – masse salariale – dépenses
            </div>
          </div>
        </section>

        {/* LIGNE 2 : DÉPENSES / SERVICE / RÉSERVATIONS */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {/* DÉPENSES */}
          <div style={blocStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div>
                <div style={labelSmall}>Dépenses du jour</div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  Charges fixes + extras de service
                </div>
              </div>
              <a
                href="/depenses"
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#111827',
                  textDecoration: 'none',
                }}
              >
                Gérer
              </a>
            </div>

            <div style={{ fontSize: 12, marginBottom: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 2,
                }}
              >
                <span style={{ color: '#6B7280' }}>Fixes</span>
                <span style={{ fontWeight: 600 }}>
                  {depensesJour.fixes.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#6B7280' }}>
                  Variables (croissants, baguettes, extras…)
                </span>
                <span style={{ fontWeight: 600 }}>
                  {depensesJour.variables.toLocaleString('fr-FR')} €
                </span>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: 4,
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: '#6B7280' }}>Total dépenses</span>
              <span style={{ fontWeight: 600 }}>
                {(depensesJour.fixes + depensesJour.variables).toLocaleString(
                  'fr-FR',
                )}{' '}
                €
              </span>
            </div>
          </div>

          {/* SERVICE DU JOUR */}
          <div style={blocStyle}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div>
                <div style={labelSmall}>Service du jour</div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  Répartition rapide de l&apos;équipe
                </div>
              </div>
              <a
                href="/planning"
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#111827',
                  textDecoration: 'none',
                }}
              >
                Voir planning
              </a>
            </div>

            <div style={{ fontSize: 12 }}>
              {serviceDuJour.map((item) => (
                <div
                  key={item.poste}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: '#4B5563' }}>{item.poste}</span>
                  <span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#0F172A',
                      }}
                    >
                      {item.nb}
                    </span>{' '}
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6B7280',
                      }}
                    >
                      pers.
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: '#9CA3AF',
              }}
            >
              Plus tard : liste détaillée des personnes planifiées, coût par
              poste…
            </div>
          </div>

          {/* RÉSERVATIONS DU JOUR */}
          <div
            style={{
              ...blocStyle,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={labelSmall}>Réservations du jour</div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#6B7280',
                    marginTop: 2,
                  }}
                >
                  {reservationsJour.length} réservations
                </div>
              </div>
              <a
                href="/reservations"
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #D1D5DB',
                  background: '#FFFFFF',
                  color: '#111827',
                  textDecoration: 'none',
                }}
              >
                Détails
              </a>
            </div>

            <div
              style={{
                padding: '8px 12px',
                fontSize: 12,
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              {reservationsJour.length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#9CA3AF',
                    textAlign: 'center',
                    padding: '10px 0',
                  }}
                >
                  Aucune réservation pour le moment.
                </div>
              )}
              {reservationsJour.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 0',
                    borderBottom:
                      i === reservationsJour.length - 1
                        ? 'none'
                        : '1px solid #F3F4F6',
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
                        color: '#0F172A',
                      }}
                    >
                      {r.heure} · {r.nom}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#6B7280',
                      }}
                    >
                      {r.personnes} couverts
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 500,
                        backgroundColor:
                          r.statut === 'Confirmée' ? '#DCFCE7' : '#FEF9C3',
                        color:
                          r.statut === 'Confirmée' ? '#166534' : '#854D0E',
                      }}
                    >
                      {r.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LIGNE 3 : LIENS RAPIDES */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: 10,
          }}
        >
          <a href="/presences" style={{ textDecoration: 'none' }}>
            <div style={blocStyle}>
              <div style={labelSmall}>Feuille de présence</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                Suivi journalier & export PDF
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: '#6B7280',
                }}
              >
                Cocher les présents, saisir le CA par personne, les dépenses
                du jour et sortir une feuille nette pour la compta.
              </div>
            </div>
          </a>

          <a href="/employes" style={{ textDecoration: 'none' }}>
            <div style={blocStyle}>
              <div style={labelSmall}>Équipe & taux horaires</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                Gestion des employés
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: '#6B7280',
                }}
              >
                Ajouter / modifier / supprimer les employés, leurs zones et
                leurs taux horaires pour alimenter le planning et la masse
                salariale.
              </div>
            </div>
          </a>

          <a href="/demandes" style={{ textDecoration: 'none' }}>
            <div style={blocStyle}>
              <div style={labelSmall}>Espace collaborateur</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                Retards, congés & absences
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: '#6B7280',
                }}
              >
                Les employés peuvent prévenir d&apos;un retard ou demander un
                congé, et les responsables voient tout remonter dans le
                planning.
              </div>
            </div>
          </a>
        </section>
      </section>
    </div>
  );
}