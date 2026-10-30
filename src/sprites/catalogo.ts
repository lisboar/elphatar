import {
  CARACTERES,
  LIVRES,
  type Caixa,
  type DadosCorpo,
  type Matriz,
  type Parte,
  type TipoParte,
} from './molde'
import humanoide from './dados/humanoide.json'
import criatura from './dados/criatura.json'

export type TipoCorpo = 'humanoide' | 'criatura'

export const CORPOS: readonly TipoCorpo[] = ['humanoide', 'criatura']

/**
 * O catálogo vem dos JSON de `dados/`. Ele é trocável em tempo de execução:
 * o Editor troca os dados a cada pincelada (preview ao vivo), e o servidor
 * de desenvolvimento troca quando o JSON é salvo, sem recarregar a página.
 */
const dados: Record<TipoCorpo, DadosCorpo> = {
  humanoide: humanoide as unknown as DadosCorpo,
  criatura: criatura as unknown as DadosCorpo,
}

const ouvintes = new Set<() => void>()

/** Avisa quando o catálogo muda. O render usa para limpar o cache de sprites. */
export function aoMudarCatalogo(fn: () => void): void {
  ouvintes.add(fn)
}

export function definirDados(corpo: TipoCorpo, novos: DadosCorpo): void {
  dados[corpo] = novos
  for (const fn of ouvintes) fn()
}

export function dadosDo(corpo: TipoCorpo): DadosCorpo {
  return dados[corpo]
}

/** Os tipos de parte do corpo, na ordem de desenho. */
export function tiposDo(corpo: TipoCorpo): readonly TipoParte[] {
  return dados[corpo].tipos
}

export function tipoDo(corpo: TipoCorpo, nome: string): TipoParte | undefined {
  return dados[corpo].tipos.find((t) => t.nome === nome)
}

export function partesDo(corpo: TipoCorpo, tipo: string): readonly Parte[] {
  return tipoDo(corpo, tipo)?.partes ?? []
}

export function especial(corpo: TipoCorpo, nome: string): Parte | undefined {
  return dados[corpo].especiais?.[nome]
}

if (import.meta.hot) {
  import.meta.hot.accept(['./dados/humanoide.json', './dados/criatura.json'], ([h, c]) => {
    if (h) definirDados('humanoide', h.default as DadosCorpo)
    if (c) definirDados('criatura', c.default as DadosCorpo)
  })
}

const VALIDOS = new Set<string>(CARACTERES)

function conferir(erros: string[], rotulo: string, caixa: Caixa, matriz: Matriz, livres = 0): void {
  if (matriz.length !== caixa.altura) {
    erros.push(`${rotulo}: tem ${matriz.length} linhas, a caixa pede ${caixa.altura}`)
  }
  matriz.forEach((linha, i) => {
    if (linha.length !== caixa.largura) {
      erros.push(`${rotulo}: linha ${i} tem ${linha.length} colunas, a caixa pede ${caixa.largura}`)
    }
    for (const c of linha) {
      if (VALIDOS.has(c)) continue
      const livre = LIVRES.indexOf(c)
      if (livre < 0) erros.push(`${rotulo}: linha ${i} usa caractere invalido "${c}"`)
      else if (livre >= livres) erros.push(`${rotulo}: linha ${i} usa a cor livre "${c}", que a paleta não tem`)
    }
  })
}

/**
 * Confere que toda matriz, nas duas vistas, cabe exatamente na caixa do seu
 * tipo de parte. É isso que garante que qualquer combinação se encaixe.
 * Chamado no Laboratório, no Editor e no overlay com ?debug=1.
 */
export function validarCatalogo(): string[] {
  const erros: string[] = []

  for (const corpo of CORPOS) {
    for (const tipo of dados[corpo].tipos) {
      if (tipo.partes.length === 0) erros.push(`${corpo}/${tipo.nome}: nenhuma parte`)
      for (const p of tipo.partes) {
        const livres = p.paleta?.length ?? 0
        conferir(erros, `${corpo}/${tipo.nome}/${p.nome}/frente`, tipo.caixa, p.frente, livres)
        conferir(erros, `${corpo}/${tipo.nome}/${p.nome}/lado`, tipo.caixa, p.lado, livres)
      }
    }
  }

  return erros
}
