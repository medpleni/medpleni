export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "clamp(40px, 6vw, 72px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "var(--white)" }}>Med</span>
        <span style={{ color: "var(--pulso)" }}>Pleni</span>
      </div>

      {/* Eyebrow */}
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "11px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--pulso)",
        }}
      >
        // setup concluído — plataforma em construção
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily: "var(--font-serif), serif",
          fontStyle: "italic",
          fontSize: "18px",
          color: "var(--chumbo)",
          textAlign: "center",
          maxWidth: "480px",
          lineHeight: 1.6,
        }}
      >
        Medicina com propósito. Tecnologia com precisão.
      </p>

      {/* Stack badge */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: "8px",
        }}
      >
        {["Next.js 15", "TypeScript", "Tailwind CSS", "App Router"].map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "var(--r-full)",
              background: "rgba(0,194,168,0.1)",
              color: "var(--pulso)",
              border: "1px solid rgba(0,194,168,0.2)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </main>
  );
}
