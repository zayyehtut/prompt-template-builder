import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import path from "path"
import tailwindcss from 'tailwindcss';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    // tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        manager: 'src/pages/manager.html',
        content: 'src/content/index.ts',
        background: 'src/background/service-worker.ts',
      },
    },
  },
}); 