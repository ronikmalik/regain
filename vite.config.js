import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS is required for real sensors: iOS only exposes motion data on secure origins.
// NO_HTTPS=1 serves plain http for desktop work with the ?sim=1 simulator.
// GH_PAGES=1 (set by the deploy workflow) builds for https://<user>.github.io/regain/.
const https = !process.env.NO_HTTPS;
export default defineConfig({
  base: process.env.GH_PAGES ? '/regain/' : '/',
  plugins: https ? [basicSsl()] : [],
  server: { https, port: 5173 },
});
