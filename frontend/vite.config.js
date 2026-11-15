import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // The privacy policy and terms pages show this address; Google verification needs a working contact.
  if (command === 'build' && !(env.VITE_CONTACT_EMAIL || '').trim()) {
    throw new Error('VITE_CONTACT_EMAIL is not set. Add it to the environment (e.g. Vercel project settings) before building.')
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
