import { defineConfig } from 'vitest/config'
import { loadEnvConfig } from '@next/env'
import path from 'path'

loadEnvConfig(process.cwd())

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules'],
  },
})
