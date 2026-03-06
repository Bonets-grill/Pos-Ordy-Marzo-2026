"use client";

import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: 256,
          minHeight: "100vh",
        }}
        className="max-md:!ml-0 max-md:!mt-14 max-md:!mb-14"
      >
        {children}
      </main>
    </div>
  );
}
