/**
 * O molde: a grade fixa onde todas as partes são desenhadas.
 *
 * Cada tipo de parte tem uma caixa com posição e tamanho definidos aqui.
 * Uma matriz de parte precisa ter exatamente o tamanho da sua caixa — é isso
 * que garante que qualquer combinação de partes se encaixe sem ajuste manual.
 */

/** Lado da grade em pixels de arte. */
export const GRADE = 32

/** Escala de desenho na tela: 32 x 4 = 128 px de altura. */
export const ESCALA = 4

/**
 * Caracteres aceitos nas matrizes:
 * - `.` vazio (transparente)
 * - `k` contorno (cor fixa, igual em todas as partes)
 * - `w` branco (brilho do olho, dente)
 * - `1` cor base do slot da parte
 * - `2` sombra do slot
 * - `3` luz do slot
 */
export type Caractere = '.' | 'k' | 'w' | '1' | '2' | '3'

/** Uma matriz é uma lista de linhas de texto, uma linha por pixel de altura. */
export type Matriz = readonly string[]

/** De qual cor da skin a parte se pinta. */
export type Slot = 'pele' | 'cabelo' | 'roupa' | 'olhos' | 'acessorio' | 'corpo'

export interface Caixa {
  readonly x: number
  readonly y: number
  readonly largura: number
  readonly altura: number
}

export interface Parte {
  /** Nome curto, usado no Laboratório e nos comandos do chat. */
  readonly nome: string
  readonly matriz: Matriz
  /**
   * Desenha atrás de todas as outras partes. Para acessórios que nascem do
   * corpo (asas, cauda) e não podem cobrir o contorno dele.
   */
  readonly atras?: boolean
}

export type TipoParteHumanoide =
  | 'pernas'
  | 'peito'
  | 'roupa'
  | 'bracos'
  | 'cabeca'
  | 'olhos'
  | 'cabelo'
  | 'acessorio'

export type TipoParteCriatura = 'corpo' | 'olhos' | 'acessorio'

/** Caixas do humanoide. A ordem das chaves é a ordem de desenho (de trás pra frente). */
export const moldeHumanoide: Record<TipoParteHumanoide, Caixa> = {
  pernas: { x: 11, y: 24, largura: 10, altura: 8 },
  peito: { x: 11, y: 16, largura: 10, altura: 9 },
  roupa: { x: 11, y: 16, largura: 10, altura: 12 },
  bracos: { x: 7, y: 16, largura: 18, altura: 11 },
  cabeca: { x: 10, y: 4, largura: 12, altura: 12 },
  olhos: { x: 11, y: 10, largura: 10, altura: 4 },
  cabelo: { x: 7, y: 1, largura: 18, altura: 13 },
  acessorio: { x: 4, y: 0, largura: 24, altura: 22 },
}

/** Caixas da criatura. Mesma grade, mesmo acessório. */
export const moldeCriatura: Record<TipoParteCriatura, Caixa> = {
  corpo: { x: 6, y: 7, largura: 20, altura: 25 },
  olhos: { x: 10, y: 16, largura: 12, altura: 5 },
  // A criatura é mais baixa que o humanoide: o acessório desce com ela.
  acessorio: { x: 4, y: 6, largura: 24, altura: 22 },
}

/** Qual slot de cor cada tipo de parte usa. */
export const slotDaParte: Record<TipoParteHumanoide | TipoParteCriatura, Slot> = {
  pernas: 'pele',
  peito: 'pele',
  cabeca: 'pele',
  roupa: 'roupa',
  bracos: 'pele',
  olhos: 'olhos',
  cabelo: 'cabelo',
  acessorio: 'acessorio',
  corpo: 'corpo',
}

/** Matriz vazia do tamanho de uma caixa. Para a opção "nenhum". */
export function vazia(caixa: Caixa): Matriz {
  return Array.from({ length: caixa.altura }, () => '.'.repeat(caixa.largura))
}
