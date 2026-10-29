import {
  ESCALA,
  GRADE,
  moldeCriatura,
  moldeHumanoide,
  slotDaParte,
  type Caixa,
  type Matriz,
  type Parte,
  type Passada,
  type Vista,
} from './molde'
import { bocaAberta } from './partes/humanoide'
import { BRANCO, CINZA, CONTORNO, rampa, type Rampa } from './cores'
import { paletas } from './paletas'
import { catalogo } from './catalogo'
import { chaveDaSkin, type Skin } from './skin'
import { pose, type Deslocamento } from './animacao'

/**
 * Desenho dos sprites.
 *
 * Nada é desenhado pixel a pixel por quadro: cada combinação de skin, vista e
 * direção é rasterizada uma vez num canvas e guardada em cache. No overlay
 * cada avatar é um `drawImage` — é o que mantém o custo baixo com o Valorant
 * rodando ao lado.
 */

/** Para onde o avatar olha. 'esquerda' é o desenho de lado espelhado. */
export type Direcao = 'direita' | 'esquerda'

interface Cores {
  readonly principal: Rampa
  readonly extra1: Rampa | null
  readonly extra2: Rampa | null
}

function corDoCaractere(c: string, cores: Cores): string | null {
  switch (c) {
    case '.':
      return null
    case 'k':
      return CONTORNO
    case 'w':
      return BRANCO
    case 's':
      return CINZA
    case '2':
      return cores.principal.sombra
    case '3':
      return cores.principal.luz
    case 'a':
      return cores.extra1?.base ?? cores.principal.base
    case 'b':
      return cores.extra1?.sombra ?? cores.principal.sombra
    case 'c':
      return cores.extra1?.luz ?? cores.principal.luz
    case 'd':
      return cores.extra2?.base ?? cores.principal.base
    case 'e':
      return cores.extra2?.sombra ?? cores.principal.sombra
    case 'f':
      return cores.extra2?.luz ?? cores.principal.luz
    default:
      return cores.principal.base
  }
}

/** A perna de trás: a mesma rampa, um tom abaixo. */
function escurecer(r: Rampa | null): Rampa | null {
  return r && { base: r.sombra, sombra: r.sombra, luz: r.base }
}

interface Recorte {
  readonly linhaDe: number
  readonly linhaAte: number
  readonly colunaDe: number
  readonly colunaAte: number
  /** Colunas da borda da faixa que viram contorno. */
  readonly bordas?: readonly number[]
}

function pintar(
  ctx: CanvasRenderingContext2D,
  matriz: Matriz,
  caixa: Caixa,
  cores: Cores,
  escala: number,
  recorte: Recorte,
  ox: number,
  oy: number,
): void {
  for (let y = recorte.linhaDe; y < recorte.linhaAte; y++) {
    const linha = matriz[y]!
    for (let x = recorte.colunaDe; x < recorte.colunaAte; x++) {
      const c = linha[x]!
      if (c === '.') continue
      const cor = recorte.bordas?.includes(x) ? CONTORNO : corDoCaractere(c, cores)
      if (!cor) continue

      // arredonda as duas bordas: com escala fracionária cada pixel da arte
      // vira 2 ou 3 da tela, sem fresta entre eles
      const x0 = Math.round((caixa.x + x + ox) * escala)
      const y0 = Math.round((caixa.y + y + oy) * escala)
      const x1 = Math.round((caixa.x + x + ox + 1) * escala)
      const y1 = Math.round((caixa.y + y + oy + 1) * escala)
      ctx.fillStyle = cor
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    }
  }
}

function desenharMatriz(
  ctx: CanvasRenderingContext2D,
  matriz: Matriz,
  caixa: Caixa,
  cores: Cores,
  escala: number,
  desl?: Deslocamento,
): void {
  const dx = desl?.dx ?? 0
  const dy = desl?.dy ?? 0
  const altura = matriz.length
  const largura = matriz[0]?.length ?? 0
  const pernasDe = desl?.pernasDe ?? altura

  pintar(ctx, matriz, caixa, cores, escala, {
    linhaDe: 0,
    linhaAte: pernasDe,
    colunaDe: 0,
    colunaAte: largura,
  }, dx, dy)
  if (!desl || pernasDe >= altura) return

  const pernas = { linhaDe: pernasDe, linhaAte: altura }

  if (desl.eco) {
    const escuro = {
      principal: escurecer(cores.principal)!,
      extra1: escurecer(cores.extra1),
      extra2: escurecer(cores.extra2),
    }
    pintar(ctx, matriz, caixa, escuro, escala, { ...pernas, colunaDe: 0, colunaAte: largura },
      dx + (desl.eco.dx ?? 0), dy + (desl.eco.dy ?? 0))
  }

  const faixas = desl.faixas ?? [{}]
  const explicitos = desl.cortes !== undefined
  const cortes = desl.cortes ?? (faixas.length > 1 ? [Math.floor(largura / 2)] : [])
  const limites = [0, ...cortes, largura]

  faixas.forEach((f, i) => {
    const de = limites[i] ?? 0
    // a faixa leva junto a coluna do corte, para cada perna ter a sua borda
    const ate = i < cortes.length ? (limites[i + 1] ?? largura) + 1 : largura
    pintar(ctx, matriz, caixa, cores, escala, {
      ...pernas,
      colunaDe: de,
      colunaAte: ate,
      bordas: explicitos ? [de, ate - 1].filter((c) => c > 0 && c < largura - 1) : undefined,
    }, dx + (f.dx ?? 0), dy + (f.dy ?? 0))
  })
}

function coresDaParte(parte: Parte, skin: Skin, tipo: string): Cores {
  const extra1 = parte.extra1 ? rampa(parte.extra1) : null
  const extra2 = parte.extra2 ? rampa(parte.extra2) : null

  if (parte.fixa) {
    return { principal: rampa(parte.fixa), extra1, extra2 }
  }

  const slot = slotDaParte[tipo as keyof typeof slotDaParte]
  const paleta = paletas[slot]
  const hex = paleta[skin.cores[slot] % paleta.length]!.hex
  return { principal: rampa(hex), extra1, extra2 }
}

/**
 * Folga em volta do desenho, em pixels da arte. A caminhada sobe o corpo e
 * desloca as pernas: sem folga, o chapéu e a auréola eram cortados no topo.
 */
export const MARGEM = 2

/** Desenha a skin num contexto já posicionado, sem cache. */
export function desenharSkin(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  vista: Vista = 'frente',
  escala = ESCALA,
  quadro = -1,
  falando = false,
): void {
  const molde = skin.tipo === 'humanoide' ? moldeHumanoide : moldeCriatura
  const partes = catalogo[skin.tipo]

  // Object.entries segue a ordem de declaração do molde: de trás pra frente.
  // Antes disso vêm as partes marcadas `atras`, que não podem cobrir o corpo.
  const camadas: { parte: Parte; caixa: Caixa; tipo: string }[] = []
  const passadas: Record<string, Passada> = {}

  for (const [tipo, caixa] of Object.entries(molde)) {
    const lista = partes[tipo as keyof typeof partes] as readonly Parte[]
    const indice = skin.partes[tipo as keyof typeof skin.partes] ?? 0
    // a boca aberta não é escolha do viewer: aparece só enquanto há balão
    const parte = tipo === 'boca' && falando ? bocaAberta : lista[indice % lista.length]
    if (!parte) continue
    if (parte.passada) passadas[tipo] = parte.passada

    const camada = { parte, caixa, tipo }
    if (parte.atras) camadas.unshift(camada)
    else camadas.push(camada)
  }

  // De perfil, o braço da frente fica por cima da roupa — é o braço mais
  // perto de quem olha. De frente é o contrário: a manga cobre o ombro.
  if (vista === 'lado') {
    const i = camadas.findIndex((c) => c.tipo === 'bracos')
    if (i >= 0) camadas.push(...camadas.splice(i, 1))
  }

  const alturaCorpo = camadas.find((c) => c.tipo === 'corpo')?.caixa.altura ?? 0
  const poseAtual = pose(skin.tipo, vista, quadro, alturaCorpo, passadas)

  for (const { parte, caixa, tipo } of camadas) {
    const matriz = vista === 'lado' ? parte.lado : parte.frente
    desenharMatriz(ctx, matriz, caixa, coresDaParte(parte, skin, tipo), escala, poseAtual[tipo])
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/**
 * Limite do cache. Cada entrada é um canvas de 104x104 (~43 KB).
 *
 * O pior caso é cada avatar da cena com a sua skin: 1 sprite parado mais um
 * por quadro de caminhada, e o mesmo de novo com a boca aberta. O lado
 * esquerdo não entra na conta porque é espelhado na hora de desenhar.
 */
const LIMITE_CACHE = 660

/** Lado do sprite rasterizado, em pixels da tela, já com a margem. */
export function ladoDoSprite(escala: number): number {
  return Math.round((GRADE + MARGEM * 2) * escala)
}

/**
 * Devolve a skin rasterizada e pronta para `drawImage`. O canvas tem
 * `MARGEM` pixels da arte de folga em cada lado.
 */
export function spriteDaSkin(
  skin: Skin,
  vista: Vista = 'frente',
  escala = ESCALA,
  quadro = -1,
  falando = false,
): HTMLCanvasElement {
  const boca = falando && skin.tipo === 'humanoide'
  const chave = `${chaveDaSkin(skin)}@${vista}@${escala}@${quadro}@${boca ? 1 : 0}`
  const pronto = cache.get(chave)
  if (pronto) return pronto

  const canvas = document.createElement('canvas')
  canvas.width = ladoDoSprite(escala)
  canvas.height = ladoDoSprite(escala)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível ao rasterizar a skin.')
  ctx.imageSmoothingEnabled = false
  const folga = Math.round(MARGEM * escala)
  ctx.translate(folga, folga)
  desenharSkin(ctx, skin, vista, escala, quadro, boca)

  if (cache.size >= LIMITE_CACHE) {
    const primeira = cache.keys().next()
    if (!primeira.done) cache.delete(primeira.value)
  }
  cache.set(chave, canvas)
  return canvas
}

export function limparCacheDeSprites(): void {
  cache.clear()
}

/** Desenha uma parte sozinha, na posição que ela ocupa no molde. Usado no Laboratório. */
export function desenharParte(
  ctx: CanvasRenderingContext2D,
  tipoCorpo: 'humanoide' | 'criatura',
  tipoParte: string,
  indice: number,
  skin: Skin,
  vista: Vista = 'frente',
  escala = ESCALA,
): void {
  const molde = tipoCorpo === 'humanoide' ? moldeHumanoide : moldeCriatura
  const caixa = molde[tipoParte as keyof typeof molde]
  if (!caixa) return

  const lista = catalogo[tipoCorpo][
    tipoParte as keyof (typeof catalogo)[typeof tipoCorpo]
  ] as readonly Parte[]
  const parte = lista[indice % lista.length]
  if (!parte) return

  const matriz = vista === 'lado' ? parte.lado : parte.frente
  desenharMatriz(ctx, matriz, caixa, coresDaParte(parte, skin, tipoParte), escala)
}
