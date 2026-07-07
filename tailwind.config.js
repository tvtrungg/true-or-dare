/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 24px rgba(236, 72, 153, 0.38), 0 0 64px rgba(139, 92, 246, 0.2)",
        card: "0 0 30px rgba(236, 72, 153, 0.18), 0 18px 70px rgba(0, 0, 0, 0.72)",
      },
    },
  },
  plugins: [],
};
