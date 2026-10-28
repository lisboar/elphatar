import { config } from '../config/config'

/**
 * Textos da cena: o nome embaixo do avatar e o balão de fala.
 *
 * Os dois são desenhados uma vez num canvas próprio e guardados. Escrever
 * texto no canvas é caro; com 30 avatares na tela, refazer isso a cada quadro
 * seria o maior custo do overlay.
 */

const FONTE_NOME = `bold ${config.texto.tamanhoNome}px ${config.texto.familia}`
const FONTE_BALAO = `${config.texto.tamanhoBalao}px ${config.texto.familia}`

function contexto(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível ao desenhar texto.')
  return ctx
}

/** Nome do viewer, com contorno escuro para ler sobre qualquer cena. */
export function desenharNome(nome: string): HTMLCanvasElement {
  const medidor = document.createElement('canvas').getContext('2d')!
  medidor.font = FONTE_NOME
  const largura = Math.ceil(medidor.measureText(nome).width) + 8
  const altura = config.texto.tamanhoNome + 10

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura

  const ctx = contexto(canvas)
  ctx.font = FONTE_NOME
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = config.cores.escuro
  ctx.strokeText(nome, largura / 2, altura / 2)
  ctx.fillStyle = config.cores.rosaClaro
  ctx.fillText(nome, largura / 2, altura / 2)
  return canvas
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, maximo: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (ctx.measureText(tentativa).width <= maximo || !atual) {
      atual = tentativa
    } else {
      linhas.push(atual)
      atual = palavra
    }
    if (linhas.length >= config.balao.maximoDeLinhas) break
  }
  if (atual && linhas.length < config.balao.maximoDeLinhas) linhas.push(atual)
  return linhas
}

/** Balão de fala, com o rabicho apontando para baixo. */
export function desenharBalao(texto: string): HTMLCanvasElement {
  const medidor = document.createElement('canvas').getContext('2d')!
  medidor.font = FONTE_BALAO

  const linhas = quebrar(medidor, texto, config.balao.larguraMaxima)
  const larguraTexto = Math.max(...linhas.map((l) => medidor.measureText(l).width))
  const alturaLinha = config.texto.tamanhoBalao + 6

  const p = config.balao.respiro
  const largura = Math.ceil(larguraTexto) + p * 2
  const altura = linhas.length * alturaLinha + p * 2
  const rabicho = config.balao.rabicho

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura + rabicho

  const ctx = contexto(canvas)
  const r = config.balao.raio

  ctx.fillStyle = config.balao.fundo
  ctx.strokeStyle = config.balao.borda
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(1, 1, largura - 2, altura - 2, r)
  ctx.fill()
  ctx.stroke()

  // rabicho: um triângulo colado na base, apontando para o avatar
  ctx.beginPath()
  ctx.moveTo(largura / 2 - rabicho, altura - 2)
  ctx.lineTo(largura / 2, altura + rabicho - 2)
  ctx.lineTo(largura / 2 + rabicho, altura - 2)
  ctx.closePath()
  ctx.fillStyle = config.balao.fundo
  ctx.fill()
  ctx.strokeStyle = config.balao.borda
  ctx.stroke()
  // tampa a linha da borda que ficou atravessando a boca do rabicho
  ctx.beginPath()
  ctx.moveTo(largura / 2 - rabicho + 1, altura - 2)
  ctx.lineTo(largura / 2 + rabicho - 1, altura - 2)
  ctx.strokeStyle = config.balao.fundo
  ctx.stroke()

  ctx.font = FONTE_BALAO
  ctx.fillStyle = config.balao.texto
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  linhas.forEach((linha, i) => {
    ctx.fillText(linha, largura / 2, p + alturaLinha * i + alturaLinha / 2)
  })
  return canvas
}
