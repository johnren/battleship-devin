/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/battleship-devin/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
