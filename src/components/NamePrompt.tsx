"use client";

import { useState } from "react";

const PRESENCE_COLORS = ["#2563EB", "#EC4899", "#14B8A6", "#F5D547", "#A78BFA", "#FB923C"];

// One-time name prompt on first board visit. Writes the presence identity to
// localStorage (read by getUserInfo in TldrawCanvas), then hands control back.
export default function NamePrompt({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("plan-user-name", trimmed);
    if (!localStorage.getItem("plan-user-color")) {
      localStorage.setItem(
        "plan-user-color",
        PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)]
      );
    }
    if (!localStorage.getItem("plan-user-id")) {
      localStorage.setItem("plan-user-id", "u" + Math.random().toString(36).slice(2));
    }
    onDone();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--canvas-bg)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "var(--shadow-float)",
          padding: 28,
          width: 340,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            What is your name
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Shown to others on the board
          </div>
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name"
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--surface-hover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            outline: "none",
          }}
        />
        <button
          onClick={submit}
          disabled={!name.trim()}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: "var(--accent-blue)",
            border: "none",
            borderRadius: 8,
            padding: "10px 12px",
            cursor: name.trim() ? "pointer" : "default",
            opacity: name.trim() ? 1 : 0.5,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
