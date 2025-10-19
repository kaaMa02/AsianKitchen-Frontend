// src/components/common/CellPopover.tsx
import React from "react";

export default function CellPopover({ label, children }:{
  label: string; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: "transparent", border: "none", color: "#0ea5e9", cursor: "pointer", padding: 0
      }}>{label}</button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 20, top: "120%", left: 0,
          background: "#fff", border: "1px solid #ddd", borderRadius: 8,
          boxShadow: "0 10px 25px rgba(0,0,0,0.12)", width: 320, padding: 12
        }}>
          {children}
        </div>
      )}
    </div>
  );
}