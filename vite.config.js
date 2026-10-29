import { defineConfig } from 'vite';

const apiProxy = {
  '/api/v1': {
    target: 'https://suarakita-backend.vercel.app',
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
