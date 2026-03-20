type DayHours = { open?: string; close?: string; closed?: boolean };
type BusinessHours = Record<string, DayHours>;
const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
export function isOpenNow(businessHours: BusinessHours | null | undefined, timezone?: string): boolean {
  if (!businessHours) return true;
  const now = timezone ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone })) : new Date();
  const dayName = DAY_NAMES[now.getDay()];
  const todayH = businessHours[dayName];
  if (!todayH || todayH.closed) return false;
  if (!todayH.open || !todayH.close) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oH, oM] = todayH.open.split(":").map(Number);
  const [cH, cM] = todayH.close.split(":").map(Number);
  const openMin = oH * 60 + oM;
  const closeMin = cH * 60 + cM;
  if (closeMin < openMin) return nowMin >= openMin || nowMin <= closeMin;
  return nowMin >= openMin && nowMin <= closeMin;
}
