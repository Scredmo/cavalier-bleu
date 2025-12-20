"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    // Safety: avoid open-redirects
    if (!n || !n.startsWith("/")) return "/dashboard";
    return n;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Session cookie is set; middleware will allow access
      router.replace(nextPath);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Connexion</h1>
      <p style={{ marginTop: 8, color: "#64748b", fontWeight: 700 }}>
        Connecte-toi avec ton email + mot de passe.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(148,163,184,.45)" }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          required
          autoComplete="current-password"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(148,163,184,.45)" }}
        />

        {error && (
          <div style={{ color: "#b91c1c", fontWeight: 800, fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(99,102,241,.35)",
            background: "rgba(99,102,241,.12)",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}