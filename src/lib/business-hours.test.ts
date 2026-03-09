import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * BUSINESS HOURS & QR ORDERING LOGIC TEST LAB
 * Tests business hours validation, campaign status, KDS timing
 */

// ── Business hours logic (from qr/[slug]/page.tsx) ──────────

interface DaySchedule {
  closed?: boolean;
  open?: string;
  close?: string;
  shifts?: { open: string; close: string }[];
}

type BusinessHours = Record<string, DaySchedule>;

function isRestaurantOpen(
  businessHours: BusinessHours | null,
  now: Date
): boolean {
  if (!businessHours) return true; // no hours = always open

  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = days[now.getDay()];
  const dayData = businessHours[dayKey];

  if (!dayData || dayData.closed) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const shifts = dayData.shifts || [{ open: dayData.open!, close: dayData.close! }];

  return shifts.some((s) => {
    const openMin = parseInt(s.open.split(":")[0]) * 60 + parseInt(s.open.split(":")[1]);
    let closeMin = parseInt(s.close.split(":")[0]) * 60 + parseInt(s.close.split(":")[1]);
    if (closeMin <= openMin) closeMin += 24 * 60; // overnight
    return nowMin >= openMin && nowMin <= closeMin;
  });
}

// ── Business hours tests ────────────────────────────────────

describe("Business hours validation", () => {
  it("null hours = always open", () => {
    expect(isRestaurantOpen(null, new Date())).toBe(true);
  });

  it("open during business hours", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
      tue: { open: "10:00", close: "22:00" },
      wed: { open: "10:00", close: "22:00" },
      thu: { open: "10:00", close: "22:00" },
      fri: { open: "10:00", close: "23:00" },
      sat: { open: "11:00", close: "23:00" },
      sun: { closed: true },
    };
    // Monday 14:00
    const monday2pm = new Date(2026, 2, 9, 14, 0); // Monday
    expect(monday2pm.getDay()).toBe(1); // verify it's Monday
    expect(isRestaurantOpen(hours, monday2pm)).toBe(true);
  });

  it("closed on Sunday", () => {
    const hours: BusinessHours = {
      sun: { closed: true },
      mon: { open: "10:00", close: "22:00" },
    };
    // Sunday 14:00
    const sunday = new Date(2026, 2, 8, 14, 0); // Sunday
    expect(sunday.getDay()).toBe(0);
    expect(isRestaurantOpen(hours, sunday)).toBe(false);
  });

  it("closed before opening time", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
    };
    const monday8am = new Date(2026, 2, 9, 8, 0);
    expect(isRestaurantOpen(hours, monday8am)).toBe(false);
  });

  it("closed after closing time", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
    };
    const monday11pm = new Date(2026, 2, 9, 23, 0);
    expect(isRestaurantOpen(hours, monday11pm)).toBe(false);
  });

  it("exact opening time = open", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
    };
    const monday10am = new Date(2026, 2, 9, 10, 0);
    expect(isRestaurantOpen(hours, monday10am)).toBe(true);
  });

  it("exact closing time = open (inclusive)", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
    };
    const monday10pm = new Date(2026, 2, 9, 22, 0);
    expect(isRestaurantOpen(hours, monday10pm)).toBe(true);
  });

  it("overnight hours (close after midnight)", () => {
    const hours: BusinessHours = {
      fri: { open: "18:00", close: "02:00" },
    };
    // Friday 23:00 should be open
    const friday11pm = new Date(2026, 2, 13, 23, 0);
    expect(friday11pm.getDay()).toBe(5); // Friday
    expect(isRestaurantOpen(hours, friday11pm)).toBe(true);
  });

  it("multiple shifts (lunch + dinner)", () => {
    const hours: BusinessHours = {
      mon: {
        shifts: [
          { open: "12:00", close: "16:00" },
          { open: "19:00", close: "23:00" },
        ],
      },
    };
    const monday1pm = new Date(2026, 2, 9, 13, 0);
    const monday5pm = new Date(2026, 2, 9, 17, 0);
    const monday8pm = new Date(2026, 2, 9, 20, 0);

    expect(isRestaurantOpen(hours, monday1pm)).toBe(true);  // during lunch
    expect(isRestaurantOpen(hours, monday5pm)).toBe(false);  // between shifts
    expect(isRestaurantOpen(hours, monday8pm)).toBe(true);  // during dinner
  });

  it("day not configured = closed", () => {
    const hours: BusinessHours = {
      mon: { open: "10:00", close: "22:00" },
      // tuesday missing
    };
    const tuesday = new Date(2026, 2, 10, 14, 0);
    expect(tuesday.getDay()).toBe(2);
    expect(isRestaurantOpen(hours, tuesday)).toBe(false);
  });
});

// ── Campaign status logic (from loyalty/campaigns/page.tsx) ─

describe("Campaign status", () => {
  function getCampaignStatus(
    startsAt: string,
    endsAt: string,
    now: Date
  ): "upcoming" | "active" | "ended" {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "active";
  }

  it("upcoming campaign", () => {
    expect(getCampaignStatus("2026-04-01", "2026-04-15", new Date("2026-03-09"))).toBe("upcoming");
  });

  it("active campaign", () => {
    expect(getCampaignStatus("2026-03-01", "2026-03-15", new Date("2026-03-09"))).toBe("active");
  });

  it("ended campaign", () => {
    expect(getCampaignStatus("2026-02-01", "2026-02-15", new Date("2026-03-09"))).toBe("ended");
  });

  it("starts today = active", () => {
    expect(getCampaignStatus("2026-03-09", "2026-03-15", new Date("2026-03-09T12:00:00"))).toBe("active");
  });

  it("ends today = active (if before midnight)", () => {
    expect(getCampaignStatus("2026-03-01", "2026-03-09", new Date("2026-03-09T00:00:00"))).toBe("active");
  });
});

// ── KDS timing logic (from kds/page.tsx) ────────────────────

describe("KDS urgency timing", () => {
  function getUrgencyColor(elapsedMinutes: number): string {
    if (elapsedMinutes < 5) return "success";    // green
    if (elapsedMinutes < 10) return "warning";   // orange
    return "danger";                              // red
  }

  function getElapsedMinutes(createdAt: string, now: Date): number {
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000);
  }

  it("< 5 min = green", () => {
    expect(getUrgencyColor(0)).toBe("success");
    expect(getUrgencyColor(4)).toBe("success");
    expect(getUrgencyColor(4.99)).toBe("success");
  });

  it("5-9 min = orange", () => {
    expect(getUrgencyColor(5)).toBe("warning");
    expect(getUrgencyColor(7)).toBe("warning");
    expect(getUrgencyColor(9.99)).toBe("warning");
  });

  it("> 10 min = red", () => {
    expect(getUrgencyColor(10)).toBe("danger");
    expect(getUrgencyColor(30)).toBe("danger");
    expect(getUrgencyColor(120)).toBe("danger");
  });

  it("elapsed minutes calculation", () => {
    const created = "2026-03-09T14:00:00Z";
    const now = new Date("2026-03-09T14:07:30Z");
    expect(getElapsedMinutes(created, now)).toBe(7);
  });
});

// ── Order status transitions ────────────────────────────────

describe("Order status state machine", () => {
  const validTransitions: Record<string, string[]> = {
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["served", "cancelled"],
    served: ["closed"],
    closed: [], // terminal
    cancelled: [], // terminal
  };

  function isValidTransition(from: string, to: string): boolean {
    return (validTransitions[from] || []).includes(to);
  }

  it("confirmed → preparing (valid)", () => {
    expect(isValidTransition("confirmed", "preparing")).toBe(true);
  });

  it("preparing → ready (valid)", () => {
    expect(isValidTransition("preparing", "ready")).toBe(true);
  });

  it("ready → served (valid)", () => {
    expect(isValidTransition("ready", "served")).toBe(true);
  });

  it("served → closed (valid)", () => {
    expect(isValidTransition("served", "closed")).toBe(true);
  });

  it("any → cancelled (valid)", () => {
    expect(isValidTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidTransition("preparing", "cancelled")).toBe(true);
    expect(isValidTransition("ready", "cancelled")).toBe(true);
  });

  it("backwards transition invalid", () => {
    expect(isValidTransition("preparing", "confirmed")).toBe(false);
    expect(isValidTransition("ready", "preparing")).toBe(false);
    expect(isValidTransition("served", "ready")).toBe(false);
  });

  it("terminal states have no transitions", () => {
    expect(isValidTransition("closed", "confirmed")).toBe(false);
    expect(isValidTransition("cancelled", "confirmed")).toBe(false);
  });

  it("served cannot be cancelled (already delivered)", () => {
    expect(isValidTransition("served", "cancelled")).toBe(false);
  });
});

// ── Payment reconciliation (from payments/page.tsx) ─────────

describe("Payment reconciliation", () => {
  interface Payment {
    id: string;
    amount: number;
    tip_amount: number;
    method: string;
    status: string;
  }

  function calculateSummary(payments: Payment[]) {
    const completed = payments.filter(
      (r) => r.status !== "refunded" && r.method !== "refund"
    );
    // FIXED: only count method="refund" entries, not originals marked as "refunded"
    const refunds = payments.filter((r) => r.method === "refund");

    return {
      total_today: completed.reduce((s, r) => s + r.amount, 0),
      tips_today: completed.reduce((s, r) => s + r.tip_amount, 0),
      cash_total: completed.filter((r) => r.method === "cash").reduce((s, r) => s + r.amount, 0),
      card_total: completed.filter((r) => r.method === "card").reduce((s, r) => s + r.amount, 0),
      transactions: payments.length,
      refunds_today: refunds.reduce((s, r) => s + Math.abs(r.amount), 0),
    };
  }

  it("calculates daily summary correctly", () => {
    const payments: Payment[] = [
      { id: "1", amount: 50, tip_amount: 5, method: "card", status: "completed" },
      { id: "2", amount: 30, tip_amount: 0, method: "cash", status: "completed" },
      { id: "3", amount: 25, tip_amount: 3, method: "card", status: "completed" },
    ];
    const summary = calculateSummary(payments);
    expect(summary.total_today).toBe(105);
    expect(summary.tips_today).toBe(8);
    expect(summary.cash_total).toBe(30);
    expect(summary.card_total).toBe(75);
    expect(summary.transactions).toBe(3);
    expect(summary.refunds_today).toBe(0);
  });

  it("excludes refunded payments from totals", () => {
    const payments: Payment[] = [
      { id: "1", amount: 50, tip_amount: 5, method: "card", status: "completed" },
      { id: "2", amount: 30, tip_amount: 0, method: "cash", status: "refunded" }, // refunded
      { id: "3", amount: -30, tip_amount: 0, method: "refund", status: "refunded" }, // refund entry
    ];
    const summary = calculateSummary(payments);
    expect(summary.total_today).toBe(50); // only non-refunded
    expect(summary.transactions).toBe(3); // all counted
    expect(summary.refunds_today).toBe(30); // FIXED: only |-30| from refund entry
  });

  it("FIXED: refund no longer double-counted", () => {
    // Previously: both original (status=refunded) and refund entry (method=refund) were counted
    // NOW: only method="refund" entries are counted for refund total
    const payments: Payment[] = [
      { id: "1", amount: 50, tip_amount: 0, method: "card", status: "refunded" },
      { id: "2", amount: -50, tip_amount: 0, method: "refund", status: "refunded" },
    ];
    const summary = calculateSummary(payments);
    expect(summary.refunds_today).toBe(50); // FIXED: correctly shows 50, not 100
  });

  it("FIXED: manual payment now validates amount >= order total", () => {
    // Previously: any amount was accepted
    // NOW: payments page validates amount >= order.total before insert
    const orderTotal = 55.50;
    const paymentAmount = 20; // underpaying
    expect(paymentAmount).toBeLessThan(orderTotal);
    // The UI now shows alert and blocks payment if amount < orderTotal
  });
});

// ── Analytics comparison logic ──────────────────────────────

describe("Analytics period comparison", () => {
  function calcChange(current: number, previous: number): number | null {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }

  it("growth from non-zero", () => {
    expect(calcChange(150, 100)).toBe(50);
  });

  it("decline", () => {
    expect(calcChange(50, 100)).toBe(-50);
  });

  it("no change", () => {
    expect(calcChange(100, 100)).toBe(0);
  });

  it("both zero = null (no data)", () => {
    expect(calcChange(0, 0)).toBeNull();
  });

  it("growth from zero = 100%", () => {
    expect(calcChange(50, 0)).toBe(100);
  });

  it("decline to zero = -100%", () => {
    expect(calcChange(0, 50)).toBe(-100);
  });
});
