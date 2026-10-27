import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev') },
  plugins: [react()],
  test: { environment: 'node', setupFiles: ['./src/lib/test-setup.ts'] },
})
