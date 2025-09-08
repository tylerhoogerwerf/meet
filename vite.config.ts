import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          livekit: ['livekit-client', '@livekit/components-react'],
        },
      },
    },
  },
  define: {
    // Replace process.env with import.meta.env for Vite
    'process.env': 'import.meta.env',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'livekit-client'],
    exclude: ['@livekit/track-processors'],
  },
})
