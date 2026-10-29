import type { Movimento, Passada, Vista } from './molde'

/**
 * Animação de caminhada.
 *
 * Nada aqui desenha pixel novo: a animação é feita deslocando as camadas que
 * já existem. É o que torna barato ter quadros — o humanoide tem perna, braço
 * e cabeça como partes separadas, então basta movê-las.
 *
 * De perfil, as pernas que o desenho junta são separadas: ou a matriz é
 * cortada em faixas (as quatro patas do bicho), ou a perna única ganha uma
 * cópia mais escura atrás (a perna do lado de lá).
 */

/** Quantos quadros tem o ciclo de caminhada. */
export const QUADROS = 4

/** Linhas finais da matriz da criatura que contam como pata, de frente. */
export const LINHAS_DE_PATA = 10

export interface Desvio {
  readonly dx?: number
  readonly dy?: number
}

export interface Deslocamento extends Desvio {
  /** A partir desta linha a matriz é perna e anda em faixas. */
  readonly pernasDe?: number
  /**
   * Colunas onde as pernas se separam. Cada faixa inclui a coluna do corte,
   * que vira contorno — assim cada perna tem a sua borda. Sem cortes e com
   * duas faixas, a matriz é dividida ao meio.
   */
  readonly cortes?: readonly number[]
  /** Desvio de cada faixa, somado ao da parte. */
  readonly faixas?: readonly Desvio[]
  /** Cópia escurecida das linhas de perna, desenhada antes: a perna de trás. */
  readonly eco?: Desvio
}

/** Deslocamento por tipo de parte, num quadro. */
export type Pose = Readonly<Record<string, Deslocamento>>

/** As passadas declaradas nas partes da skin, por tipo de parte. */
export type Passadas = Readonly<Partial<Record<string, Passada>>>

const PARADO: Pose = {}

/** O que a pose precisa saber de cada tipo de parte. */
export interface TipoAnimado {
  readonly nome: string
  readonly movimento: Movimento
  readonly altura: number
}

/**
 * De frente a caminhada não mostra passada: mostra o peso trocando de pé.
 * Cada perna sobe um pixel na sua vez, e o corpo acompanha.
 */
function humanoideFrente(quadro: number, movimento: Movimento): Deslocamento {
  const esquerda = quadro === 1
  const direita = quadro === 3
  if (movimento === 'perna') {
    return { pernasDe: 0, faixas: [{ dy: esquerda ? -2 : 0 }, { dy: direita ? -2 : 0 }] }
  }
  if (movimento === 'braco') {
    return { pernasDe: 0, faixas: [{ dy: direita ? -1 : 0 }, { dy: esquerda ? -1 : 0 }] }
  }
  return { dy: esquerda || direita ? -1 : 0 }
}

/**
 * De perfil a perna da frente e a de trás vão em sentidos opostos, e o braço
 * faz o contrário da perna. Parte com passada (a calça) acompanha as pernas.
 */
function humanoideLado(quadro: number, movimento: Movimento, passada?: Passada): Deslocamento {
  const passo = [0, 2, 0, -2][quadro] ?? 0
  const sobe = quadro % 2 === 1 ? -1 : 0
  if (movimento === 'perna') return { pernasDe: 0, faixas: [{ dx: passo }], eco: { dx: -passo } }
  if (movimento === 'braco') return { dx: -passo, dy: sobe }
  // a perna da calça sobe junto com o quadril, para não abrir fresta
  return passada
    ? { dy: sobe, pernasDe: passada.de, faixas: [{ dx: passo }], eco: { dx: -passo } }
    : { dy: sobe }
}

/** A criatura é um desenho só: só as patas se mexem, e o corpo balança. */
function criatura(quadro: number, vista: Vista, altura: number, passada?: Passada): Deslocamento {
  // de perfil o corpo não balança: se ele sobe e a pata não, abre uma fresta
  // entre os dois
  const sobe = quadro % 2 === 1 && !(vista === 'lado' && passada) ? -1 : 0
  const passo = [0, 1, 0, -1][quadro] ?? 0

  if (vista === 'lado' && passada?.cortes) {
    // patas alternadas: no quadro 1 sobem as pares, no 3 as ímpares, cada uma
    // para longe da vizinha. Cruzar as patas empilhava os contornos.
    const faixas = Array.from({ length: passada.cortes.length + 1 }, (_, i) => {
      const vez = (i % 2 === 0 && quadro === 1) || (i % 2 === 1 && quadro === 3)
      return vez ? { dx: i % 2 === 0 ? -1 : 1, dy: -sobe - 1 } : { dy: -sobe }
    })
    return { dy: sobe, pernasDe: passada.de, cortes: passada.cortes, faixas }
  }

  if (vista === 'lado' && passada) {
    return {
      dy: sobe,
      pernasDe: passada.de,
      faixas: [{ dx: passo * 2, dy: -sobe }],
      eco: { dx: -passo * 2, dy: -sobe },
    }
  }

  return {
    dy: sobe,
    pernasDe: Math.max(0, altura - LINHAS_DE_PATA),
    faixas: [{ dx: passo }, { dx: -passo }],
  }
}

/**
 * Pose de um quadro, por tipo de parte. `quadro` -1 é o avatar parado.
 * Na criatura, o que não é `bicho` sobe e desce com o balanço do corpo.
 */
export function pose(
  tipo: 'humanoide' | 'criatura',
  vista: Vista,
  quadro: number,
  tipos: readonly TipoAnimado[],
  passadas: Passadas = {},
): Pose {
  if (quadro < 0) return PARADO
  const q = ((quadro % QUADROS) + QUADROS) % QUADROS
  const resultado: Record<string, Deslocamento> = {}

  if (tipo === 'criatura') {
    const bicho = tipos.find((t) => t.movimento === 'bicho')
    const corpo = criatura(q, vista, bicho?.altura ?? 0, bicho && passadas[bicho.nome])
    for (const t of tipos) {
      resultado[t.nome] = t === bicho ? corpo : { dy: corpo.dy }
    }
    return resultado
  }

  for (const t of tipos) {
    resultado[t.nome] =
      vista === 'lado'
        ? humanoideLado(q, t.movimento, passadas[t.nome])
        : humanoideFrente(q, t.movimento)
  }
  return resultado
}
