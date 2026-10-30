/**
 * O molde: a grade fixa onde todas as partes são desenhadas.
 *
 * Cada tipo de parte tem uma caixa com posição e tamanho. Uma matriz de parte
 * precisa ter exatamente o tamanho da sua caixa — é isso que garante que
 * qualquer combinação de partes se encaixe sem ajuste manual.
 *
 * Os tipos, as caixas e as partes ficam em `dados/*.json`, editados pelo
 * Editor (`editor.html`, só no `npm run dev`). Aqui ficam só as regras.
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
 * - `A` a `L` as cores livres da paleta da parte, na ordem (sem sombra nem luz)
 */
export type Matriz = readonly string[]

export const CARACTERES = ['.', 'k', 'w', 's', '1', '2', '3', 'a', 'b', 'c', 'd', 'e', 'f'] as const

/** Caracteres das cores livres: `LIVRES[i]` é `paleta[i]` da parte. */
export const LIVRES = 'ABCDEFGHIJKL'

/** De qual cor da skin a parte se pinta, quando não tem cor fixa. */
export type Slot = 'pele' | 'cabelo' | 'roupa' | 'olhos' | 'criatura'

export const SLOTS: readonly Slot[] = ['pele', 'cabelo', 'roupa', 'olhos', 'criatura']

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
   * Cores livres, fixas: não mudam com a skin. Para os detalhes de uma
   * criatura (focinho, mancha, olho). Até `LIVRES.length` cores.
   */
  readonly paleta?: readonly string[]
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

/**
 * Como um tipo de parte se mexe na caminhada:
 * - `corpo` sobe e desce junto com o tronco (cabeça, roupa, chapéu)
 * - `perna` segue as pernas (sapato)
 * - `braco` segue os braços (objeto na mão); de perfil fica por cima da roupa
 * - `bicho` é a criatura inteira: as patas andam, o corpo balança
 */
export type Movimento = 'corpo' | 'perna' | 'braco' | 'bicho'

export const MOVIMENTOS: readonly Movimento[] = ['corpo', 'perna', 'braco', 'bicho']

export interface TipoParte {
  /** Nome do tipo, usado na skin e nos comandos (`!parte <tipo> <n>`). */
  readonly nome: string
  readonly caixa: Caixa
  readonly slot: Slot
  readonly movimento: Movimento
  readonly partes: readonly Parte[]
}

/**
 * Tudo de um tipo de corpo. A ordem de `tipos` é a ordem de desenho, de trás
 * pra frente — por isso o braço vem antes da roupa: é o que deixa a manga
 * curta aparecer por cima.
 */
export interface DadosCorpo {
  readonly tipos: readonly TipoParte[]
  /** Partes fora da escolha do viewer, como a boca aberta da fala. */
  readonly especiais?: Readonly<Record<string, Parte>>
}

/** Matriz vazia do tamanho de uma caixa. Para a opção "nenhum". */
export function vazia(caixa: Caixa): Matriz {
  return Array.from({ length: caixa.altura }, () => '.'.repeat(caixa.largura))
}
