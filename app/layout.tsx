import type { Metadata } from "next";
import "../styles/globals.scss";

export const metadata: Metadata = {
  title: "Cavalier Bleu",
  description: "Application de management du restaurant Cavalier Bleu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="cb-root">
          <aside className="cb-sidebar">
            <div className="cb-sidebar__logo">
              <span className="cb-logo-a">A</span>
              <span className="cb-logo-text">Cavalier Bleu</span>
            </div>

            <nav className="cb-sidebar__nav">
              <a href="/" className="cb-nav-item">
                <span className="cb-nav-item__icon">🏠</span>
                <span className="cb-nav-item__label">Dashboard</span>
              </a>
              <a href="/planning" className="cb-nav-item">
                <span className="cb-nav-item__icon">📅</span>
                <span className="cb-nav-item__label">Planning</span>
              </a>
              <a href="/presence" className="cb-nav-item">
                <span className="cb-nav-item__icon">📝</span>
                <span className="cb-nav-item__label">Présence</span>
              </a>
              <a href="/demandes" className="cb-nav-item">
                <span className="cb-nav-item__icon">📨</span>
                <span className="cb-nav-item__label">Demandes</span>
              </a>
              <a href="/depenses" className="cb-nav-item">
                <span className="cb-nav-item__icon">💶</span>
                <span className="cb-nav-item__label">Dépenses</span>
              </a>
              <a href="/reservations" className="cb-nav-item">
                <span className="cb-nav-item__icon">🍽️</span>
                <span className="cb-nav-item__label">Réservations</span>
              </a>
            </nav>

            <div className="cb-sidebar__footer">
              <span className="cb-sidebar__role">Connecté : Responsable</span>
            </div>
          </aside>

          <main className="cb-main">
            <header className="cb-topbar">
              <div className="cb-topbar__left">
                <h1 className="cb-topbar__title">Cavalier Bleu</h1>
                <p className="cb-topbar__subtitle">
                  Gestion quotidienne du restaurant
                </p>
              </div>
              <div className="cb-topbar__right">
                <span className="cb-topbar__user">Amine • Service</span>
              </div>
            </header>

            <section className="cb-content">{children}</section>
          </main>
        </div>
      </body>
    </html>
  );
}