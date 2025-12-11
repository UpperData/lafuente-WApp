import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT || env.PORT || 5173);
  const shouldOpen = String(env.VITE_OPEN ?? 'false').toLowerCase() === 'true';

  return {
    plugins: [react()],
    server: {
      allowedHosts: ['esw.truo.co','localhost'],
      port, strictPort: true, open: shouldOpen,
      proxy: {
        '/masters': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/transactions': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/datatoken': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/bank-accounts': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/accounts': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/services': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        '/boxes': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
        'clients': {
          target: 'http://135.148.60.85:1750',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: { port, strictPort: true, open: shouldOpen },
  };
});
