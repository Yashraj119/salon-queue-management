import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const { VITE_DEV_API_PROXY_TARGET } = loadEnv(mode, process.cwd(), '');
  const proxy = mode === 'development' && VITE_DEV_API_PROXY_TARGET
    ? {
        '/api': VITE_DEV_API_PROXY_TARGET,
        '/socket.io': { target: VITE_DEV_API_PROXY_TARGET, ws: true },
      }
    : undefined;

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
  };
});
