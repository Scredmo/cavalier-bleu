export default function DashboardPage() {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="cb-dashboard">
      <div className="cb-dashboard__header">
        <h2 className="cb-dashboard__title">Tableau de bord</h2>
        <p className="cb-dashboard__subtitle">
          {today} — Vue d’ensemble du service au Cavalier Bleu.
        </p>
      </div>

      <div className="cb-dashboard__grid">
        <section className="cb-card">
          <h3 className="cb-card__title">Service du jour</h3>
          <p className="cb-card__subtitle">
            Planning, présence et demandes de l’équipe.
          </p>

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>✔ Vérifier le planning des serveurs et de la cuisine</li>
            <li>✔ Contrôler les arrivées / départs (présence)</li>
            <li>✔ Traiter les demandes de congés / retards</li>
            <li>✔ Suivre les réservations du service</li>
          </ul>
        </section>

        <section className="cb-card">
          <h3 className="cb-card__title">Raccourcis rapides</h3>
          <p className="cb-card__subtitle">Accès direct aux pages clés.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="/planning" className="cb-nav-item">
              <span className="cb-nav-item__icon">📅</span>
              <span className="cb-nav-item__label">Voir le planning</span>
            </a>
            <a href="/presence" className="cb-nav-item">
              <span className="cb-nav-item__icon">🕒</span>
              <span className="cb-nav-item__label">Feuilles de présence</span>
            </a>
            <a href="/demandes" className="cb-nav-item">
              <span className="cb-nav-item__icon">📨</span>
              <span className="cb-nav-item__label">Demandes d’employés</span>
            </a>
            <a href="/depenses" className="cb-nav-item">
              <span className="cb-nav-item__icon">💶</span>
              <span className="cb-nav-item__label">Dépenses & factures</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}