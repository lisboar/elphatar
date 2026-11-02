/**
 * Comandos do chat (Etapa 5).
 *
 * Cada ação tem gatilhos padrão; o painel de controle pode renomear os
 * gatilhos de cada ação e criar respostas de texto (o bot responde no chat).
 * O que o painel salva vai em `ajustes.dados.comandos` e passa por
 * `validarComandos` antes de valer.
 */

export const ACOES = [
  'aleatorio', 'humano', 'animal', 'monstro', 'pele', 'cabelo', 'corCabelo',
  'roupa', 'corRoupa', 'olho', 'corOlho', 'acessorio', 'comandos', 'limpar',
] as const
export type Acao = (typeof ACOES)[number]

export const descricoes: Record<Acao, string> = {
  aleatorio: 'Sorteia uma skin nova',
  humano: 'Vira humano',
  animal: 'Vira bicho (passa pelos animais)',
  monstro: 'Vira monstro (passa pelos de terror)',
  pele: 'Próxima cor de pele',
  cabelo: 'Próximo cabelo',
  corCabelo: 'Próxima cor de cabelo',
  roupa: 'Próxima roupa',
  corRoupa: 'Próxima cor de roupa (no bicho, a cor dele)',
  olho: 'Próximo olho',
  corOlho: 'Próxima cor de olho',
  acessorio: 'Próximo acessório',
  comandos: 'O bot responde com a lista de comandos',
  limpar: 'Tira todo mundo da tela (só mods)',
}

const PADRAO: Record<Acao, string[]> = {
  aleatorio: ['!aleatorio'],
  humano: ['!humano'],
  animal: ['!animal'],
  monstro: ['!monstro'],
  pele: ['!pele'],
  cabelo: ['!cabelo'],
  corCabelo: ['!cor_cabelo'],
  roupa: ['!roupa'],
  corRoupa: ['!cor_roupa'],
  olho: ['!olho'],
  corOlho: ['!cor_olho'],
  acessorio: ['!acessorio'],
  comandos: ['!comandos', '!avatar'],
  limpar: ['!limpar'],
}

export interface RespostaDeTexto {
  gatilho: string
  resposta: string
}

export interface ConfigComandos {
  gatilhos: Record<Acao, string[]>
  textos: RespostaDeTexto[]
}

export const comandosPadrao: ConfigComandos = { gatilhos: PADRAO, textos: [] }

export const limitesDosComandos = {
  gatilhosPorAcao: 3,
  respostasDeTexto: 20,
  tamanhoDaResposta: 400,
}

/** `!` seguido de 1 a 24 letras, números ou `_`. Sempre em minúsculas. */
export function gatilhoValido(texto: string): string | null {
  const g = texto.trim().toLowerCase()
  return /^![a-z0-9_]{1,24}$/.test(g) ? g : null
}

/** Confere o que veio do banco. Gatilho repetido vale só na primeira vez que aparece. */
export function validarComandos(dados: unknown): ConfigComandos {
  const fonte = dados && typeof dados === 'object' ? (dados as Partial<ConfigComandos>) : {}
  const usados = new Set<string>()

  const gatilhos = {} as Record<Acao, string[]>
  for (const acao of ACOES) {
    const lista = Array.isArray(fonte.gatilhos?.[acao]) ? fonte.gatilhos![acao] : PADRAO[acao]
    gatilhos[acao] = lista
      .map((g) => (typeof g === 'string' ? gatilhoValido(g) : null))
      .filter((g): g is string => !!g && !usados.has(g) && !!usados.add(g))
      .slice(0, limitesDosComandos.gatilhosPorAcao)
  }

  const textos = (Array.isArray(fonte.textos) ? fonte.textos : [])
    .map((t) => ({
      gatilho: typeof t?.gatilho === 'string' ? gatilhoValido(t.gatilho) : null,
      resposta: typeof t?.resposta === 'string' ? t.resposta.trim().slice(0, limitesDosComandos.tamanhoDaResposta) : '',
    }))
    .filter((t): t is RespostaDeTexto => !!t.gatilho && !!t.resposta && !usados.has(t.gatilho) && !!usados.add(t.gatilho))
    .slice(0, limitesDosComandos.respostasDeTexto)

  return { gatilhos, textos }
}

/**
 * Grupos do `!comandos`. O chat da Twitch não aceita quebra de linha, então
 * a separação é visual, numa mensagem só.
 */
const GRUPOS: { icone: string; acoes: Acao[] }[][] = [
  [
    { icone: '🎲', acoes: ['aleatorio'] },
    { icone: '🧍', acoes: ['humano'] },
    { icone: '🐾', acoes: ['animal'] },
    { icone: '👻', acoes: ['monstro'] },
  ],
  [
    { icone: '🎨', acoes: ['pele'] },
    { icone: '💇', acoes: ['cabelo', 'corCabelo'] },
    { icone: '👕', acoes: ['roupa', 'corRoupa'] },
    { icone: '👀', acoes: ['olho', 'corOlho'] },
    { icone: '🎩', acoes: ['acessorio'] },
  ],
]

/**
 * Texto do `!comandos`, numa mensagem só: um ícone por item, a parte junto
 * da cor dela (`!cabelo + !cor_cabelo`), grupos separados por ┃.
 */
export function listaDeComandos(c: ConfigComandos): string {
  const grupos = GRUPOS.map((itens) =>
    itens
      .map((item) => {
        const gatilhos = item.acoes.map((a) => c.gatilhos[a][0]).filter(Boolean)
        return gatilhos.length ? `${item.icone} ${gatilhos.join(' + ')}` : ''
      })
      .filter(Boolean)
      .join(' · '),
  )
  if (c.textos.length) grupos.push(`💬 ${c.textos.map((t) => t.gatilho).join(' · ')}`)
  return grupos.filter(Boolean).join(' ┃ ')
}
