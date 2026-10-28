/**
 * O molde: a grade fixa onde todas as partes são desenhadas.
 *
 * Cada tipo de parte tem uma caixa com posição e tamanho definidos aqui.
 * Uma matriz de parte precisa ter exatamente o tamanho da sua caixa — é isso
 * que garante que qualquer combinação de partes se encaixe sem ajuste manual.
 *
 * Cada parte tem duas matrizes: `frente` e `lado`. O lado esquerdo não é
 * desenhado: é o `lado` espelhado na hora de rasterizar.
 */

/** Lado da grade em pixels de arte. */
export const GRADE = 64

/** Escala de desenho na tela: 64 x 2 = 128 px de altura. */
export const ESCALA = 2

/**
 * Caracteres aceitos nas matrizes:
 * - `.` vazio (transparente)
 * - `k` contorno (cor fixa, igual em todas as partes)
 * - `w` branco, `s` cinza do branco (dente, osso, esclera)
 * - `1` `2` `3` base, sombra e luz da cor principal da parte
 * - `a` `b` `c` base, sombra e luz da cor extra 1 da parte
 * - `d` `e` `f` base, sombra e luz da cor extra 2 da parte
 */
export type Matriz = readonly string[]

/** De qual cor da skin a parte se pinta, quando não tem cor fixa. */
export type Slot = 'pele' | 'cabelo' | 'roupa' | 'olhos'

export interface Caixa {
  readonly x: number
  readonly y: number
  readonly largura: number
  readonly altura: number
}

export type Vista = 'frente' | 'lado'

export interface Parte {
  /** Nome curto, usado no Laboratório e nos comandos do chat. */
  readonly nome: string
  readonly frente: Matriz
  readonly lado: Matriz
  /** Desenha atrás de todas as outras partes (cauda, cabelo de trás). */
  readonly atras?: boolean
  /** Cor base fixa: a parte ignora o slot. Acessórios e criaturas usam isso. */
  readonly fixa?: string
  /** Cor dos caracteres `a` `b` `c`. */
  readonly extra1?: string
  /** Cor dos caracteres `d` `e` `f`. */
  readonly extra2?: string
  /**
   * Só para corpos de criatura: quanto o acessório desce, para pousar na
   * cabeça do bicho alto e na do bicho baixo.
   */
  readonly ancoraAcessorio?: { readonly x: number; readonly y: number }
}

export type TipoParteHumanoide =
  | 'pernas'
  | 'peito'
  | 'roupa'
  | 'bracos'
  | 'cabeca'
  | 'olhos'
  | 'sobrancelhas'
  | 'boca'
  | 'cabelo'
  | 'acessorio'

export type TipoParteCriatura = 'corpo' | 'acessorio'

/** Caixas do humanoide. A ordem das chaves é a ordem de desenho (de trás pra frente). */
export const moldeHumanoide: Record<TipoParteHumanoide, Caixa> = {
  pernas: { x: 20, y: 45, largura: 24, altura: 19 },
  peito: { x: 21, y: 30, largura: 22, altura: 18 },
  roupa: { x: 16, y: 29, largura: 32, altura: 32 },
  bracos: { x: 8, y: 30, largura: 48, altura: 26 },
  cabeca: { x: 18, y: 4, largura: 28, altura: 28 },
  olhos: { x: 20, y: 16, largura: 24, altura: 10 },
  sobrancelhas: { x: 20, y: 12, largura: 24, altura: 6 },
  boca: { x: 26, y: 24, largura: 12, altura: 6 },
  cabelo: { x: 12, y: 0, largura: 40, altura: 48 },
  acessorio: { x: 6, y: 0, largura: 52, altura: 44 },
}

/** Caixas da criatura. Cada criatura é um desenho só, com olhos e cores próprios. */
export const moldeCriatura: Record<TipoParteCriatura, Caixa> = {
  corpo: { x: 2, y: 4, largura: 60, altura: 60 },
  acessorio: { x: 6, y: 0, largura: 52, altura: 44 },
}

/** Qual slot de cor cada tipo de parte usa, quando a parte não tem cor fixa. */
export const slotDaParte: Record<TipoParteHumanoide | TipoParteCriatura, Slot> = {
  pernas: 'pele',
  peito: 'pele',
  cabeca: 'pele',
  bracos: 'pele',
  boca: 'pele',
  roupa: 'roupa',
  olhos: 'olhos',
  sobrancelhas: 'cabelo',
  cabelo: 'cabelo',
  acessorio: 'pele',
  corpo: 'pele',
}

/** Matriz vazia do tamanho de uma caixa. Para a opção "nenhum". */
export function vazia(caixa: Caixa): Matriz {
  return Array.from({ length: caixa.altura }, () => '.'.repeat(caixa.largura))
}
