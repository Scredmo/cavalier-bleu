"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { currentUser } from "@/utils/currentUser";

type ThemeMode = "system" | "light" | "dark";

type Settings = {
  theme: ThemeMode;
  compactMode: boolean;
  notifications: boolean;
  sounds: boolean;
  haptics: boolean;
};

const STORAGE_SETTINGS_KEY = "CB_SETTINGS_V1";

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  compactMode: false,
  notifications: true,
  sounds: true,
  haptics: true,
};

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(next: Settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(next));
}

export default function ParametresPage() {
  // même logique que ton layout: on force Patron pour l’instant
  const user = useMemo(() => ({ ...currentUser, role: "Patron" as const }), []);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // appli "soft" du thème (prépare la future vraie implémentation)
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Thème (system/light/dark) — le vrai thème sera géré globalement via SettingsApplier
    document.documentElement.dataset.theme = settings.theme;

    // Densité UI (compact / normal)
    document.documentElement.dataset.compact = settings.compactMode ? "1" : "0";
  }, [settings.theme, settings.compactMode]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      setSavedTick(true);
      window.setTimeout(() => setSavedTick(false), 900);
      return next;
    });
  };

  const triggerHaptic = () => {
    try {
      if (settings.haptics && navigator.vibrate) navigator.vibrate(10);
    } catch {}
  };

  return (
    <div className="cb-settings">
      <div className="cb-settings__header">
        <div>
          <h2 className="cb-settings__title">Paramètres</h2>
          <p className="cb-settings__subtitle">
            Personnalise ton expérience (thème, préférences, interface).
          </p>
        </div>

        <div className="cb-settings__status" aria-live="polite">
          {savedTick ? <span className="cb-settings__saved">✅ Enregistré</span> : null}
        </div>
      </div>

      {/* Carte "Compte" */}
      <section className="cb-settings__card">
        <div className="cb-settings__card-head">
          <div>
            <div className="cb-settings__card-title">Compte</div>
            <div className="cb-settings__card-sub">Infos utilisateur (démo)</div>
          </div>

          <Link href="/profil" className="cb-settings__link">
            Ouvrir le profil →
          </Link>
        </div>

        <div className="cb-settings__account">
          <div className="cb-settings__avatar">
            <img
              src={user.avatarUrl || "/avatar-test.png"}
              alt="Avatar"
              className="cb-settings__avatar-img"
              width={72}
              height={72}
            />
          </div>

          <div className="cb-settings__account-meta">
            <div className="cb-settings__account-name">{user.firstName}</div>
            <div className="cb-settings__account-sub">{user.role} • Cavalier Bleu</div>
            <div className="cb-settings__account-hint">
              (Plus tard : photo upload à la création de compte)
            </div>
          </div>
        </div>
      </section>

      {/* Carte "Apparence" */}
      <section className="cb-settings__card">
        <div className="cb-settings__card-head">
          <div>
            <div className="cb-settings__card-title">Apparence</div>
            <div className="cb-settings__card-sub">Thème & densité</div>
          </div>
        </div>

        <div className="cb-settings__grid">
          <div className="cb-settings__row">
            <div>
              <div className="cb-settings__label">Thème</div>
              <div className="cb-settings__desc">Système, clair ou sombre</div>
            </div>

            <select
              className="cb-settings__select"
              value={settings.theme}
              onChange={(e) => {
                triggerHaptic();
                update({ theme: e.target.value as ThemeMode });
              }}
            >
              <option value="system">Système</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>

          <Toggle
            label="Mode compact"
            desc="Réduit les espacements (utile sur iPhone)"
            checked={settings.compactMode}
            onChange={(v) => update({ compactMode: v })}
            onTap={triggerHaptic}
          />
        </div>
      </section>

      {/* Carte "Préférences" */}
      <section className="cb-settings__card">
        <div className="cb-settings__card-head">
          <div>
            <div className="cb-settings__card-title">Préférences</div>
            <div className="cb-settings__card-sub">Notifications & retours</div>
          </div>
        </div>

        <div className="cb-settings__grid">
          <Toggle
            label="Notifications"
            desc="Active les notifications (placeholder)"
            checked={settings.notifications}
            onChange={(v) => update({ notifications: v })}
            onTap={triggerHaptic}
          />
          <Toggle
            label="Sons"
            desc="Sons légers (placeholder)"
            checked={settings.sounds}
            onChange={(v) => update({ sounds: v })}
            onTap={triggerHaptic}
          />
          <Toggle
            label="Vibration haptique"
            desc="Petit retour iOS-like sur les actions"
            checked={settings.haptics}
            onChange={(v) => update({ haptics: v })}
            onTap={() => {
              // si on désactive, on haptique avant de couper
              try {
                if (settings.haptics && navigator.vibrate) navigator.vibrate(10);
              } catch {}
            }}
          />
        </div>
      </section>

      {/* Carte "Sécurité" (maquette crédible) */}
      <section className="cb-settings__card">
        <div className="cb-settings__card-head">
          <div>
            <div className="cb-settings__card-title">Sécurité</div>
            <div className="cb-settings__card-sub">Écran crédible (même sans auth)</div>
          </div>
        </div>

        <div className="cb-settings__actions">
          <button className="cb-settings__btn" type="button" onClick={triggerHaptic}>
            🔒 Changer le mot de passe (bientôt)
          </button>
          <button className="cb-settings__btn cb-settings__btn--ghost" type="button" onClick={triggerHaptic}>
            🧾 Voir les sessions (bientôt)
          </button>
        </div>
      </section>

      <div className="cb-settings__footer-space" />
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
  onTap,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onTap?: () => void;
}) {
  return (
    <div className="cb-settings__row">
      <div>
        <div className="cb-settings__label">{label}</div>
        <div className="cb-settings__desc">{desc}</div>
      </div>

      <button
        type="button"
        className={"cb-switch" + (checked ? " cb-switch--on" : "")}
        aria-pressed={checked}
        onPointerDown={() => onTap?.()}
        onClick={() => onChange(!checked)}
      >
        <span className="cb-switch__thumb" />
      </button>
    </div>
  );
}
