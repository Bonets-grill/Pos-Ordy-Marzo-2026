"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { LANGS, LANG_LABELS } from "@/lib/translations";

const REDIRECT_DELAY_MS = 2500;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Supabase sends the recovery token as a URL fragment (#access_token=...).
  // The SSR client picks it up automatically once the page mounts.
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // Session is now active with the recovery token — do nothing, just wait for submit.
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(t("auth.reset_error"));
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setDone(true);
      setTimeout(() => router.push("/login"), REDIRECT_DELAY_MS);
    } catch {
      setError(t("auth.reset_error"));
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "2.5rem 2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "var(--accent)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Ordy POS
          </h1>
        </div>

        {done ? (
          <div
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 8,
              padding: "1rem",
              color: "#4ade80",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            {t("auth.password_updated")}
          </div>
        ) : (
          <>
            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  color: "#f87171",
                  fontSize: "0.875rem",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label
                  htmlFor="new-password"
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("auth.new_password")}
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "0.5rem",
                  background: loading ? "var(--border)" : "var(--accent)",
                  color: loading ? "var(--text-secondary)" : "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "0.85rem",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s, background 0.2s",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? t("auth.updating") : t("auth.update_password")}
              </button>
            </form>

            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => router.push("/login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                {t("auth.back_to_login")}
              </button>
            </div>
          </>
        )}

        {/* Language Selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.25rem",
            flexWrap: "wrap",
          }}
        >
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? "var(--accent)" : "transparent",
                color: lang === l ? "#000" : "var(--text-secondary)",
                border: lang === l ? "none" : "1px solid var(--border)",
                borderRadius: 6,
                padding: "0.35rem 0.7rem",
                fontSize: "0.78rem",
                fontWeight: lang === l ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
