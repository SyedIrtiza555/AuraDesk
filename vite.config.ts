/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { configDefaults } from 'vitest/config'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    // Claude Code session worktrees live under .claude/; never test them as part of this checkout
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  }
})
