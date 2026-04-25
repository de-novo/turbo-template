import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		outDir: "dist",
	},
	plugins: [react(), tailwindcss()],
	server: {
		port: 3100,
		strictPort: true,
	},
});
