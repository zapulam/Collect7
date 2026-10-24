import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/Collect7/', // GitHub Pages serves the site under the repo name
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.js'],
  },
})
