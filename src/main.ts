import { ambiente } from './config/ambiente'
import { criarPalco, iniciarLaco } from './core/palco'
import { criarDiagnostico } from './core/diagnostico'
import { Cena } from './core/cena'
import { validarCatalogo } from './sprites/catalogo'

const canvas = document.getElementById('cena') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas #cena não encontrado.')

const ctx = criarPalco(canvas)
const cena = new Cena()
const diagnostico = ambiente.debug ? criarDiagnostico() : null

if (ambiente.debug) {
  const erros = validarCatalogo()
  if (erros.length > 0) console.error('Catálogo com problema:', erros)
}

let fps = 0
let quadros = 0
let acumulado = 0
let custo = 0
let custoAcumulado = 0

iniciarLaco((delta) => {
  const comeco = performance.now()

  cena.atualizar(delta)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  cena.desenhar(ctx)
  diagnostico?.(ctx, delta)

  // quanto tempo de CPU um quadro custa. Mais honesto que o fps: o navegador
  // limita o fps a 60 mesmo quando sobra folga, e no OBS o que pesa é isto.
  quadros++
  acumulado += delta
  custoAcumulado += performance.now() - comeco
  if (acumulado >= 500) {
    fps = Math.round((quadros * 1000) / acumulado)
    custo = Math.round((custoAcumulado / quadros) * 100) / 100
    quadros = 0
    acumulado = 0
    custoAcumulado = 0
  }
})

if (ambiente.teste || ambiente.falsos > 0) {
  const { montarPainel } = await import('./core/painel')
  montarPainel(cena, () => fps, ambiente.falsos, () => custo)
}

// Etapa 3: o adaptador de chat entra aqui, chamando cena.entrar() e falar().
