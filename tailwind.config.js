module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0f1117",
          secondary: "#1a1d27",
          card: "#1e2130",
          hover: "#252840"
        },
        accent: {
          primary: "#6366f1",
          hover: "#4f46e5",
          glow: "#818cf8"
        },
        status: {
          planned: "#f59e0b",
          active: "#3b82f6",
          pending: "#a855f7",
          completed: "#10b981",
          closed: "#6b7280"
        },
        result: {
          tp: "#10b981",
          fp: "#ef4444",
          undetermined: "#f59e0b"
        },
        border: "#2a2d3e",
        textprimary: "#e2e8f0",
        textsecondary: "#94a3b8"
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"]
      }
    },
  },
  plugins: []
}
