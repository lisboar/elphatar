import { config } from '../config/config'
import type { Direcao } from '../sprites/render'

/**
 * Animação de chegada de um avatar novo. Uma por avatar, sorteada entre as
 * de `config.chegada.tipos`.
 *
 * - paraquedas: desce do alto da tela balançando, pousa e o paraquedas murcha
 * - portal: um portal neon vertical abre ao lado e o avatar sai andando dele
 * - faiscas: faíscas rosa se juntam no lugar e formam o avatar
 *
 * Enquanto chega, o avatar não anda sozinho e o balão espera.
 */

export type TipoDeChegada = 'paraquedas' | 'portal' | 'faiscas'

/** Como o avatar aparece neste instante, relativo à posição final dele. */
export interface Pose {
  dx: number
  dy: number
  alpha: number
  andando: boolean
  direcao: Direcao
  quadro: number
  /** Só desenha o avatar do lado de cá desta linha (o portal "esconde" o resto). */
  recorte: { x: number; lado: 1 | -1 } | null
}

interface Faisca {
  angulo: number
  raio: number
  giro: number
  tamanho: number
  cor: string
  atraso: number
}

const suave = (t: number) => t * t * (3 - 2 * t)
const saida = (t: number) => 1 - (1 - t) ** 3
const entre = (t: number, de: number, ate: number) => Math.min(1, Math.max(0, (t - de) / (ate - de)))

// ---------- desenhos prontos (feitos uma vez por tamanho) ----------

const prontos = new Map<string, HTMLCanvasElement>()

function canvasPronto(chave: string, largura: number, altura: number, pintar: (ctx: CanvasRenderingContext2D) => void) {
  const existente = prontos.get(chave)
  if (existente) return existente
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(largura)
  canvas.height = Math.ceil(altura)
  pintar(canvas.getContext('2d')!)
  prontos.set(chave, canvas)
  return canvas
}

/** Cúpula do paraquedas: gomos alternando rosa e rosa claro, com contorno escuro. */
function cupula(tamanho: number): HTMLCanvasElement {
  const l = tamanho * 1.5
  const a = tamanho * 0.62
  return canvasPronto(`cupula${tamanho}`, l + 8, a + 8, (ctx) => {
    const cx = l / 2 + 4
    const base = a + 4
    const gomos = 6
    for (let i = 0; i < gomos; i++) {
      const de = Math.PI + (Math.PI / gomos) * i
      const ate = de + Math.PI / gomos
      ctx.beginPath()
      ctx.moveTo(cx, base)
      ctx.ellipse(cx, base, l / 2, a, 0, de, ate)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? config.cores.rosa : config.cores.rosaClaro
      ctx.fill()
    }
    // bainha ondulada embaixo
    ctx.beginPath()
    ctx.ellipse(cx, base, l / 2, a, 0, Math.PI, Math.PI * 2)
    for (let i = gomos; i >= 0; i--) {
      const x = cx - l / 2 + (l / gomos) * i
      if (i < gomos) ctx.quadraticCurveTo(x + l / gomos / 2, base - a * 0.18, x, base)
    }
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = config.cores.escuro
    ctx.stroke()
  })
}

/** Anel do portal, com brilho neon. Vertical: mais alto que largo. */
function anel(tamanho: number): HTMLCanvasElement {
  const brilho = 18
  const l = tamanho * 0.5 + brilho * 2
  const a = tamanho * 1.35 + brilho * 2
  return canvasPronto(`anel${tamanho}`, l, a, (ctx) => {
    const rx = l / 2 - brilho
    const ry = a / 2 - brilho
    ctx.shadowColor = config.cores.rosa
    ctx.shadowBlur = brilho
    ctx.lineWidth = 6
    ctx.strokeStyle = config.cores.rosa
    ctx.beginPath()
    ctx.ellipse(l / 2, a / 2, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
  })
}

/** Miolo do portal: escuro, roxo, um pouco transparente. */
function miolo(tamanho: number): HTMLCanvasElement {
  const l = tamanho * 0.5
  const a = tamanho * 1.35
  return canvasPronto(`miolo${tamanho}`, l, a, (ctx) => {
    const g = ctx.createRadialGradient(l / 2, a / 2, 2, l / 2, a / 2, a / 2)
    g.addColorStop(0, 'rgba(255, 79, 176, 0.55)')
    g.addColorStop(0.6, 'rgba(60, 10, 70, 0.85)')
    g.addColorStop(1, 'rgba(20, 10, 18, 0.9)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(l / 2, a / 2, l / 2, a / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}

// ---------- a chegada ----------

export class Chegada {
  readonly tipo: TipoDeChegada
  readonly duracao: number
  private tempo = 0
  /** Portal: 1 = abre à esquerda e o avatar sai andando para a direita. */
  private readonly lado: 1 | -1
  private readonly faiscas: Faisca[] = []

  /** `x`: onde o avatar vai ficar. O portal abre do lado que cabe na tela. */
  constructor(x: number, tipo?: TipoDeChegada) {
    const tipos = config.chegada.tipos
    this.tipo = tipo ?? tipos[Math.floor(Math.random() * tipos.length)]!
    this.duracao = Math.max(3, config.chegada.segundos[this.tipo])

    const folga = this.distanciaDoPortal(config.avatar) + config.avatar * 0.5
    const cabeEsquerda = x - folga > 0
    const cabeDireita = x + folga < config.tela.largura
    this.lado = cabeEsquerda && cabeDireita ? (Math.random() < 0.5 ? 1 : -1) : cabeEsquerda ? 1 : -1

    if (this.tipo === 'faiscas') {
      const cores = [config.cores.rosa, config.cores.rosaClaro, '#ffffff']
      for (let i = 0; i < config.chegada.faiscas; i++) {
        this.faiscas.push({
          angulo: Math.random() * Math.PI * 2,
          raio: 200 + Math.random() * 200,
          giro: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2),
          tamanho: 5 + Math.random() * 6,
          cor: cores[i % cores.length]!,
          atraso: Math.random() * 0.15,
        })
      }
    }
  }

  get acabou(): boolean {
    return this.tempo >= this.duracao
  }

  /** 0 a 1. */
  private get p(): number {
    return Math.min(1, this.tempo / this.duracao)
  }

  atualizar(segundos: number): void {
    this.tempo += segundos
  }

  pose(baseY: number, tamanho: number): Pose {
    const p = this.p
    const parado: Pose = { dx: 0, dy: 0, alpha: 1, andando: false, direcao: 'direita', quadro: -1, recorte: null }

    switch (this.tipo) {
      case 'paraquedas': {
        // desce até 80% do tempo, depois o paraquedas murcha
        const descida = saida(entre(p, 0, 0.8))
        const inicio = -(baseY + tamanho * 0.2)
        const balanco = Math.sin(this.tempo * 2.4) * 34 * (1 - descida)
        return { ...parado, dx: balanco, dy: inicio * (1 - descida) }
      }

      case 'portal': {
        // abre (0-20%), sai andando (20-80%), fecha (80-100%)
        const caminhada = suave(entre(p, 0.2, 0.8))
        const distancia = this.distanciaDoPortal(tamanho)
        const andando = p > 0.2 && p < 0.8
        return {
          ...parado,
          dx: -this.lado * (distancia + tamanho * 0.6) * (1 - caminhada),
          andando,
          direcao: this.lado === 1 ? 'direita' : 'esquerda',
          quadro: andando ? Math.floor(this.tempo / config.movimento.segundosPorQuadro) : -1,
          recorte: p < 0.8 ? { x: -this.lado * distancia, lado: this.lado } : null,
        }
      }

      case 'faiscas':
        // aparece enquanto as faíscas fecham (55-80%)
        return { ...parado, alpha: suave(entre(p, 0.55, 0.8)) }
    }
  }

  private distanciaDoPortal(tamanho: number): number {
    return tamanho * 1.5
  }

  /** Antes do avatar: miolo do portal, cordas e cúpula do paraquedas. */
  desenharAtras(ctx: CanvasRenderingContext2D, x: number, baseY: number, tamanho: number): void {
    const p = this.p
    const pose = this.pose(baseY, tamanho)

    if (this.tipo === 'portal') {
      const abertura = this.aberturaDoPortal()
      if (abertura <= 0) return
      const m = miolo(tamanho)
      const px = x - this.lado * this.distanciaDoPortal(tamanho)
      const cy = baseY - tamanho * 0.55
      ctx.save()
      ctx.globalAlpha = abertura
      ctx.translate(px, cy)
      ctx.scale(1, abertura)
      ctx.drawImage(m, -m.width / 2, -m.height / 2)
      ctx.restore()
    }

    if (this.tipo === 'paraquedas') {
      const murcha = entre(p, 0.8, 1)
      if (murcha >= 1) return
      const c = cupula(tamanho)
      const ax = x + pose.dx
      const topo = baseY + pose.dy - tamanho * 0.8
      const inclinacao = Math.cos(this.tempo * 2.4) * 0.12 * (1 - entre(p, 0, 0.8))
      ctx.save()
      ctx.globalAlpha = 1 - murcha
      ctx.translate(ax, topo)
      ctx.rotate(inclinacao)
      // ao pousar, a cúpula cai para o lado e encolhe
      ctx.translate(murcha * tamanho * 0.6 * this.lado, murcha * tamanho * 0.5)
      ctx.scale(1 - murcha * 0.4, 1 - murcha * 0.7)
      const cy = -tamanho * 0.75
      // cordas: da bainha até os ombros
      ctx.strokeStyle = config.cores.escuro
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (const f of [-0.48, -0.2, 0.2, 0.48]) {
        ctx.moveTo(f * c.width, cy)
        ctx.lineTo(Math.sign(f) * tamanho * 0.12, tamanho * 0.25)
      }
      ctx.stroke()
      ctx.drawImage(c, -c.width / 2, cy - c.height + 4)
      ctx.restore()
    }
  }

  /** Depois do avatar: anel do portal (passa por cima da borda) e faíscas. */
  desenharFrente(ctx: CanvasRenderingContext2D, x: number, baseY: number, tamanho: number): void {
    const p = this.p

    if (this.tipo === 'portal') {
      const abertura = this.aberturaDoPortal()
      if (abertura <= 0) return
      const a = anel(tamanho)
      const px = x - this.lado * this.distanciaDoPortal(tamanho)
      const cy = baseY - tamanho * 0.55
      ctx.save()
      ctx.globalAlpha = abertura
      ctx.translate(px, cy)
      ctx.scale(1, abertura)
      ctx.drawImage(a, -a.width / 2, -a.height / 2)
      // dois brilhos correndo pelo anel
      ctx.fillStyle = '#ffffff'
      for (const fase of [0, Math.PI]) {
        const t = this.tempo * 4 + fase
        ctx.beginPath()
        ctx.arc(Math.cos(t) * tamanho * 0.25, Math.sin(t) * tamanho * 0.675, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    if (this.tipo === 'faiscas') {
      const cx = x
      const cy = baseY - tamanho * 0.5
      const juntar = entre(p, 0, 0.65)
      const espalhar = entre(p, 0.65, 1)
      ctx.save()
      for (const f of this.faiscas) {
        // suave, não saida: com saida elas chegavam ao centro na metade do tempo
        const t = suave(entre(juntar, f.atraso, 1))
        const raio = espalhar > 0 ? tamanho * 0.15 + espalhar * f.raio * 0.35 : f.raio * (1 - t) + tamanho * 0.15
        const angulo = f.angulo + f.giro * (juntar + espalhar * 0.3)
        const brilho = espalhar > 0 ? 1 - espalhar : 0.5 + 0.5 * t
        const s = f.tamanho * (espalhar > 0 ? 1 - espalhar * 0.5 : 1)
        const fx = cx + Math.cos(angulo) * raio
        const fy = cy + Math.sin(angulo) * raio * 0.8
        // halo em volta + estrelinha de 4 pontas no meio
        ctx.globalAlpha = brilho * 0.35
        ctx.fillStyle = config.cores.rosa
        ctx.beginPath()
        ctx.arc(fx, fy, s * 1.3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = brilho
        ctx.fillStyle = f.cor
        ctx.beginPath()
        ctx.moveTo(fx, fy - s)
        ctx.lineTo(fx + s * 0.3, fy - s * 0.3)
        ctx.lineTo(fx + s, fy)
        ctx.lineTo(fx + s * 0.3, fy + s * 0.3)
        ctx.lineTo(fx, fy + s)
        ctx.lineTo(fx - s * 0.3, fy + s * 0.3)
        ctx.lineTo(fx - s, fy)
        ctx.lineTo(fx - s * 0.3, fy - s * 0.3)
        ctx.closePath()
        ctx.fill()
      }
      // clarão quando as faíscas se juntam
      const clarao = Math.max(0, 1 - Math.abs(p - 0.65) / 0.12)
      if (clarao > 0) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, tamanho * 0.9)
        g.addColorStop(0, `rgba(255, 214, 239, ${0.9 * clarao})`)
        g.addColorStop(1, 'rgba(255, 79, 176, 0)')
        ctx.globalAlpha = 1
        ctx.fillStyle = g
        ctx.fillRect(cx - tamanho, cy - tamanho, tamanho * 2, tamanho * 2)
      }
      ctx.restore()
    }
  }

  /** 0 = fechado, 1 = aberto. Abre nos primeiros 20%, fecha nos últimos 20%. */
  private aberturaDoPortal(): number {
    const p = this.p
    return saida(entre(p, 0, 0.2)) * (1 - suave(entre(p, 0.8, 1)))
  }
}
