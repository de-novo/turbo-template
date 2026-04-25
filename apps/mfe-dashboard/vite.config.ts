import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/register.tsx",
			fileName: () => "remote-entry.js",
			formats: ["es"],
		},
		outDir: "dist",
		rollupOptions: {
			external: [],
		},
	},
	plugins: [react()],
	server: {
		cors: true,
		port: 3101,
		strictPort: true,
	},
});
