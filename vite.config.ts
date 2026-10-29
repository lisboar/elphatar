import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

const CORPOS = ['humanoide', 'criatura']

/** Confere o formato antes de gravar: um JSON quebrado derrubaria o overlay. */
function problemaNosDados(dados: unknown): string | null {
  const tipos = (dados as { tipos?: unknown }).tipos
  if (!Array.isArray(tipos) || tipos.length === 0) return 'sem tipos'
  for (const t of tipos) {
    const { nome, caixa, partes } = t ?? {}
    if (typeof nome !== 'string' || !caixa || !Array.isArray(partes)) return 'tipo mal formado'
    for (const p of partes) {
      for (const vista of ['frente', 'lado']) {
        const m = p?.[vista]
        if (!Array.isArray(m) || m.length !== caixa.altura) return `${nome}/${p?.nome}/${vista}: altura`
        if (m.some((l: unknown) => typeof l !== 'string' || l.length !== caixa.largura)) {
          return `${nome}/${p?.nome}/${vista}: largura`
        }
      }
    }
  }
  return null
}

/**
 * Deixa o Editor de partes gravar `src/sprites/dados/<corpo>.json`.
 * Só existe no `npm run dev`: o build do Pages não tem como escrever nada.
 */
function editorDePartes(): Plugin {
  return {
    name: 'editor-de-partes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__editor/salvar', (req, res) => {
        const corpo = (req.url ?? '').replace(/^\//, '')
        if (req.method !== 'POST' || !CORPOS.includes(corpo)) {
          res.statusCode = 400
          res.end('pedido invalido')
          return
        }
        let corpoDoPedido = ''
        req.setEncoding('utf8')
        req.on('data', (parte: string) => (corpoDoPedido += parte))
        req.on('end', () => {
          try {
            const dados = JSON.parse(corpoDoPedido)
            const problema = problemaNosDados(dados)
            if (problema) throw new Error(problema)
            const arquivo = resolve(server.config.root, `src/sprites/dados/${corpo}.json`)
            writeFileSync(arquivo, JSON.stringify(dados, null, 2) + '\n')
            res.end('ok')
          } catch (e) {
            res.statusCode = 422
            res.end(String(e instanceof Error ? e.message : e))
          }
        })
      })
    },
  }
}

// base: o overlay é servido em https://lisboar.github.io/elphatar/
export default defineConfig({
  base: '/elphatar/',
  plugins: [editorDePartes()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        // overlay = o que entra no OBS
        overlay: 'index.html',
        // laboratorio = página de desenvolvimento das partes (Etapa 1)
        laboratorio: 'laboratorio.html',
        // o editor (editor.html) fica fora do build: ele só salva no dev
      },
    },
  },
})
