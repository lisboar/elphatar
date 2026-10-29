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
export const GRADE = 48

/** Escala de desenho na tela: 48 x 3 = 144 px de altura. */
export const ESCALA = 3

/**
 * Caracteres aceitos nas matrizes:
 * - `.` vazio (transparente)
 * - `k` contorno (cor fixa, igual em todas as partes)
 * - `w` branco, `s` cinza do branco (dente, olho, osso)
 * - `1` `2` `3` base, sombra e luz da cor principal da parte
 * - `a` `b` `c` base, sombra e luz da cor extra 1 da parte
 * - `d` `e` `f` base, sombra e luz da cor extra 2 da parte
 */
export type Matriz = readonly string[]

/** De qual cor da skin a parte se pinta, quando não tem cor fixa. */
export type Slot = 'pele' | 'cabelo' | 'roupa' | 'olhos' | 'criatura'

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
  /**
   * Desenha atrás de todas as outras partes. Para acessórios que nascem do
   * corpo (asas, cauda) e não podem cobrir o contorno dele.
   */
  readonly atras?: boolean
  /** Cor base fixa: a parte ignora o slot. Acessórios e criaturas usam isso. */
  readonly fixa?: string
  /** Cor dos caracteres `a` `b` `c`. */
  readonly extra1?: string
  /** Cor dos caracteres `d` `e` `f`. */
  readonly extra2?: string
  /**
   * Só para corpos de criatura: onde fica o topo da cabeça dela, para o
   * acessório pousar no lugar certo em bicho alto e em bicho baixo.
   */
  readonly semAcessorio?: boolean
  readonly ancoraAcessorio?: { readonly x: number; readonly y: number }
  /**
   * Como a parte anda de perfil. A partir da linha `de`, a matriz é perna.
   * Com `cortes`, as colunas viram faixas (uma por perna) que andam em
   * contrafase. Sem `cortes`, o desenho tem uma perna só, e a de trás é uma
   * cópia mais escura dela.
   */
  readonly passada?: Passada
}

export interface Passada {
  readonly de: number
  readonly cortes?: readonly number[]
}

export type TipoParteHumanoide =
  | 'pernas'
  | 'peito'
  | 'bracos'
  | 'roupa'
  | 'cabeca'
  | 'olhos'
  | 'boca'
  | 'cabelo'
  | 'acessorio'

export type TipoParteCriatura = 'corpo'

/** Caixas do humanoide. A ordem das chaves é a ordem de desenho (de trás pra frente). */
export const moldeHumanoide: Record<TipoParteHumanoide, Caixa> = {
  pernas: { x: 15, y: 35, largura: 18, altura: 13 },
  peito: { x: 11, y: 23, largura: 26, altura: 14 },
  // braços antes da roupa: é o que deixa a manga curta aparecer por cima
  bracos: { x: 8, y: 23, largura: 32, altura: 18 },
  roupa: { x: 11, y: 23, largura: 26, altura: 24 },
  cabeca: { x: 14, y: 3, largura: 20, altura: 21 },
  olhos: { x: 17, y: 12, largura: 14, altura: 7 },
  boca: { x: 19, y: 18, largura: 10, altura: 4 },
  cabelo: { x: 11, y: 0, largura: 26, altura: 34 },
  acessorio: { x: 4, y: 0, largura: 40, altura: 34 },
}

/** Caixas da criatura. Cada criatura é um desenho só, com olhos e cores próprios. */
export const moldeCriatura: Record<TipoParteCriatura, Caixa> = {
  corpo: { x: 4, y: 4, largura: 40, altura: 44 },
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
  cabelo: 'cabelo',
  acessorio: 'pele',
  corpo: 'criatura',
}

/** Matriz vazia do tamanho de uma caixa. Para a opção "nenhum". */
export function vazia(caixa: Caixa): Matriz {
  return Array.from({ length: caixa.altura }, () => '.'.repeat(caixa.largura))
}
