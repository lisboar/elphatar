import { ambiente } from './config/ambiente'
import { criarPalco, iniciarLaco } from './core/palco'
import { criarDiagnostico } from './core/diagnostico'

const canvas = document.getElementById('cena') as HTMLCanvasElement | null
if (!canvas) throw new Error('Canvas #cena não encontrado.')

const ctx = criarPalco(canvas)
const diagnostico = ambiente.debug ? criarDiagnostico() : null

iniciarLaco((delta) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  diagnostico?.(ctx, delta)
  // Etapa 2: desenho dos avatares entra aqui.
})
