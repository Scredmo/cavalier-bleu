"use client";

export default function ParametresPage() {
  return (
    <div className="cb-settings">
      {/* Header */}
      <header className="cb-settings__header">
        <h2 className="cb-settings__title">Paramètres</h2>
        <p className="cb-settings__subtitle">
          Gérez votre compte, vos préférences et la sécurité de l’application.
        </p>
      </header>

      {/* ===== SECTION : COMPTE ===== */}
      <section className="cb-settings__section">
        <h3 className="cb-settings__section-title">Compte utilisateur</h3>

        <div className="cb-settings__card">
          <div className="cb-settings__row">
            <span className="cb-settings__label">Nom</span>
            <span className="cb-settings__value">Amine</span>
          </div>

          <div className="cb-settings__row">
            <span className="cb-settings__label">Rôle</span>
            <span className="cb-settings__pill cb-settings__pill--primary">
              Patron
            </span>
          </div>

          <div className="cb-settings__row">
            <span className="cb-settings__label">Email</span>
            <span className="cb-settings__value">amine@cavalierbleu.fr</span>
          </div>

          <button className="cb-button cb-button--secondary">
            Modifier le profil
          </button>
        </div>
      </section>

      {/* ===== SECTION : PRÉFÉRENCES ===== */}
      <section className="cb-settings__section">
        <h3 className="cb-settings__section-title">Préférences</h3>

        <div className="cb-settings__card">
          <div className="cb-settings__row cb-settings__row--between">
            <div>
              <strong>Mode sombre</strong>
              <p className="cb-settings__hint">
                Adapter l’interface à faible luminosité
              </p>
            </div>
            <input type="checkbox" disabled />
          </div>

          <div className="cb-settings__row cb-settings__row--between">
            <div>
              <strong>Notifications</strong>
              <p className="cb-settings__hint">
                Recevoir les alertes importantes
              </p>
            </div>
            <input type="checkbox" checked disabled />
          </div>
        </div>
      </section>

      {/* ===== SECTION : SÉCURITÉ ===== */}
      <section className="cb-settings__section">
        <h3 className="cb-settings__section-title">Sécurité</h3>

        <div className="cb-settings__card">
          <div className="cb-settings__row">
            <span className="cb-settings__label">Mot de passe</span>
            <span className="cb-settings__value">••••••••</span>
          </div>

          <button className="cb-button cb-button--ghost">
            Changer le mot de passe
          </button>
        </div>
      </section>

      {/* ===== SECTION : DANGER ===== */}
      <section className="cb-settings__section">
        <h3 className="cb-settings__section-title cb-settings__section-title--danger">
          Zone sensible
        </h3>

        <div className="cb-settings__card cb-settings__card--danger">
          <p className="cb-settings__danger-text">
            Ces actions sont irréversibles.
          </p>

          <button className="cb-button cb-button--danger" disabled>
            Supprimer le compte (désactivé)
          </button>
        </div>
      </section>
    </div>
  );
}