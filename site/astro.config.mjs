// @ts-check
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:8080',
  output: 'static',
  // shared/ leży poza katalogiem site/ – dev server Vite musi mieć do niego dostęp
  vite: { server: { fs: { allow: ['..'] } } },
})
