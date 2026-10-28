import {
  moldeCriatura,
  moldeHumanoide,
  type Caixa,
  type Matriz,
  type Parte,
} from './molde'
import { partesHumanoide } from './partes/humanoide'
import { partesCriatura } from './partes/criatura'

export const catalogo = {
  humanoide: partesHumanoide,
  criatura: partesCriatura,
} as const

export type TipoCorpo = keyof typeof catalogo

const CARACTERES = new Set(['.', 'k', 'w', 's', '1', '2', '3', 'a', 'b', 'c', 'd', 'e', 'f'])

function conferir(
  erros: string[],
  rotulo: string,
  caixa: Caixa,
  matriz: Matriz,
): void {
  if (matriz.length !== caixa.altura) {
    erros.push(`${rotulo}: tem ${matriz.length} linhas, a caixa pede ${caixa.altura}`)
  }
  matriz.forEach((linha, i) => {
    if (linha.length !== caixa.largura) {
      erros.push(`${rotulo}: linha ${i} tem ${linha.length} colunas, a caixa pede ${caixa.largura}`)
    }
    for (const c of linha) {
      if (!CARACTERES.has(c)) erros.push(`${rotulo}: linha ${i} usa caractere invalido "${c}"`)
    }
  })
}

/**
 * Confere que toda matriz, nas duas vistas, cabe exatamente na caixa do seu
 * tipo de parte. É isso que garante que qualquer combinação se encaixe.
 * Chamado no Laboratório e no overlay com ?debug=1.
 */
export function validarCatalogo(): string[] {
  const erros: string[] = []

  for (const [tipo, partes] of Object.entries(catalogo.humanoide)) {
    const caixa = moldeHumanoide[tipo as keyof typeof moldeHumanoide]
    partes.forEach((p: Parte) => {
      conferir(erros, `humanoide/${tipo}/${p.nome}/frente`, caixa, p.frente)
      conferir(erros, `humanoide/${tipo}/${p.nome}/lado`, caixa, p.lado)
    })
  }

  for (const [tipo, partes] of Object.entries(catalogo.criatura)) {
    const caixa = moldeCriatura[tipo as keyof typeof moldeCriatura]
    partes.forEach((p: Parte) => {
      conferir(erros, `criatura/${tipo}/${p.nome}/frente`, caixa, p.frente)
      conferir(erros, `criatura/${tipo}/${p.nome}/lado`, caixa, p.lado)
    })
  }

  return erros
}
