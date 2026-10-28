import type { Vista } from './molde'

/**
 * Animação de caminhada.
 *
 * Nada aqui desenha pixel novo: a animação é feita deslocando as camadas que
 * já existem. É o que torna barato ter quadros — o humanoide tem perna, braço
 * e cabeça como partes separadas, então basta movê-las.
 *
 * A criatura é um desenho só. Para ela a regra é outra: as últimas linhas da
 * matriz (as patas, os pés da galinha, a barra do fantasma) são cortadas ao
 * meio e as duas metades andam em contrafase.
 */

/** Quantos quadros tem o ciclo de caminhada. */
export const QUADROS = 4

/** Linhas finais da matriz da criatura que contam como pata. */
export const LINHAS_DE_PATA = 10

export interface Deslocamento {
  /** Move a parte inteira. */
  readonly dx?: number
  readonly dy?: number
  /**
   * A partir desta linha da matriz, a metade esquerda e a direita se movem
   * separadamente. É assim que as duas pernas alternam sendo uma parte só.
   */
  readonly alternarDe?: number
  readonly dxEsquerda?: number
  readonly dyEsquerda?: number
  readonly dxDireita?: number
  readonly dyDireita?: number
}

/** Deslocamento por tipo de parte, num quadro. */
export type Pose = Readonly<Record<string, Deslocamento>>

const PARADO: Pose = {}

/**
 * De frente a caminhada não mostra passada: mostra o peso trocando de pé.
 * Cada perna sobe um pixel na sua vez, e o corpo acompanha.
 */
function humanoideFrente(quadro: number): Pose {
  const esquerda = quadro === 1
  const direita = quadro === 3
  const sobe = esquerda || direita ? -1 : 0
  return {
    pernas: {
      alternarDe: 0,
      dyEsquerda: esquerda ? -2 : 0,
      dyDireita: direita ? -2 : 0,
    },
    bracos: {
      alternarDe: 0,
      dyEsquerda: direita ? -1 : 0,
      dyDireita: esquerda ? -1 : 0,
    },
    peito: { dy: sobe },
    roupa: { dy: sobe },
    cabeca: { dy: sobe },
    olhos: { dy: sobe },
    boca: { dy: sobe },
    cabelo: { dy: sobe },
    sobrancelhas: { dy: sobe },
    acessorio: { dy: sobe },
  }
}

/** De perfil a perna vai à frente e atrás, e o braço faz o contrário. */
function humanoideLado(quadro: number): Pose {
  const passo = [0, 2, 0, -2][quadro] ?? 0
  const sobe = quadro % 2 === 1 ? -1 : 0
  return {
    pernas: { dx: passo },
    bracos: { dx: -passo },
    peito: { dy: sobe },
    roupa: { dy: sobe },
    cabeca: { dy: sobe },
    olhos: { dy: sobe },
    boca: { dy: sobe },
    cabelo: { dy: sobe },
    sobrancelhas: { dy: sobe },
    acessorio: { dy: sobe },
  }
}

/** A criatura é um desenho só: só as patas se mexem, e o corpo balança. */
function criatura(quadro: number, altura: number): Pose {
  const passo = [0, 1, 0, -1][quadro] ?? 0
  return {
    corpo: {
      dy: quadro % 2 === 1 ? -1 : 0,
      alternarDe: Math.max(0, altura - LINHAS_DE_PATA),
      dxEsquerda: passo,
      dxDireita: -passo,
    },
  }
}

/**
 * Pose de um quadro. `quadro` -1 é o avatar parado.
 * `alturaCorpo` é a altura da matriz da criatura, ignorada no humanoide.
 */
export function pose(
  tipo: 'humanoide' | 'criatura',
  vista: Vista,
  quadro: number,
  alturaCorpo = 0,
): Pose {
  if (quadro < 0) return PARADO
  const q = ((quadro % QUADROS) + QUADROS) % QUADROS
  if (tipo === 'criatura') return criatura(q, alturaCorpo)
  return vista === 'lado' ? humanoideLado(q) : humanoideFrente(q)
}
