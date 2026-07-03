import {defineConfig, envField} from 'astro/config'
import svelte from '@astrojs/svelte'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
  env: {
    schema: {
      INTERNAL_API_URL: envField.string({ context: 'server', access: 'secret', default: 'http://api:3000' }),
    },
  },
})
