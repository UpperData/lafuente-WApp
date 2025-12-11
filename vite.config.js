import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT || env.PORT || 5173);
  const shouldOpen = String(env.VITE_OPEN ?? 'false').toLowerCase() === 'true';

  return {
    plugins: [react()],
    server: { 
      allowedHosts: [
      'esw.truo.co',   // Servidor de desarrollo upperdata
      'localhost',     // Servidor local
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
