import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/traview/',  // <--- ★★★ 加上这一行 ★★★
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})