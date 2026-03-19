"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { OnboardingProvider } from "@/lib/onboarding";

function ImpersonationBanner() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("impersonate_tenant_name");
    if (name) setTenantName(name);
  }, []);

  if (!tenantName) return null;

  return (
    <div style={{
      background: "#8b5cf6", color: "white", padding: "8px 16px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      fontSize: 13, fontWeight: 600, zIndex: 9999, position: "relative",
    }}>
      <span>Impersonando: {tenantName}</span>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const originalId = localStorage.getItem("impersonate_original_tenant");
          if (originalId) {
            await fetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "impersonate", tenant_id: originalId }),
            });
          }
          localStorage.removeItem("impersonate_original_tenant");
          localStorage.removeItem("impersonate_tenant_name");
          router.push("/admin#tenants");
        }}
        style={{
          background: "white", color: "#8b5cf6", border: "none", borderRadius: 6,
          padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}
      >
        {loading ? "..." : "Salir"}
      </button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/kds" || pathname === "/pos" || pathname.startsWith("/pos/") || pathname.startsWith("/kds/");

  return (
    <OnboardingProvider>
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <ImpersonationBanner />
        {!hideSidebar && <Sidebar />}
        <main
          style={{
            minHeight: "100vh",
            flexDirection: "column",
          }}
          className={`flex max-md:!pt-14 max-md:!pb-20 ${hideSidebar ? "ml-0" : "ml-0 md:!ml-64"}`}
        >
          {children}
        </main>
      </div>
    </OnboardingProvider>
  );
}
