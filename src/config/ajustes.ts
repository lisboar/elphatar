import { config } from './config'

/**
 * Ajustes do painel de controle: o que a equipe pode mudar com a live no ar.
 *
 * Cada campo sabe ler e gravar o seu valor em `config`. O painel monta os
 * controles a partir desta lista, e o overlay usa a mesma lista para validar
 * o que vem do banco. Campo novo no painel = um item novo aqui.
 */

interface Base {
  chave: string
  rotulo: string
  grupo: string
  ajuda?: string
}

export type Campo = Base &
  (
    | {
        tipo: 'numero'
        min: number
        max: number
        passo: number
        unidade: string
        ler(): number
        gravar(v: number): void
      }
    | { tipo: 'sim-nao'; ler(): boolean; gravar(v: boolean): void }
    | { tipo: 'cor'; ler(): string; gravar(v: string): void }
  )

export type Ajustes = Record<string, number | boolean | string>

const m = config.movimento
const b = config.balao

export const campos: Campo[] = [
  {
    chave: 'tamanho', rotulo: 'Tamanho dos avatares', grupo: 'Avatares', tipo: 'numero',
    min: 1, max: 3, passo: 0.5, unidade: 'x',
    ajuda: 'Inteiro (1x, 2x, 3x) fica mais nítido.',
    ler: () => config.escala, gravar: (v) => (config.escala = v),
  },
  {
    chave: 'mostrarNomes', rotulo: 'Mostrar nomes', grupo: 'Avatares', tipo: 'sim-nao',
    ler: () => config.mostrarNomes, gravar: (v) => (config.mostrarNomes = v),
  },
  {
    chave: 'limiteDeAvatares', rotulo: 'Máximo de avatares na tela', grupo: 'Avatares', tipo: 'numero',
    min: 5, max: 60, passo: 1, unidade: '',
    ajuda: 'Medido até 60 sem perder quadros.',
    ler: () => config.limiteDeAvatares, gravar: (v) => (config.limiteDeAvatares = v),
  },
  {
    chave: 'chanceDeAndar', rotulo: 'Quanto andam', grupo: 'Movimento', tipo: 'numero',
    min: 0, max: 100, passo: 5, unidade: '%',
    ajuda: '0% = ficam sempre parados.',
    ler: () => Math.round(m.chanceDeAndar * 100), gravar: (v) => (m.chanceDeAndar = v / 100),
  },
  {
    chave: 'velocidade', rotulo: 'Velocidade', grupo: 'Movimento', tipo: 'numero',
    min: 15, max: 120, passo: 1, unidade: 'px/s',
    ler: () => m.velocidade, gravar: (v) => (m.velocidade = v),
  },
  {
    chave: 'paradoMin', rotulo: 'Tempo parado: mínimo', grupo: 'Movimento', tipo: 'numero',
    min: 0.5, max: 30, passo: 0.5, unidade: 's',
    ler: () => m.parado.minimo, gravar: (v) => (m.parado.minimo = v),
  },
  {
    chave: 'paradoMax', rotulo: 'Tempo parado: máximo', grupo: 'Movimento', tipo: 'numero',
    min: 0.5, max: 30, passo: 0.5, unidade: 's',
    ler: () => m.parado.maximo, gravar: (v) => (m.parado.maximo = v),
  },
  {
    chave: 'andandoMin', rotulo: 'Tempo andando: mínimo', grupo: 'Movimento', tipo: 'numero',
    min: 0.5, max: 30, passo: 0.5, unidade: 's',
    ler: () => m.andando.minimo, gravar: (v) => (m.andando.minimo = v),
  },
  {
    chave: 'andandoMax', rotulo: 'Tempo andando: máximo', grupo: 'Movimento', tipo: 'numero',
    min: 0.5, max: 30, passo: 0.5, unidade: 's',
    ler: () => m.andando.maximo, gravar: (v) => (m.andando.maximo = v),
  },
  {
    chave: 'balaoSegundos', rotulo: 'Tempo da mensagem na tela', grupo: 'Balão', tipo: 'numero',
    min: 2, max: 30, passo: 1, unidade: 's',
    ler: () => b.duracao, gravar: (v) => (b.duracao = v),
  },
  {
    chave: 'balaoFundo', rotulo: 'Fundo', grupo: 'Balão', tipo: 'cor',
    ler: () => b.fundo, gravar: (v) => (b.fundo = v),
  },
  {
    chave: 'balaoBorda', rotulo: 'Borda', grupo: 'Balão', tipo: 'cor',
    ler: () => b.borda, gravar: (v) => (b.borda = v),
  },
  {
    chave: 'balaoTexto', rotulo: 'Texto', grupo: 'Balão', tipo: 'cor',
    ler: () => b.texto, gravar: (v) => (b.texto = v),
  },
]

/** Os valores de `config.ts`, guardados antes de qualquer ajuste. */
export const padroes: Ajustes = Object.fromEntries(campos.map((c) => [c.chave, c.ler()]))

/** Confere um valor vindo de fora. Inválido ou ausente vira o padrão. */
function valido(campo: Campo, valor: unknown): number | boolean | string {
  const padrao = padroes[campo.chave]!
  switch (campo.tipo) {
    case 'numero': {
      if (typeof valor !== 'number' || !Number.isFinite(valor)) return padrao
      const preso = Math.min(campo.max, Math.max(campo.min, valor))
      return Math.round(preso / campo.passo) * campo.passo
    }
    case 'sim-nao':
      return typeof valor === 'boolean' ? valor : padrao
    case 'cor':
      return typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor) ? valor : padrao
  }
}

/** Grava os ajustes em `config`. Devolve o que foi aplicado de fato. */
export function aplicarAjustes(dados: unknown): Ajustes {
  const fonte = dados && typeof dados === 'object' ? (dados as Record<string, unknown>) : {}
  const aplicados: Ajustes = {}
  for (const campo of campos) {
    const v = valido(campo, fonte[campo.chave])
    ;(campo.gravar as (v: unknown) => void)(v)
    aplicados[campo.chave] = v
  }
  return aplicados
}
