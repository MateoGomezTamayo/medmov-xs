import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The page reads the same JSON knowledge base and cases as the Python engine (one source of truth).
const up = p => fileURLToPath(new URL(`../${p}`, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@knowledge': up('knowledge'), '@cases': up('cases') } },
  server: { fs: { allow: ['..'] } },
})
