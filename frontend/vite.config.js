import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No /api proxy: services/api.js talks to VITE_API_BASE_URL directly, so the
// proxy never fired. Cross-origin requests are handled by the backend's CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
});
