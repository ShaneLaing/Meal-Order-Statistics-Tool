import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Vite automatically exposes env vars prefixed with VITE_ via import.meta.env.
// See src/config.ts for the consumer (VITE_APP_SCRIPT_WEB_APP_URL).
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  base: '/Meal-Order-Statistics-Tool/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // DISABLE_HMR=true 用於 AI Studio 等環境
    hmr: process.env.DISABLE_HMR !== 'true',
  },
}));
