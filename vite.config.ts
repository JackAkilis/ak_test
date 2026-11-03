import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    // 接真实后端时：把 VITE_USE_MOCK 设为 false，并在这里（或 VITE_API_BASE_URL）指向后端。
    proxy: process.env.VITE_PROXY_TARGET
      ? { '/api': { target: process.env.VITE_PROXY_TARGET, changeOrigin: true } }
      : undefined,
  },
  build: {
    sourcemap: true,
  },
})
