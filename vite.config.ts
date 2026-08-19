import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,  // Different port from your Next.js app (3000)
    host: true,  // Phone can open this machine's LAN IP (HTTPS still needed off localhost)
    open: false,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
