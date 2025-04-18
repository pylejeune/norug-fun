// front/tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: "class", // Required for shadcn dark mode
  content: [
    // Adjust these paths based on your actual project structure
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Tailwind v4 often uses CSS variables defined in globals.css for theme
  // You might not need extensive theme overrides here unless customizing heavily
  // plugins: [require("tailwindcss-animate")], // This might be needed depending on shadcn version/setup
}

export default config 