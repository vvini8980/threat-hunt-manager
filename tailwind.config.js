module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-base)",
          secondary: "var(--bg-surface)",
          card: "var(--bg-surface)",
          hover: "var(--color-muted)"
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          hover: "var(--accent-secondary)",
          glow: "var(--accent-primary)"
        },
        status: {
          planned: "var(--semantic-pending)",
          active: "var(--accent-primary)",
          pending: "var(--semantic-pending)",
          completed: "var(--semantic-completed)",
          closed: "var(--color-muted)",
          critical: "var(--semantic-critical)",
          inactive: "var(--semantic-inactive)"
        },
        result: {
          tp: "var(--semantic-completed)",
          fp: "var(--semantic-critical)",
          undetermined: "var(--semantic-pending)"
        },
        border: "var(--color-muted)",
        textprimary: "#f8fafc",
        textsecondary: "#cbd5e1",
        textmuted: "var(--color-muted)"
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      }
    },
  },
  plugins: []
}
