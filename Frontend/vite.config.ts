import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const remoteApi = env.VITE_API_URL?.replace(/\/api\/?$/, '') || ''

  // Local: proxy /api → localhost Backend. If VITE_API_URL is set (e.g. Render), no proxy needed.
  const proxy = remoteApi
    ? undefined
    : {
        '/api/': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      open: false,
      proxy,
    },
    preview: {
      port: 5173,
      proxy,
    },
  }
})
