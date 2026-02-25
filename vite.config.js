import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.jsx"],
            refresh: true,
        }),
        react(),
    ],
    server: {
        cors: true,
        headers: {
            "Cache-Control": "no-store",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "resources/js"),
        },
    },
    build: {
        target: "es2020",
        minify: "esbuild",
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("react-router-dom")) return "router";
                        if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react-vendor";
                        if (id.includes("lucide-react") || id.includes("@radix-ui") || id.includes("date-fns") || id.includes("react-day-picker")) return "ui-vendor";
                        return "vendor";
                    }
                },
                chunkFileNames: "js/[name]-[hash].js",
                entryFileNames: "js/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash][extname]",
            },
        },
        chunkSizeWarningLimit: 600,
    },
});
