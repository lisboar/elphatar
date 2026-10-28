import {
  ESCALA,
  GRADE,
  moldeCriatura,
  moldeHumanoide,
  slotDaParte,
  type Caixa,
  type Matriz,
  type Parte,
  type Vista,
} from './molde'
import { BRANCO, CINZA, CONTORNO, rampa, type Rampa } from './cores'
import { paletas } from './paletas'
import { catalogo } from './catalogo'
import { chaveDaSkin, type Skin } from './skin'

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

function desenharMatriz(
  ctx: CanvasRenderingContext2D,
  matriz: Matriz,
  caixa: Caixa,
  cores: Cores,
  escala: number,
): void {
  for (let y = 0; y < matriz.length; y++) {
    const linha = matriz[y]!
    for (let x = 0; x < linha.length; x++) {
      const cor = corDoCaractere(linha[x]!, cores)
      if (!cor) continue
      ctx.fillStyle = cor
      ctx.fillRect((caixa.x + x) * escala, (caixa.y + y) * escala, escala, escala)
    }
  }
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

/** Desenha a skin num contexto já posicionado, sem cache. */
export function desenharSkin(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  vista: Vista = 'frente',
  escala = ESCALA,
): void {
  const molde = skin.tipo === 'humanoide' ? moldeHumanoide : moldeCriatura
  const partes = catalogo[skin.tipo]

  // Object.entries segue a ordem de declaração do molde: de trás pra frente.
  // Antes disso vêm as partes marcadas `atras`, que não podem cobrir o corpo.
  const camadas: { parte: Parte; caixa: Caixa; tipo: string }[] = []
  let ancora = { x: 0, y: 0 }

  let aceitaAcessorio = true

  for (const [tipo, caixa] of Object.entries(molde)) {
    const lista = partes[tipo as keyof typeof partes] as readonly Parte[]
    const indice = skin.partes[tipo as keyof typeof skin.partes] ?? 0
    const parte = lista[indice % lista.length]
    if (!parte) continue

    if (parte.ancoraAcessorio) ancora = parte.ancoraAcessorio
    if (parte.semAcessorio) aceitaAcessorio = false
    if (tipo === 'acessorio' && !aceitaAcessorio) continue

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

  for (const { parte, caixa, tipo } of camadas) {
    // O acessório desce junto com a criatura, que é mais baixa que o humanoide.
    const posicao =
      tipo === 'acessorio' && (ancora.x !== 0 || ancora.y !== 0)
        ? { ...caixa, x: caixa.x + ancora.x, y: caixa.y + ancora.y }
        : caixa
    const matriz = vista === 'lado' ? parte.lado : parte.frente
    desenharMatriz(ctx, matriz, posicao, coresDaParte(parte, skin, tipo), escala)
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Limite do cache: cada entrada é um canvas de 144x144 (~80 KB). */
const LIMITE_CACHE = 300

/** Devolve a skin rasterizada e pronta para `drawImage`. */
export function spriteDaSkin(
  skin: Skin,
  vista: Vista = 'frente',
  direcao: Direcao = 'direita',
  escala = ESCALA,
): HTMLCanvasElement {
  const espelhar = vista === 'lado' && direcao === 'esquerda'
  const chave = `${chaveDaSkin(skin)}@${vista}${espelhar ? 'E' : ''}@${escala}`
  const pronto = cache.get(chave)
  if (pronto) return pronto

  const canvas = document.createElement('canvas')
  canvas.width = GRADE * escala
  canvas.height = GRADE * escala

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível ao rasterizar a skin.')
  ctx.imageSmoothingEnabled = false

  if (espelhar) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  desenharSkin(ctx, skin, vista, escala)

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
