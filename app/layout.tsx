import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import "../styles/globals.scss";
import { currentUser } from "@/utils/currentUser";

export const metadata: Metadata = {
  title: "Cavalier Bleu",
  description: "Application de management du restaurant Cavalier Bleu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TEMP: force your account as site moderator
  // (Later we can plug real auth/roles; for now you are Patron everywhere)
  const user = { ...currentUser, role: "Patron" as const };

  return (
    <html lang="fr">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <style>{`
          .cb-nav-item.cb-nav-item--active{
            border-color: rgba(99,102,241,.35);
            background: rgba(99,102,241,.10);
            box-shadow: 0 10px 22px rgba(15,23,42,.08);
          }
          .cb-bottom-nav__item.cb-bottom-nav__item--active{
            transform: translateY(-1px);
            filter: drop-shadow(0 6px 10px rgba(15,23,42,.18));
          }
        `}</style>
      </head>
      <body>
        <div className="cb-root">
          {/* ░░ SIDEBAR (DESKTOP / TABLETTE) ░░ */}
          <aside className="cb-sidebar">
            <div className="cb-sidebar__logo">
              <span className="cb-logo-a">A</span>
              <span className="cb-logo-text">Cavalier Bleu</span>
            </div>

            <nav className="cb-sidebar__nav">
              <Link href="/dashboard" className="cb-nav-item" data-nav="sidebar" data-path="/dashboard">
                <span className="cb-nav-item__icon">🏠</span>
                <span className="cb-nav-item__label">Dashboard</span>
              </Link>

              <Link href="/planning" className="cb-nav-item" data-nav="sidebar" data-path="/planning">
                <span className="cb-nav-item__icon">📅</span>
                <span className="cb-nav-item__label">Planning</span>
              </Link>

              <Link href="/presence" className="cb-nav-item" data-nav="sidebar" data-path="/presence">
                <span className="cb-nav-item__icon">🧾</span>
                <span className="cb-nav-item__label">Présence</span>
              </Link>

              {(user.role === "Patron" || user.role === "Responsable") && (
                <Link href="/employes" className="cb-nav-item" data-nav="sidebar" data-path="/employes">
                  <span className="cb-nav-item__icon">👥</span>
                  <span className="cb-nav-item__label">Employés</span>
                </Link>
              )}

              {(user.role === "Patron" || user.role === "Responsable") && (
                <Link href="/demandes" className="cb-nav-item" data-nav="sidebar" data-path="/demandes">
                  <span className="cb-nav-item__icon">📨</span>
                  <span className="cb-nav-item__label">Demandes</span>
                </Link>
              )}

              {(user.role === "Patron" || user.role === "Responsable") && (
                <Link href="/depenses" className="cb-nav-item" data-nav="sidebar" data-path="/depenses">
                  <span className="cb-nav-item__icon">💶</span>
                  <span className="cb-nav-item__label">Dépenses</span>
                </Link>
              )}

              <Link href="/reservations" className="cb-nav-item" data-nav="sidebar" data-path="/reservations">
                <span className="cb-nav-item__icon">🍽️</span>
                <span className="cb-nav-item__label">Réservations</span>
              </Link>
            </nav>

            <div className="cb-sidebar__footer">
              <span className="cb-sidebar__role">Connecté : {user.role}</span>
            </div>
          </aside>

          {/* ░░ NAV FLOTTANTE MOBILE ░░ */}
          <nav className="cb-bottom-nav">
            <Link href="/dashboard" className="cb-bottom-nav__item" data-nav="bottom" data-path="/dashboard" aria-label="Dashboard">
              🏠
            </Link>
            <Link href="/planning" className="cb-bottom-nav__item" data-nav="bottom" data-path="/planning" aria-label="Planning">
              📅
            </Link>
            <Link href="/presence" className="cb-bottom-nav__item" data-nav="bottom" data-path="/presence" aria-label="Présence">
              🧾
            </Link>
            {(user.role === "Patron" || user.role === "Responsable") && (
              <Link href="/employes" className="cb-bottom-nav__item" data-nav="bottom" data-path="/employes" aria-label="Employés">
                👥
              </Link>
            )}
            {(user.role === "Patron" || user.role === "Responsable") && (
              <Link href="/depenses" className="cb-bottom-nav__item" data-nav="bottom" data-path="/depenses" aria-label="Dépenses">
                💶
              </Link>
            )}
            <Link href="/reservations" className="cb-bottom-nav__item" data-nav="bottom" data-path="/reservations" aria-label="Réservations">
              🍽️
            </Link>
          </nav>

          {/* ░░ CONTENU PRINCIPAL ░░ */}
          <main className="cb-main">
            {/* User menu flottant (avatar only) */}
            <div className="cb-topbar__right cb-topbar__right--floating">
              <details className="cb-user-menu">
                <summary
                  className="cb-user-menu__trigger cb-user-menu__trigger--avatar"
                  aria-label="Ouvrir le menu utilisateur"
                  title="Compte"
                  data-haptic="tap"
                >
                  <span className="cb-user-menu__avatar" aria-hidden="true">
                    <img
                      className="cb-user-menu__avatar-img"
                      src={user.avatarUrl || "/avatar-test.png"}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                  </span>
                </summary>

                <div className="cb-user-menu__panel" role="menu">
                  <div className="cb-user-menu__header">
                    <div className="cb-user-menu__avatar" aria-hidden="true">
                      <img
                        className="cb-user-menu__avatar-img"
                        src={user.avatarUrl || "/avatar-test.png"}
                        alt=""
                        width={56}
                        height={56}
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <div className="cb-user-menu__meta-name">
                        {user.firstName}
                      </div>
                      <div className="cb-user-menu__meta-sub">
                        {user.role} • Cavalier Bleu
                      </div>
                    </div>
                  </div>

                  <div className="cb-user-menu__items">
                    <Link
                      href="/profil"
                      className="cb-user-menu__item"
                      role="menuitem"
                    >
                      <span className="cb-user-menu__item-ico">👤</span>
                      <span>Mon profil</span>
                    </Link>

                    <Link
                      href="/parametres"
                      className="cb-user-menu__item"
                      role="menuitem"
                    >
                      <span className="cb-user-menu__item-ico">⚙️</span>
                      <span>Paramètres</span>
                    </Link>

                    <Link
                      href="/"
                      className="cb-user-menu__item cb-user-menu__item--danger"
                      role="menuitem"
                    >
                      <span className="cb-user-menu__item-ico">🚪</span>
                      <span>Déconnexion</span>
                    </Link>
                  </div>
                </div>
              </details>
            </div>

            <section className="cb-content">{children}</section>
          </main>
        </div>

        {/* Close user menu on outside click / Escape (no React needed) */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function hapticTap(){
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (_) {}
  }

  function closeAll(){
    document.querySelectorAll('details.cb-user-menu[open]').forEach(function(d){
      d.removeAttribute('open');
    });
  }

  function normalizePath(p){
    try{
      if (!p) return '/';
      // remove trailing slash (except root)
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
      return p;
    }catch(_){ return p || '/'; }
  }

  function updateActiveNav(){
    try{
      var path = normalizePath(location.pathname);

      // match exact; also treat "/" as "/dashboard" because root redirects
      if (path === '/') path = '/dashboard';

      // clear
      document.querySelectorAll('[data-nav][data-path]').forEach(function(el){
        el.classList.remove('cb-nav-item--active','cb-bottom-nav__item--active');
        el.removeAttribute('aria-current');
      });

      // set active for matching paths
      document.querySelectorAll('[data-nav][data-path]').forEach(function(el){
        var p = el.getAttribute('data-path');
        if (!p) return;
        if (normalizePath(p) === path){
          if (el.classList.contains('cb-nav-item')) el.classList.add('cb-nav-item--active');
          if (el.classList.contains('cb-bottom-nav__item')) el.classList.add('cb-bottom-nav__item--active');
          el.setAttribute('aria-current','page');
        }
      });
    }catch(_){ }
  }

  function hookHistory(){
    try{
      var _push = history.pushState;
      var _replace = history.replaceState;
      history.pushState = function(){
        _push.apply(this, arguments);
        setTimeout(updateActiveNav, 0);
      };
      history.replaceState = function(){
        _replace.apply(this, arguments);
        setTimeout(updateActiveNav, 0);
      };
      window.addEventListener('popstate', function(){ setTimeout(updateActiveNav, 0); });
    }catch(_){ }
  }

  // Haptic only on the avatar trigger
  document.addEventListener('pointerdown', function(e){
    var t = e.target;
    if (!t || !(t instanceof Element)) return;
    if (t.closest('summary[data-haptic="tap"]')) hapticTap();
  }, { capture: true, passive: true });

  // Close on outside click (use click instead of pointerdown to avoid killing Next.js Link navigation)
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !(t instanceof Element)) return;

    var insideMenu = t.closest('details.cb-user-menu');
    if (insideMenu) {
      // If a menu item was clicked, close AFTER navigation has been handled
      if (t.closest('.cb-user-menu__panel a')) {
        setTimeout(closeAll, 0);
      }
      return;
    }

    closeAll();
  }, true);

  // Close on Escape
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeAll();
  });

  hookHistory();
  updateActiveNav();

  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !(t instanceof Element)) return;
    if (t.closest('[data-nav][data-path]')) {
      setTimeout(updateActiveNav, 0);
    }
  }, true);
})();
`,
          }}
        />
      </body>
    </html>
  );
}
