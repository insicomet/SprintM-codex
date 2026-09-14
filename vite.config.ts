import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Override VITE_BASE_PATH for repository-specific GitHub Pages deployments.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? "/SprintM/",
  build: {
    outDir: "dist",
  },
});
