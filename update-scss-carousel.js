/* eslint-disable @typescript-eslint/no-require-imports */
// update-scss-carousel.js
// À placer à la racine du projet, puis lancer `node update-scss-carousel.js`
// ✅ Version sûre : remplace le bloc entre marqueurs au lieu d'ajouter à la fin.

const { readFileSync, writeFileSync } = require("fs");
const { resolve } = require("path");

const scssPath = resolve("styles/globals.scss");

const markerStart = "/* === Carrousel mobile & styles cartes employés (BEGIN) === */";
const markerEnd = "/* === Carrousel mobile & styles cartes employés (END) === */";

// ⚠️ Mets ici TA version exacte des styles (celle que tu veux en prod)
const block = `
${markerStart}

/* ===== MOBILE CAROUSEL ===== */
@media (max-width: 768px) {
  .cb-employees__grid {
    display: flex !important;
    gap: 16px;
    overflow-x: auto;
    overflow-y: visible;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;

    /* 👇 Ajuste ici le padding/fond selon la version finale */
    padding: 30px;
    scroll-padding-inline: 18px;

    background: radial-gradient(1200px 500px at 50% 0%,
      rgba(99, 102, 241, 0.18),
      rgba(15, 23, 42, 0.02) 60%,
      rgba(15, 23, 42, 0) 100%);
    border-radius: 18px;
  }

  .cb-employee-card {
    flex: 0 0 86%;
    max-width: 86%;
    scroll-snap-align: center;
    scroll-snap-stop: always;
    position: relative;
    transform: scale(0.965);
    opacity: 0.82;
    transition: transform 220ms ease, opacity 220ms ease, box-shadow 220ms ease;
    z-index: 1;
  }

  .cb-employee-card--active,
  .cb-employee-card[data-active="true"] {
    transform: translateY(-10px) scale(1.02);
    opacity: 1;
    z-index: 10;
    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.20);
  }

  .cb-employee-card:not(.cb-employee-card--active) {
    box-shadow: 0 14px 40px rgba(15, 23, 42, 0.12);
  }
}

${markerEnd}
`;

function replaceOrInsert(content) {
  const start = content.indexOf(markerStart);
  const end = content.indexOf(markerEnd);

  // Si le bloc existe déjà, on le remplace intégralement
  if (start !== -1 && end !== -1 && end > start) {
    const before = content.slice(0, start);
    const after = content.slice(end + markerEnd.length);
    return `${before}${block}${after}`;
  }

  // Sinon, on insère à la fin avec un saut de ligne propre
  return `${content}\n\n${block}`;
}

try {
  const content = readFileSync(scssPath, "utf-8");
  const next = replaceOrInsert(content);
  writeFileSync(scssPath, next, "utf-8");
  console.log("✅ SCSS mis à jour : bloc carrousel remplacé/injecté entre marqueurs.");
} catch (err) {
  console.error("❌ Erreur lors de la mise à jour du SCSS :", err);
  process.exit(1);
}
