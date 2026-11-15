import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // En GitHub Pages la app vive en /Lunar_Landing/
  base: command === 'build' ? '/Lunar_Landing/' : '/',
  plugins: [react()],
}))
