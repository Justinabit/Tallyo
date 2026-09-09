import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import build from '@hono/vite-build/cloudflare-pages'

export default defineConfig({
  publicDir: 'public',

  plugins: [
    build(),
    devServer({
      entry: 'src/index.tsx',
      adapter
    })
  ]
})