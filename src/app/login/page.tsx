"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useI18n } from "@/lib/i18n-provider";
import { LANGS, LANG_LABELS } from "@/lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t("auth.error"));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError(t("auth.error"));
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetErr) {
        setResetError(t("auth.reset_error"));
        setResetLoading(false);
        return;
      }

      setResetSent(true);
    } catch {
      setResetError(t("auth.reset_error"));
    } finally {
      setResetLoading(false);
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

  const labelStyle: React.CSSProperties = {
    color: "var(--text-secondary)",
    fontSize: "0.8rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
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
        {/* Logo / Title */}
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

        {!showForgot ? (
          <>
            {/* Error */}
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

            {/* Login Form */}
            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label htmlFor="email" style={labelStyle}>{t("auth.email")}</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label htmlFor="password" style={labelStyle}>{t("auth.password")}</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                {loading ? t("auth.logging_in") : t("auth.login")}
              </button>
            </form>

            {/* Forgot Password link */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => { setShowForgot(true); setError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                {t("auth.forgot_password")}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Forgot Password Form */}
            {resetSent ? (
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
                {t("auth.reset_sent")}
              </div>
            ) : (
              <>
                {resetError && (
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
                    {resetError}
                  </div>
                )}

                <form
                  onSubmit={handleForgotPassword}
                  style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label htmlFor="reset-email" style={labelStyle}>{t("auth.email")}</label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{
                      background: resetLoading ? "var(--border)" : "var(--accent)",
                      color: resetLoading ? "var(--text-secondary)" : "#000",
                      border: "none",
                      borderRadius: 8,
                      padding: "0.85rem",
                      fontSize: "1rem",
                      fontWeight: 700,
                      cursor: resetLoading ? "not-allowed" : "pointer",
                      transition: "opacity 0.2s, background 0.2s",
                      opacity: resetLoading ? 0.7 : 1,
                    }}
                  >
                    {resetLoading ? t("auth.sending") : t("auth.send_reset")}
                  </button>
                </form>
              </>
            )}

            {/* Back to login */}
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => { setShowForgot(false); setResetSent(false); setResetError(""); }}
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
