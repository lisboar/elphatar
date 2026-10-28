import { catalogo, type TipoCorpo } from './catalogo'
import { paletas } from './paletas'
import type { Slot, TipoParteCriatura, TipoParteHumanoide } from './molde'

/**
 * A skin de um avatar: só índices. É o que vai e volta do Supabase (Etapa 4)
 * e o que os comandos do chat alteram (Etapa 5).
 */
export interface SkinHumanoide {
  readonly tipo: 'humanoide'
  readonly partes: Record<TipoParteHumanoide, number>
  readonly cores: Record<Slot, number>
}

export interface SkinCriatura {
  readonly tipo: 'criatura'
  readonly partes: Record<TipoParteCriatura, number>
  readonly cores: Record<Slot, number>
}

export type Skin = SkinHumanoide | SkinCriatura

/** Chave estável de uma skin, para cache de desenho e comparação. */
export function chaveDaSkin(skin: Skin): string {
  const partes = Object.keys(skin.partes)
    .sort()
    .map((k) => `${k}${skin.partes[k as keyof typeof skin.partes]}`)
    .join('')
  const cores = Object.keys(skin.cores)
    .sort()
    .map((k) => `${k}${skin.cores[k as Slot]}`)
    .join('')
  return `${skin.tipo}|${partes}|${cores}`
}

/** Hash simples e determinístico (FNV-1a), para derivar skin do nome do viewer. */
function hash(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Gerador pseudoaleatório com semente (mulberry32). */
function sorteador(semente: number): () => number {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SLOTS: Slot[] = ['pele', 'cabelo', 'roupa', 'olhos', 'acessorio', 'corpo']

function montar(tipo: TipoCorpo, sortear: () => number): Skin {
  const indice = (n: number) => Math.floor(sortear() * n)

  const cores = Object.fromEntries(
    SLOTS.map((slot) => [slot, indice(paletas[slot].length)]),
  ) as Record<Slot, number>

  if (tipo === 'humanoide') {
    const partes = Object.fromEntries(
      Object.entries(catalogo.humanoide).map(([t, lista]) => [t, indice(lista.length)]),
    ) as Record<TipoParteHumanoide, number>
    return { tipo: 'humanoide', partes, cores }
  }

  const partes = Object.fromEntries(
    Object.entries(catalogo.criatura).map(([t, lista]) => [t, indice(lista.length)]),
  ) as Record<TipoParteCriatura, number>
  return { tipo: 'criatura', partes, cores }
}

/** Skin aleatória. Sem semente, muda a cada chamada. */
export function skinAleatoria(tipo?: TipoCorpo): Skin {
  const sortear = sorteador((Math.random() * 2 ** 32) >>> 0)
  return montar(tipo ?? (sortear() < 0.8 ? 'humanoide' : 'criatura'), sortear)
}

/**
 * Skin derivada de um texto (o nome do viewer): sempre a mesma para o mesmo
 * nome. Serve de skin inicial de quem nunca usou os comandos.
 */
export function skinDeSemente(texto: string, tipo?: TipoCorpo): Skin {
  const sortear = sorteador(hash(texto.toLowerCase()))
  return montar(tipo ?? (sortear() < 0.8 ? 'humanoide' : 'criatura'), sortear)
}

/** Troca uma parte ou uma cor, devolvendo uma skin nova. */
export function comParte(skin: Skin, tipo: string, indice: number): Skin {
  if (!(tipo in skin.partes)) return skin
  const lista = catalogo[skin.tipo][tipo as keyof (typeof catalogo)[typeof skin.tipo]]
  const n = ((indice % lista.length) + lista.length) % lista.length
  return { ...skin, partes: { ...skin.partes, [tipo]: n } } as Skin
}

export function comCor(skin: Skin, slot: Slot, indice: number): Skin {
  const n = ((indice % paletas[slot].length) + paletas[slot].length) % paletas[slot].length
  return { ...skin, cores: { ...skin.cores, [slot]: n } } as Skin
}
