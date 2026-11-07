import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths: the app has no client-side routes, so it runs from any subpath (GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
});
