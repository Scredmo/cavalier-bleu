'use client';

import React, { useEffect, useState } from 'react';
const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

type Service = 'Midi' | 'Soir';
type TacheService = 'Midi' | 'Soir' | 'Tous';

type Tache = {
  id: number;
  label: string;
  service: TacheService;
  important?: boolean;
  done: boolean;
};

const tachesInit: Tache[] = [
  {
    id: 1,
    label: 'Vérifier les réservations & plan de salle',
    service: 'Tous',
    important: true,
    done: false,
  },
  {
    id: 2,
    label: 'Brief rapide avec l’équipe salle',
    service: 'Midi',
    done: false,
  },
  {
    id: 3,
    label: 'Contrôler la mise en place terrasse / intérieur',
    service: 'Midi',
    done: false,
  },
  {
    id: 4,
    label: 'Vérifier les niveaux bar (bière, soft, café)',
    service: 'Tous',
    done: false,
  },
  {
    id: 5,
    label: 'Check températures frigos / chambres froides',
    service: 'Tous',
    important: true,
    done: false,
  },
  {
    id: 6,
    label: 'Prévoir dessert maison avec invendus viennoiseries',
    service: 'Soir',
    done: false,
  },
  {
    id: 7,
    label: 'Faire point caisse + pourboires',
    service: 'Soir',
    done: false,
  },
];

export default function AccueilPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [service, setService] = useState<'Tous' | Service>('Tous');
  const [taches, setTaches] = useState<Tache[]>(tachesInit);

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

  const tachesFiltrees = taches.filter((t) =>
    service === 'Tous' ? true : t.service === service || t.service === 'Tous',
  );

  const nbTaches = tachesFiltrees.length;
  const nbFaites = tachesFiltrees.filter((t) => t.done).length;

  const toggleTache = (id: number) => {
    setTaches((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done: !t.done,
            }
          : t,
      ),
    );
  };

  // ---- Styles ----
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

  const retourBtnStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#001A33',
    background: 'white',
    padding: '6px 10px',
    borderRadius: 999,
    textDecoration: 'none',
    border: '1px solid rgba(0,0,0,0.12)',
  };

  const chipsRow: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 4,
    marginBottom: 10,
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

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#6B7485',
    marginBottom: 6,
  };

  const blocStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '10px 10px 8px',
    boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
    boxSizing: 'border-box',
    marginBottom: 12,
  };

  const tacheRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 12,
    padding: '5px 0',
    borderBottom: '1px solid #EEF0F4',
    cursor: 'pointer',
  };

  const petitBadgeService = (s: TacheService): React.CSSProperties => {
    let bg = '#DBEAFE';
    let col = '#1D4ED8';
    if (s === 'Soir') {
      bg = '#F5E1FF';
      col = '#7E22CE';
    } else if (s === 'Tous') {
      bg = '#E5E7EB';
      col = '#374151';
    }
    return {
      fontSize: 10,
      borderRadius: 999,
      padding: '2px 6px',
      background: bg,
      color: col,
      display: 'inline-block',
      marginTop: 2,
    };
  };

  const lienRapide: React.CSSProperties = {
    display: 'inline-block',
    padding: '7px 10px',
    borderRadius: 999,
    background: '#001A33',
    color: '#FFFFFF',
    fontSize: 11,
    textDecoration: 'none',
    marginRight: 6,
    marginBottom: 6,
  };

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
              Accueil du jour
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

        {/* FILTRE SERVICE */}
        <div style={chipsRow}>
          {(['Tous', 'Midi', 'Soir'] as const).map((s) => {
            const actif = service === s;
            return (
              <button
                key={s}
                onClick={() => setService(s)}
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

        {/* BLOC TÂCHES */}
        <div style={blocStyle}>
          <div style={sectionTitleStyle}>
            Tâches à garder en tête ({nbFaites}/{nbTaches} faites)
          </div>
          {tachesFiltrees.map((t) => {
            const cercleStyle: React.CSSProperties = {
              width: 16,
              height: 16,
              borderRadius: 6,
              border: t.done
                ? '2px solid #16A34A'
                : t.important
                ? '2px solid #DC2626'
                : '2px solid #9CA3AF',
              marginTop: 2,
              background: t.done ? '#BBF7D0' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#166534',
            };

            const texteStyle: React.CSSProperties = {
              fontWeight: t.important ? 600 : 400,
              color: t.done ? '#9CA3AF' : t.important ? '#111827' : '#374151',
              textDecoration: t.done ? 'line-through' : 'none',
            };

            return (
              <div
                key={t.id}
                style={tacheRow}
                onClick={() => toggleTache(t.id)}
              >
                <div>
                  <div style={cercleStyle}>{t.done ? '✓' : ''}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={texteStyle}>{t.label}</div>
                  <span style={petitBadgeService(t.service)}>
                    {t.service === 'Tous' ? 'Midi & soir' : t.service}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        

        {/* BLOC NOTES */}
        <div style={blocStyle}>
          <div style={sectionTitleStyle}>Notes du jour (lecture seule)</div>
          <p
            style={{
              fontSize: 12,
              color: '#4B5563',
              margin: 0,
            }}
          >
            • Tiramisu Nutella marche très bien → penser à le remettre en avant.
            <br />
            • Proposer dessert maison avec invendus viennoiseries au goûter.
            <br />
            • Sauce échalote vin rouge très appréciée sur la bavette.
          </p>
        </div>
      </section>
    </div>
  );
}