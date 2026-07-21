import Link from "next/link";

// Shown when a /s/<token> link doesn't resolve (rotated or invalid).
export default function ShareNotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: "100vh",
        background: "var(--canvas-bg)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
        This link is no longer valid
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 360 }}>
        The board may have been unshared or a new link was generated.
      </div>
      <Link
        href="/"
        style={{
          marginTop: 8,
          fontSize: 14,
          fontWeight: 600,
          color: "#fff",
          background: "var(--accent-blue)",
          borderRadius: 8,
          padding: "9px 16px",
          textDecoration: "none",
        }}
      >
        Go to Plan
      </Link>
    </div>
  );
}
