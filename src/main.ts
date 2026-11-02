import { ambiente } from './config/ambiente'
import { config } from './config/config'
import { manterSessao } from './core/sessao'
import { acompanharAjustes, ouvirPrevia } from './core/sincronia'
import { buscarSkin } from './core/servicos'
import { ChatTwitch } from './chat/twitch'
import type { FonteDeChat } from './chat/fonte'
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

const modoTeste = ambiente.teste || ambiente.falsos > 0

if (ambiente.previa) ouvirPrevia()
else acompanharAjustes()

if (modoTeste) {
  const { montarPainel } = await import('./core/painel')
  montarPainel(cena, () => fps, ambiente.falsos, () => custo)
  // na prévia do painel de controle os botões de teste ficam escondidos
  if (ambiente.previa) document.body.classList.add('previa')
}

// No teste o chat real só liga com ?chat=1, e a sessão não é salva, para os
// viewers falsos não voltarem no OBS.
const usarChat = ambiente.chat === null ? !modoTeste : ambiente.chat === '1'

if (usarChat) {
  const canal = (ambiente.canal || config.canal).toLowerCase()
  if (!modoTeste) manterSessao(canal, cena)

  const chat: FonteDeChat = new ChatTwitch(canal)
  chat.conectar((mensagem) => {
    if (mensagem.mod && mensagem.texto.toLowerCase() === config.comandoLimpar) {
      cena.limpar()
      return
    }

    const novo = !cena.obter(mensagem.login)
    const avatar = cena.entrar(mensagem.login, mensagem.nome)
    if (!avatar) return

    // comandos (Etapa 5) fazem o avatar entrar, mas não viram balão
    if (!mensagem.texto.startsWith('!')) avatar.falar(mensagem.texto)

    // primeira mensagem na live: entra com a skin do nome e troca pela salva, se houver
    if (novo && mensagem.id) {
      avatar.twitchId = mensagem.id
      void buscarSkin(mensagem.id).then((skin) => {
        if (skin) avatar.trocarSkin(skin)
      })
    }
  })
}
