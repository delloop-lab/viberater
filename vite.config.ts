import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  define: {
    'process.env': process.env
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.bin', '**/*.fbx', '**/*.mp3', '**/*.wav', '**/*.json', '**/models/*-shard*'],
}) 