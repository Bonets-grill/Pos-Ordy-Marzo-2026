"use client";
import { useEffect } from "react";

export default function KdsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("kds-fullwidth");
    return () => {
      document.documentElement.classList.remove("kds-fullwidth");
    };
  }, []);
  return <>{children}</>;
}
