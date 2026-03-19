"use client";

export default function KdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        aside { display: none !important; }
        main { margin-left: 0 !important; padding-top: 0 !important; }
      `}</style>
      {children}
    </>
  );
}
