'use client';

import React, { useEffect, useState } from 'react';
import {
  EmployeeRequest,
  loadRequests,
  saveRequests,
} from '@/app/_data/requests';
import { loadEmployees } from '@/app/_data/employees';
const navPages = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Planning', href: '/planning' },
  { label: 'Employés', href: '/employes' },
  { label: 'Présences', href: '/presences' },
  { label: 'Réservations', href: '/reservations' },
  { label: 'Dépenses', href: '/depenses' },
  { label: 'Demandes', href: '/demandes' },
];

type DemandeType = 'retard' | 'conge' | 'absence';

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
  maxWidth: 480,
  background: '#F4F6F8',
  borderRadius: 22,
  boxShadow: '0 18px 36px rgba(0,0,0,0.35)',
  padding: '18px 18px 24px',
  boxSizing: 'border-box',
};

const typeButtonBase: React.CSSProperties = {
  flex: 1,
  borderRadius: 14,
  border: '1px solid #d1d5db',
  padding: '10px 10px',
  fontSize: 13,
  background: '#FFFFFF',
  cursor: 'pointer',
  textAlign: 'left' as const,
  boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  padding: '7px 9px',
  fontSize: 13,
  boxSizing: 'border-box',
  background: '#FFFFFF',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#4b5563',
  marginBottom: 4,
};

const smallTag: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  borderRadius: 999,
  padding: '2px 7px',
  background: '#e5e7eb',
  color: '#374151',
};

export default function DemandesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(
    null,
  );
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string>('—');

  const [type, setType] = useState<DemandeType | null>(null);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [myRequests, setMyRequests] = useState<EmployeeRequest[]>([]);

  // Init responsivité + "user connecté" (pour l'instant simplifié)
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);

    // ---- ICI : futur login / authentification ----
    // Pour l'instant on prend le 1er employé de la liste comme "connecté"
    const employees = loadEmployees();
    if (employees.length > 0) {
      const emp = employees[0];
      setCurrentEmployeeId(emp.id);
      setCurrentEmployeeName(emp.nom);
    }

    // Charger les demandes existantes
    const all = loadRequests();
    setMyRequests(all);

    setInitialized(true);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Filtrer juste les demandes de cet employé
  const myVisibleRequests =
    currentEmployeeId == null
      ? []
      : myRequests.filter((r) => r.employeeId === currentEmployeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployeeId || !type) return;

    if (!date.trim()) {
      setFeedback('Merci de choisir une date.');
      return;
    }
    if (type === 'retard' && !heure.trim()) {
      setFeedback("Merci d'indiquer une heure de retard.");
      return;
    }

    setSending(true);
    setFeedback(null);

    const all = loadRequests();
    const newReq: EmployeeRequest = {
      id: `REQ-${Date.now()}`,
      employeeId: currentEmployeeId,
      type,
      date,
      heure: type === 'retard' ? heure : undefined,
      message: message.trim() || undefined,
      treated: false,
    };

    const updated = [...all, newReq];
    saveRequests(updated);
    setMyRequests(updated);

    // Reset du formulaire mais on garde le type sélectionné
    setDate('');
    setHeure('');
    setMessage('');
    setSending(false);
    setFeedback('Demande envoyée au responsable ✅');
  };

  const niceTypeLabel = (t: DemandeType | null) => {
    if (!t) return 'Choisissez un type de demande';
    if (t === 'retard') return 'Déclaration de retard';
    if (t === 'conge') return 'Demande de congé';
    return 'Absence exceptionnelle';
  };

  if (!initialized) {
    return (
      <div
        style={{ ...rootStyle, background: '#0B1524', color: 'white' }}
      >
        <div style={{ opacity: 0.7 }}>Chargement…</div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

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

          {/* CHOIX DU TYPE */}
          <div
            style={{
              fontSize: 12,
              color: '#4b5563',
              marginBottom: 6,
            }}
          >
            Que souhaites-tu signaler ?
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setType('retard')}
              style={{
                ...typeButtonBase,
                borderColor:
                  type === 'retard' ? '#0f766e' : '#d1d5db',
                background:
                  type === 'retard' ? '#ECFDF5' : '#ffffff',
              }}
            >
              <div style={{ fontWeight: 600 }}>Retard</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                Préviens si tu arrives plus tard que prévu.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('conge')}
              style={{
                ...typeButtonBase,
                borderColor:
                  type === 'conge' ? '#2563eb' : '#d1d5db',
                background:
                  type === 'conge' ? '#EFF6FF' : '#ffffff',
              }}
            >
              <div style={{ fontWeight: 600 }}>Congés</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                Demande de jour(s) de congé.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('absence')}
              style={{
                ...typeButtonBase,
                borderColor:
                  type === 'absence' ? '#b45309' : '#d1d5db',
                background:
                  type === 'absence' ? '#FFFBEB' : '#ffffff',
              }}
            >
              <div style={{ fontWeight: 600 }}>Absence</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                }}
              >
                Cas exceptionnel (maladie, urgence…).
              </div>
            </button>
          </div>

          {/* FORMULAIRE */}
          <form onSubmit={handleSubmit}>
            <div
              style={{
                marginBottom: 10,
                fontSize: 12,
                color: '#6b7280',
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {niceTypeLabel(type)}
              </span>
            </div>

            {/* DATE */}
            <div style={{ marginBottom: 10 }}>
              <div style={labelStyle}>Date concernée</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* HEURE pour retard uniquement */}
            {type === 'retard' && (
              <div style={{ marginBottom: 10 }}>
                <div style={labelStyle}>Heure estimée d&apos;arrivée</div>
                <input
                  type="time"
                  value={heure}
                  onChange={(e) => setHeure(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            )}

            {/* MESSAGE OPTIONNEL */}
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>
                Commentaire (optionnel)
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                placeholder="Ajoute un détail pour le responsable si besoin."
              />
            </div>

            {/* FEEDBACK */}
            {feedback && (
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 12,
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
              disabled={!type || sending}
              style={{
                width: '100%',
                borderRadius: 999,
                border: 'none',
                padding: '9px 12px',
                fontSize: 14,
                fontWeight: 600,
                cursor: type && !sending ? 'pointer' : 'not-allowed',
                background: !type || sending ? '#d1d5db' : '#0f766e',
                color: '#ffffff',
                marginBottom: 16,
              }}
            >
              {sending
                ? 'Envoi en cours...'
                : "Envoyer la demande au responsable"}
            </button>
          </form>

          {/* HISTORIQUE DES DEMANDES */}
          <div
            style={{
              fontSize: 12,
              color: '#4b5563',
              marginBottom: 6,
            }}
          >
            Tes dernières demandes
          </div>

          {myVisibleRequests.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: '#9ca3af',
              }}
            >
              Aucune demande enregistrée pour l&apos;instant.
            </div>
          ) : (
            <div
              style={{
                maxHeight: 160,
                overflowY: 'auto',
                borderRadius: 12,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                padding: '6px 8px',
              }}
            >
              {myVisibleRequests
                .slice()
                .reverse()
                .slice(0, 10)
                .map((r) => {
                  let typeLabel = '';
                  let typeColor = '#4b5563';
                  let typeBg = '#e5e7eb';

                  if (r.type === 'retard') {
                    typeLabel = 'Retard';
                    typeColor = '#b45309';
                    typeBg = '#FFFBEB';
                  } else if (r.type === 'conge') {
                    typeLabel = 'Congé';
                    typeColor = '#1d4ed8';
                    typeBg = '#DBEAFE';
                  } else {
                    typeLabel = 'Absence';
                    typeColor = '#b91c1c';
                    typeBg = '#FEE2E2';
                  }

                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '4px 2px',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div>
                            <span
                              style={{
                                ...smallTag,
                                background: typeBg,
                                color: typeColor,
                              }}
                            >
                              {typeLabel}
                            </span>{' '}
                            <span style={{ marginLeft: 4 }}>
                              le {r.date}
                              {r.heure ? ` · ${r.heure}` : ''}
                            </span>
                          </div>
                          {r.message && (
                            <div
                              style={{
                                fontSize: 11,
                                color: '#6b7280',
                                marginTop: 2,
                              }}
                            >
                              {r.message}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: r.treated ? '#16a34a' : '#9ca3af',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.treated
                            ? 'Vu par le responsable'
                            : 'En attente'}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}