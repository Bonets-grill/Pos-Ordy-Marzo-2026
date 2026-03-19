"use client";
import { useEffect } from "react";
import { initMonitor } from "./monitor";
export default function MonitorInit() {
  useEffect(() => { initMonitor(); }, []);
  return null;
}
