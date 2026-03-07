import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuth } from "@/core/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-jade-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">L</span>
          </div>
          <CardTitle className="text-2xl">{t("auth.loginTitle")}</CardTitle>
          <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.loggingIn") : t("auth.login")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="text-jade-500 hover:underline">
                {t("auth.register")}
              </Link>
            </p>
          </form>

          {/* Demo credentials — only in development */}
          {import.meta.env.DEV && (
            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">
                Cuentas de prueba (solo dev)
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setEmail("admin@layra.io"); setPassword("LayraAdmin2026"); }}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                >
                  <div>
                    <span className="font-medium">Super Admin</span>
                    <span className="text-muted-foreground ml-2">admin@layra.io</span>
                  </div>
                  <span className="rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-medium">admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail("demo@layra.io"); setPassword("LayraDemo2026"); }}
                  className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                >
                  <div>
                    <span className="font-medium">Tenant Admin</span>
                    <span className="text-muted-foreground ml-2">demo@layra.io</span>
                  </div>
                  <span className="rounded bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium">tenant</span>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
