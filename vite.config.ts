import { defineConfig } from 'vite'

// base: o overlay é servido em https://lisboar.github.io/elphatar/
export default defineConfig({
  base: '/elphatar/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        // overlay = o que entra no OBS
        overlay: 'index.html',
        // laboratorio = página de desenvolvimento das partes (Etapa 1)
        laboratorio: 'laboratorio.html',
      },
    },
  },
})
