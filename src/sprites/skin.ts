import { partesDo, tiposDo, type TipoCorpo } from './catalogo'
import { paletas } from './paletas'
import { SLOTS, type Slot } from './molde'

/**
 * A skin de um avatar: só índices. É o que vai e volta do Supabase (Etapa 4)
 * e o que os comandos do chat alteram (Etapa 5).
 */
export interface Skin {
  readonly tipo: TipoCorpo
  /**
   * Índice da parte escolhida, por tipo de parte. Tipo que falta (criado
   * depois que a skin foi salva) usa a parte 0.
   */
  readonly partes: Readonly<Record<string, number>>
  readonly cores: Readonly<Record<Slot, number>>
}

/** Chave estável de uma skin, para cache de desenho e comparação. */
export function chaveDaSkin(skin: Skin): string {
  const partes = Object.keys(skin.partes)
    .sort()
    .map((k) => `${k}${skin.partes[k]}`)
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

function montar(tipo: TipoCorpo, sortear: () => number): Skin {
  const indice = (n: number) => Math.floor(sortear() * n)

  const cores = Object.fromEntries(
    SLOTS.map((slot) => [slot, indice(paletas[slot].length)]),
  ) as Record<Slot, number>

  const partes = Object.fromEntries(
    tiposDo(tipo).map((t) => [t.nome, indice(t.partes.length)]),
  )
  return { tipo, partes, cores }
}

/** Skin aleatória. Sem semente, muda a cada chamada. */
export function skinAleatoria(tipo?: TipoCorpo): Skin {
  const sortear = sorteador((Math.random() * 2 ** 32) >>> 0)
  return montar(tipo ?? (sortear() < 0.75 ? 'humanoide' : 'criatura'), sortear)
}

/**
 * Skin derivada de um texto (o nome do viewer): sempre a mesma para o mesmo
 * nome. Serve de skin inicial de quem nunca usou os comandos.
 */
export function skinDeSemente(texto: string, tipo?: TipoCorpo): Skin {
  const sortear = sorteador(hash(texto.toLowerCase()))
  return montar(tipo ?? (sortear() < 0.75 ? 'humanoide' : 'criatura'), sortear)
}

/** Troca uma parte ou uma cor, devolvendo uma skin nova. */
export function comParte(skin: Skin, tipo: string, indice: number): Skin {
  const lista = partesDo(skin.tipo, tipo)
  if (lista.length === 0) return skin
  const n = ((indice % lista.length) + lista.length) % lista.length
  return { ...skin, partes: { ...skin.partes, [tipo]: n } }
}

export function comCor(skin: Skin, slot: Slot, indice: number): Skin {
  const n = ((indice % paletas[slot].length) + paletas[slot].length) % paletas[slot].length
  return { ...skin, cores: { ...skin.cores, [slot]: n } }
}
