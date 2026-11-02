import { config } from '../config/config'
import { aplicarAjustes } from '../config/ajustes'
import { aplicarComandos } from './comandos'

/**
 * O overlay confere os ajustes do painel no Supabase de tempos em tempos.
 * Sem Realtime, de propósito: uma leitura a cada 15 s pesa quase nada.
 *
 * O último ajuste fica guardado localmente: com o Supabase fora do ar, o
 * overlay abre do jeito que estava.
 */

const GUARDADO = 'elphatar:ajustes'

let ultimaVersao = ''

function aplicarSeMudou(versao: string, dados: unknown): void {
  if (versao === ultimaVersao) return
  ultimaVersao = versao
  aplicarAjustes(dados)
  aplicarComandos((dados as { comandos?: unknown } | null)?.comandos)
  console.info(`[ajustes] aplicados (${versao || 'cache'})`)
}

async function conferir(): Promise<void> {
  const { url, chavePublica } = config.supabase
  try {
    const resposta = await fetch(`${url}/rest/v1/ajustes?id=eq.1&select=dados,atualizado_em`, {
      headers: { apikey: chavePublica },
      cache: 'no-store',
    })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
    const [linha] = (await resposta.json()) as { dados: unknown; atualizado_em: string }[]
    if (!linha) return

    aplicarSeMudou(linha.atualizado_em, linha.dados)
    try {
      localStorage.setItem(GUARDADO, JSON.stringify(linha))
    } catch {
      // sem storage: só não abre com o último ajuste
    }
  } catch (erro) {
    console.warn('[ajustes] não deu para conferir agora', erro)
  }
}

export function acompanharAjustes(): void {
  try {
    const guardado = localStorage.getItem(GUARDADO)
    if (guardado) {
      const linha = JSON.parse(guardado) as { dados: unknown; atualizado_em: string }
      aplicarSeMudou(linha.atualizado_em, linha.dados)
    }
  } catch {
    // cache corrompido: fica com o padrão até a primeira leitura
  }

  void conferir()
  setInterval(() => void conferir(), config.conferirAjustesACada * 1000)
}

/**
 * Prévia do painel de controle: o painel abre o overlay num iframe e manda o
 * rascunho por mensagem, sem passar pelo banco.
 */
export function ouvirPrevia(): void {
  window.addEventListener('message', (evento) => {
    if (evento.origin !== location.origin) return
    const dados = evento.data as { tipo?: string; ajustes?: unknown }
    if (dados?.tipo === 'elphatar:ajustes') aplicarAjustes(dados.ajustes)
  })
}
