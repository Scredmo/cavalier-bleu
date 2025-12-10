/* eslint-disable @typescript-eslint/no-require-imports */
// update-scss-carousel.js
// À placer à la racine du projet, puis lancer `node update-scss-carousel.js`
// Version CommonJS pour éviter les erreurs d'import.

const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const scssPath = resolve("styles/globals.scss");
const marker = "/* === Carrousel mobile & styles cartes employés === */";
const newStyles = `

/* === Carrousel mobile & styles cartes employés === */

.cb-employees {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 96px; /* laisse de la place pour la nav / footer */
}

@media (max-width: 768px) {
  .cb-employees__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .cb-employees__mobile-slider {
    display: flex;
    margin-top: 6px;
    margin-bottom: 14px;
    z-index: 10;
  }

  .cb-employees__grid {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 16px;
    max-width: 640px;
    margin: 0 auto 90px;
    padding: 12px 4px 8px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }

  .cb-employees__grid .cb-employee-card {
    flex: 0 0 86%;
    max-width: 86%;
    margin-inline: auto;
    scroll-snap-align: center;
  }

  .cb-employee-card {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    border-radius: 18px;
    padding: 14px 14px 12px;
    transform-origin: center;
    overflow: hidden;
    backdrop-filter: blur(4px);
    filter: drop-shadow(0 16px 35px rgba(15, 23, 42, 0.18));
    border: 1px solid rgba(148, 163, 184, 0.3);
    transition: transform 0.22s ease,
                box-shadow 0.22s ease,
                border-color 0.22s ease,
                opacity 0.18s ease;
  }

  .cb-employee-card--active {
    transform: translateY(-3px) scale(1.02);
    border-color: rgba(79, 70, 229, 0.55);
    box-shadow: 0 22px 55px rgba(79, 70, 229, 0.22);
    opacity: 1;
  }

  .cb-employee-card:not(.cb-employee-card--active) {
    opacity: 0.9;
  }
}

.cb-employees__slider-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 18px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.45);
}

.cb-employees__slider-btn.cb-button--ghost {
  background: radial-gradient(circle at 30% 0,
              rgba(248, 250, 252, 0.12), rgba(15, 23, 42, 0.3));
  border-color: rgba(148, 163, 184, 0.5);
  color: #e5e7eb;
}

.cb-employees__slider-btn.cb-button--ghost:hover {
  background: radial-gradient(circle at 30% 0,
              rgba(248, 250, 252, 0.18), rgba(15, 23, 42, 0.4));
  border-color: rgba(191, 219, 254, 0.9);
}

.cb-employee-card__delete {
  margin-left: auto;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  transition: background 0.16s ease,
              border-color 0.16s ease,
              transform 0.1s ease;
}

.cb-employee-card__delete:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  transform: translateY(-1px);
}
`;

try {
  let content = readFileSync(scssPath, "utf-8");

  if (content.includes(marker)) {
    console.log("ℹ️ Styles carrousel déjà présents — pas de changement.");
    process.exit(0);
  }

  content += "\n" + newStyles;
  writeFileSync(scssPath, content, "utf-8");
  console.log("✅ SCSS mis à jour avec les styles carrousel.");
} catch (err) {
  console.error("❌ Erreur lors de la mise à jour du SCSS :", err);
}
