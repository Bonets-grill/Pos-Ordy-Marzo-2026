"use client";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <main style={{ minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
