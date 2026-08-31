import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * Node is the default environment: most of what is worth testing here is the
 * sync pipeline's pure transforms. Component tests opt into a DOM with a
 * `@vitest-environment jsdom` docblock at the top of the file.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@skkuverse/tokens': fileURLToPath(new URL('./src/sds/tokens/index.ts', import.meta.url)),
      '@sds': fileURLToPath(new URL('./src/sds', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    globals: false
  }
})
