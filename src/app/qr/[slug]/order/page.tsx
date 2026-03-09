"use client";

/**
 * Takeaway / Delivery ordering page.
 * Redirects to the table page with special "order" table param.
 * The table page detects mode=takeaway|delivery from searchParams
 * and adjusts the UI and order payload accordingly.
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import QRMenuPage from "../[table]/page";

function OrderPageInner() {
  return <QRMenuPage />;
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>...</div>}>
      <OrderPageInner />
    </Suspense>
  );
}
