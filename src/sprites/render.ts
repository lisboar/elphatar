import {
  ESCALA,
  GRADE,
  moldeCriatura,
  moldeHumanoide,
  slotDaParte,
  type Caixa,
  type Matriz,
  type Parte,
} from './molde'
import { BRANCO, CONTORNO, rampa, type Rampa } from './cores'
import { paletas } from './paletas'
import { catalogo } from './catalogo'
import { chaveDaSkin, type Skin } from './skin'

/**
 * Desenho dos sprites.
 *
 * Nada é desenhado pixel a pixel por quadro: cada skin é rasterizada uma vez
 * num canvas de 32x32 (já na escala final) e guardada em cache. No overlay
 * cada avatar é um `drawImage` — é o que mantém o custo baixo com o Valorant
 * rodando ao lado.
 */

function corDoCaractere(c: string, r: Rampa): string | null {
  switch (c) {
    case '.':
      return null
    case 'k':
      return CONTORNO
    case 'w':
      return BRANCO
    case '2':
      return r.sombra
    case '3':
      return r.luz
    default:
      return r.base
  }
}

function desenharMatriz(
  ctx: CanvasRenderingContext2D,
  matriz: Matriz,
  caixa: Caixa,
  r: Rampa,
  escala: number,
): void {
  for (let y = 0; y < matriz.length; y++) {
    const linha = matriz[y]!
    for (let x = 0; x < linha.length; x++) {
      const cor = corDoCaractere(linha[x]!, r)
      if (!cor) continue
      ctx.fillStyle = cor
      ctx.fillRect((caixa.x + x) * escala, (caixa.y + y) * escala, escala, escala)
    }
  }
}

/** Desenha a skin num contexto já posicionado, sem cache. Uso interno e do Laboratório. */
export function desenharSkin(ctx: CanvasRenderingContext2D, skin: Skin, escala = ESCALA): void {
  const molde = skin.tipo === 'humanoide' ? moldeHumanoide : moldeCriatura
  const partes = catalogo[skin.tipo]

  // Object.entries segue a ordem de declaração do molde: de trás pra frente.
  // Antes disso vêm as partes marcadas `atras` (asas, cauda), que não podem
  // cobrir o contorno do corpo.
  const camadas: { parte: Parte; caixa: Caixa; tipo: string }[] = []

  for (const [tipo, caixa] of Object.entries(molde)) {
    const lista = partes[tipo as keyof typeof partes] as readonly Parte[]
    const indice = skin.partes[tipo as keyof typeof skin.partes] ?? 0
    const parte = lista[indice % lista.length]
    if (!parte) continue

    const camada = { parte, caixa, tipo }
    if (parte.atras) camadas.unshift(camada)
    else camadas.push(camada)
  }

  for (const { parte, caixa, tipo } of camadas) {
    const slot = slotDaParte[tipo as keyof typeof slotDaParte]
    const paleta = paletas[slot]
    const hex = paleta[skin.cores[slot] % paleta.length]!.hex
    desenharMatriz(ctx, parte.matriz, caixa, rampa(hex), escala)
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Limite do cache: cada entrada é um canvas de 128x128 (~64 KB). */
const LIMITE_CACHE = 300

/** Devolve a skin rasterizada e pronta para `drawImage`. */
export function spriteDaSkin(skin: Skin, escala = ESCALA): HTMLCanvasElement {
  const chave = `${chaveDaSkin(skin)}@${escala}`
  const pronto = cache.get(chave)
  if (pronto) return pronto

  const canvas = document.createElement('canvas')
  canvas.width = GRADE * escala
  canvas.height = GRADE * escala

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível ao rasterizar a skin.')
  ctx.imageSmoothingEnabled = false
  desenharSkin(ctx, skin, escala)

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
  hex: string,
  escala = ESCALA,
): void {
  const molde = tipoCorpo === 'humanoide' ? moldeHumanoide : moldeCriatura
  const caixa = molde[tipoParte as keyof typeof molde]
  if (!caixa) return

  const lista = catalogo[tipoCorpo][tipoParte as keyof (typeof catalogo)[typeof tipoCorpo]] as
    readonly { matriz: Matriz }[]
  const parte = lista[indice % lista.length]
  if (!parte) return

  desenharMatriz(ctx, parte.matriz, caixa, rampa(hex), escala)
}
