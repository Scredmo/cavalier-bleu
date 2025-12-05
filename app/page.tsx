'use client';

import React from 'react';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#001A33',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  color: '#FFFFFF',
  fontFamily:
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const logoAreaStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '32px',
};

const logoTitleStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '24px',
  letterSpacing: '0.18em',
  fontWeight: 600,
};

const logoSubtitleStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  opacity: 0.8,
  marginTop: '4px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  background: '#F6F6F8',
  color: '#001A33',
  borderRadius: '30px',
  padding: '26px 24px 24px',
  boxShadow: '0 22px 40px rgba(0, 0, 0, 0.35)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  marginBottom: '6px',
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7485',
  marginBottom: '24px',
};

const buttonsColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginBottom: '18px',
};

const baseButtonStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: '999px',
  padding: '13px 18px',
  fontSize: '15px',
  fontWeight: 500,
  display: 'block',
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  border: 'none',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: '#001A33',
  color: '#FFFFFF',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: '#FFFFFF',
  color: '#001A33',
  border: '1px solid rgba(0, 26, 51, 0.1)',
};

const ghostButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  marginTop: '4px',
  background: 'transparent',
  color: '#7B8291',
};

function LinkButton(props: {
  href: string;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a href={props.href} style={props.style}>
      {props.children}
    </a>
  );
}

export default function Home() {
  // Chemin relatif : /proxy/3000/dashboard depuis la page actuelle
  const dashboardHref = 'dashboard';

  return (
    <main style={pageStyle}>
      <div style={logoAreaStyle}>
        <span style={logoTitleStyle}>CAVALIER</span>
        <span style={logoSubtitleStyle}>BLEU</span>
      </div>

      <section style={cardStyle}>
        <h1 style={cardTitleStyle}>Connexion</h1>
        <p style={cardSubtitleStyle}>Qui êtes-vous&nbsp;?</p>

        <div style={buttonsColumnStyle}>
          <LinkButton href={dashboardHref} style={primaryButtonStyle}>
            Patron
          </LinkButton>

          <LinkButton href={dashboardHref} style={secondaryButtonStyle}>
            Responsable
          </LinkButton>

          <LinkButton href={dashboardHref} style={secondaryButtonStyle}>
            Invité
          </LinkButton>
        </div>

        <LinkButton href={dashboardHref} style={ghostButtonStyle}>
          Accès visiteur
        </LinkButton>
      </section>
    </main>
  );
}