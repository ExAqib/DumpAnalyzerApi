import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': 'http://localhost:5168',
      '/auth': 'http://localhost:5168',
      '/ncache': 'http://localhost:5168',
    },
  },
})
