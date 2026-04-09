import React from "react";

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number;
}

export default function Overlay({ children, onClose, maxWidth = 540 }: OverlayProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "1.5rem", width: "100%",
          maxWidth, maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface DrawerProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function Drawer({ children, onClose }: DrawerProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "flex-end", zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)", borderLeft: "1px solid var(--border)",
          width: "100%", maxWidth: 520, height: "100%",
          overflowY: "auto", padding: "1.5rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}
