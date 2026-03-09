"use client";

import Sidebar from "@/components/layout/Sidebar";
import { OnboardingProvider } from "@/lib/onboarding";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
        <Sidebar />
        <main
          style={{
            minHeight: "100vh",
            flexDirection: "column",
          }}
          className="flex ml-0 md:!ml-64 max-md:!pt-14 max-md:!pb-20"
        >
          {children}
        </main>
      </div>
    </OnboardingProvider>
  );
}
