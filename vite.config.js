import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT);
  const shouldOpen = String(env.VITE_OPEN ?? 'false').toLowerCase() === 'true';

  return {
    plugins: [react()],
    server: { 
      allowedHosts: [
      'esw.truo.co',   // Servidor de desarrollo upperdata
      'localhost',
      '127.0.0.1',     // Servidor local
      'wa.cambioslafuentelg.com', // Servidor de produccion
      'bk.cambioslafuentelg.com', // Servidor backend
      'cambioslafuentelg.com'
    ],
    port, 
    strictPort: true, 
    open: shouldOpen },
    preview: { 
      port, 
      strictPort: true, 
      open: shouldOpen 
    },
  };
});
