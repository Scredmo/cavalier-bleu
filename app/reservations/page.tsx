'use client';
import React, { useEffect, useState } from 'react';

// =====================================================
// 🔹 TYPES + CONSTANTES (Réservations)
// =====================================================

const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

// -----------------------------------------------------
// Helpers d'affichage
// -----------------------------------------------------
type Service = 'Midi' | 'Soir';
type Statut = 'Confirmée' | 'En attente' | 'Annulée' | 'No-show';

function getStatutInfo(status?: Statut) {
  switch (status) {
    case 'Confirmée':
      return { label: 'Confirmée', color: '#4ade80' }; // vert
    case 'Annulée':
      return { label: 'Annulée', color: '#f87171' }; // rouge
    case 'En attente':
      return { label: 'En attente', color: '#fbbf24' }; // orange
    case 'No-show':
      return { label: 'No-show', color: '#fbbf24' }; // orange aussi
    default:
      return { label: 'À confirmer', color: '#a3a3a3' }; // gris
  }
}

type Reservation = {
  heure: string;
  nom: string;
  personnes: number;
  tel: string;
  service: Service;
  statut: Statut;
  commentaire?: string;
};

const reservationsDuJour: Reservation[] = [
  {
    heure: '12:15',
    nom: 'Durand',
    personnes: 2,
    tel: '06 12 34 56 78',
    service: 'Midi',
    statut: 'Confirmée',
    commentaire: 'Table en terrasse, anniversaire.',
  },
  {
    heure: '12:30',
    nom: 'Martin',
    personnes: 4,
    tel: '06 98 76 54 32',
    service: 'Midi',
    statut: 'Confirmée',
    commentaire: 'Demande une chaise haute.',
  },
  {
    heure: '13:00',
    nom: 'Dupuis',
    personnes: 3,
    tel: '06 11 22 33 44',
    service: 'Midi',
    statut: 'En attente',
    commentaire: 'Rappeler pour confirmer.',
  },
  {
    heure: '20:00',
    nom: 'Entreprise X',
    personnes: 12,
    tel: '01 42 00 00 00',
    service: 'Soir',
    statut: 'Confirmée',
    commentaire: 'Prévoir 2 tables collées, menu groupe.',
  },
  {
    heure: '20:30',
    nom: 'Girard',
    personnes: 2,
    tel: '06 55 66 77 88',
    service: 'Soir',
    statut: 'Confirmée',
    commentaire: 'Table calme si possible.',
  },
  {
    heure: '21:00',
    nom: 'No-show test',
    personnes: 2,
    tel: '06 00 00 00 00',
    service: 'Soir',
    statut: 'No-show',
    commentaire: 'A déjà annulé 3 fois.',
  },
];

// =====================================================
// 🔹 PAGE RÉSERVATIONS
//    State -> filtrage -> rendu
// =====================================================
export default function ReservationsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [filtreService, setFiltreService] = useState<'Tous' | Service>('Tous');
  const [filtreStatut, setFiltreStatut] = useState<'Tous' | Statut>('Tous');
  const [reservations, setReservations] =
    useState<Reservation[]>(reservationsDuJour);

  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  // indices des réservations qui passent les filtres
  const filteredIndices = reservations.reduce<number[]>((acc, r, index) => {
    if (filtreService !== 'Tous' && r.service !== filtreService) return acc;
    if (filtreStatut !== 'Tous' && r.statut !== filtreStatut) return acc;
    acc.push(index);
    return acc;
  }, []);

  const totalCouverts = filteredIndices.reduce(
    (sum, idx) => sum + reservations[idx].personnes,
    0,
  );

  const updateStatut = (index: number, newStatut: Statut) => {
    setReservations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, statut: newStatut } : r)),
    );
  };

  // ------ STYLES ------
  const rootStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0B1524',
    display: 'flex',
    justifyContent: 'center',
    padding: isMobile ? '16px 10px' : '26px 18px',
    boxSizing: 'border-box',
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 520,
    background: '#F4F6F8',
    borderRadius: 22,
    boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
    padding: isMobile ? '14px 14px 18px' : '20px 20px 24px',
    boxSizing: 'border-box',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  };

  const statsRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  };

  const statCard: React.CSSProperties = {
    flex: 1,
    minWidth: 140,
    background: '#FFFFFF',
    borderRadius: 14,
    padding: '8px 10px',
    fontSize: 12,
    boxShadow: '0 10px 20px rgba(0,0,0,0.12)',
    boxSizing: 'border-box',
  };

  const chipsRow: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    marginBottom: 8,
  };

  const chipBase: React.CSSProperties = {
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 11,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: '#FFFFFF',
    color: '#4C5665',
  };

  const listeStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '10px 10px 6px',
    boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
    boxSizing: 'border-box',
    maxHeight: isMobile ? '60vh' : '55vh',
    overflowY: 'auto',
  };

  const ligneResa: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '0.9fr 1.6fr' : '0.8fr 1.8fr 1.1fr',
    gap: 6,
    fontSize: 12,
    padding: '6px 2px',
    borderBottom: '1px solid #EEF0F4',
    alignItems: 'center',
  };

  const actionButtonStyle = (
    borderColor: string,
    textColor: string,
  ): React.CSSProperties => ({
    padding: '4px 8px',
    borderRadius: 999,
    border: `1px solid ${borderColor}`,
    background: 'white',
    color: textColor,
    fontSize: 11,
    cursor: 'pointer',
  });

  return (
    <div style={rootStyle}>
      <section style={cardStyle}>
        {/* HEADER */}
        <div style={headerRowStyle}>
          <div>
            <h1
              style={{
                fontSize: isMobile ? 18 : 20,
                margin: 0,
                marginBottom: 4,
              }}
            >
              Réservations du jour
            </h1>
            <div
              style={{
                fontSize: 12,
                color: '#6B7485',
              }}
            >
              {dateStr}
            </div>
          </div>
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

        {/* STATS */}
        <div style={statsRowStyle}>
          <div style={statCard}>
            <div style={{ fontSize: 11, color: '#6B7485' }}>
              Nombre de réservations
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {filteredIndices.length}
            </div>
          </div>
          <div style={statCard}>
            <div style={{ fontSize: 11, color: '#6B7485' }}>Total couverts</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {totalCouverts}
            </div>
          </div>
        </div>

        {/* FILTRES SERVICE */}
        <div style={chipsRow}>
          {(['Tous', 'Midi', 'Soir'] as const).map((s) => {
            const actif = filtreService === s;
            return (
              <button
                key={s}
                onClick={() => setFiltreService(s)}
                style={{
                  ...chipBase,
                  background: actif ? '#001A33' : '#FFFFFF',
                  color: actif ? '#FFFFFF' : '#4C5665',
                  borderColor: actif ? '#001A33' : 'rgba(0,0,0,0.12)',
                }}
              >
                Service&nbsp;: {s}
              </button>
            );
          })}
        </div>

        {/* FILTRES STATUT */}
        <div style={{ ...chipsRow, marginBottom: 10 }}>
          {(
            ['Tous', 'Confirmée', 'En attente', 'Annulée', 'No-show'] as const
          ).map((s) => {
            const actif = filtreStatut === s;
            return (
              <button
                key={s}
                onClick={() =>
                  setFiltreStatut(s === 'Tous' ? 'Tous' : (s as Statut))
                }
                style={{
                  ...chipBase,
                  background: actif ? '#001A33' : '#FFFFFF',
                  color: actif ? '#FFFFFF' : '#4C5665',
                  borderColor: actif ? '#001A33' : 'rgba(0,0,0,0.12)',
                }}
              >
                Statut&nbsp;: {s}
              </button>
            );
          })}
        </div>

        {/* LISTE */}
        <div style={listeStyle}>
          {filteredIndices.map((idx) => {
            const r = reservations[idx];
            const { label, color } = getStatutInfo(r.statut);

            return (
              <div
                key={idx}
                style={ligneResa}
                onMouseEnter={() => !isMobile && setHoveredIndex(idx)}
                onMouseLeave={() => !isMobile && setHoveredIndex(null)}
              >
                {/* Colonne 1 : heure + service */}
                <div>
                  <div style={{ fontWeight: 500 }}>{r.heure}</div>
                  <div style={{ fontSize: 11, color: '#6B7485' }}>
                    {r.service}
                  </div>
                </div>

                {/* Colonne 2 : client */}
                <div>
                  <div style={{ fontWeight: 500 }}>{r.nom}</div>
                  <div style={{ fontSize: 11, color: '#6B7485' }}>{r.tel}</div>
                  {r.commentaire && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#4B5563',
                        marginTop: 2,
                      }}
                    >
                      {r.commentaire}
                    </div>
                  )}
                </div>

                {/* Colonne 3 desktop */}
                {!isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    {/* couverts à droite */}
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      {r.personnes} pers.
                    </div>

                    {/* badge statut */}
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: color + '20',
                        color,
                      }}
                    >
                      {label}
                    </span>

                    {/* actions au survol */}
                    {hoveredIndex === idx && (
                      <div
                        style={{
                          marginTop: 6,
                          display: 'flex',
                          gap: 6,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          type="button"
                          style={actionButtonStyle('#4ade80', '#166534')}
                          onClick={() => updateStatut(idx, 'Confirmée')}
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          style={actionButtonStyle('#f97373', '#b91c1c')}
                          onClick={() => updateStatut(idx, 'Annulée')}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          style={actionButtonStyle('#facc15', '#92400e')}
                          onClick={() => updateStatut(idx, 'No-show')}
                        >
                          No-show
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Vue mobile : couverts + statut + actions toujours visibles */}
                {isMobile && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      {r.personnes} pers.
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background: color + '20',
                        color,
                      }}
                    >
                      {label}
                    </span>
                    <div
                      style={{
                        marginTop: 6,
                        display: 'flex',
                        gap: 6,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        type="button"
                        style={actionButtonStyle('#4ade80', '#166534')}
                        onClick={() => updateStatut(idx, 'Confirmée')}
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        style={actionButtonStyle('#f97373', '#b91c1c')}
                        onClick={() => updateStatut(idx, 'Annulée')}
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        style={actionButtonStyle('#facc15', '#92400e')}
                        onClick={() => updateStatut(idx, 'No-show')}
                      >
                        No-show
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredIndices.length === 0 && (
            <div
              style={{
                padding: '8px 4px',
                fontSize: 12,
                color: '#6B7485',
                textAlign: 'center',
              }}
            >
              Aucune réservation pour ce filtre.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
