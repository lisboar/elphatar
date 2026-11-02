import { config } from '../config/config'
import { ambiente } from '../config/ambiente'
import { skinValida, type Skin } from '../sprites/skin'

/**
 * O overlay falando com o Supabase: skins e "segue o canal?".
 *
 * - Ler skin é público (API REST). Gravar skin e perguntar de seguidor
 *   precisam da chave do overlay, que só existe na URL do OBS (`?chave=`).
 * - Limite de pedidos por minuto, contra loop de bug estourar o plano grátis.
 * - Se o Supabase falhar, tudo devolve null e o overlay segue com o que tem.
 */

const pedidos: number[] = []

/** Janela deslizante de 1 minuto. */
function podePedir(): boolean {
  const agora = Date.now()
  while (pedidos.length > 0 && agora - pedidos[0]! > 60_000) pedidos.shift()
  if (pedidos.length >= config.supabase.limitePorMinuto) {
    console.warn('[supabase] limite de pedidos por minuto, pulando')
    return false
  }
  pedidos.push(agora)
  return true
}

async function pedir<T>(caminho: string, opcoes: RequestInit = {}): Promise<T | null> {
  if (!podePedir()) return null
  const { url, chavePublica } = config.supabase
  try {
    const resposta = await fetch(`${url}${caminho}`, {
      ...opcoes,
      headers: {
        apikey: chavePublica,
        ...(ambiente.chaveOverlay ? { 'x-chave-overlay': ambiente.chaveOverlay } : {}),
        ...opcoes.headers,
      },
    })
    if (!resposta.ok) {
      console.warn(`[supabase] ${caminho.split('?')[0]} respondeu ${resposta.status}`)
      return null
    }
    return (await resposta.json()) as T
  } catch (erro) {
    console.warn('[supabase] sem resposta', erro)
    return null
  }
}

/** Skin salva do viewer. Null = nunca salvou (ou não deu para saber). */
export async function buscarSkin(twitchId: string): Promise<Skin | null> {
  const linhas = await pedir<{ skin: unknown }[]>(
    `/rest/v1/skins?twitch_id=eq.${encodeURIComponent(twitchId)}&select=skin`,
  )
  return linhas?.[0] ? skinValida(linhas[0].skin) : null
}

export async function salvarSkin(twitchId: string, login: string, skin: Skin): Promise<boolean> {
  if (!ambiente.chaveOverlay) return false
  const resposta = await pedir<{ ok: boolean }>('/functions/v1/skin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: twitchId, login, skin }),
  })
  return resposta?.ok === true
}

/** A conta-bot escreve no chat. False = não foi (sem chave, bot não conectado, Twitch recusou). */
export async function falarNoChat(mensagem: string): Promise<boolean> {
  if (!ambiente.chaveOverlay) return false
  const resposta = await pedir<{ ok: boolean; motivo?: string }>('/functions/v1/falar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem }),
  })
  if (resposta && !resposta.ok) console.warn('[bot]', resposta.motivo)
  return resposta?.ok === true
}

/** Cache da sessão: quem segue não é perguntado de novo. */
const seguidores = new Map<string, { segue: boolean; em: number }>()

/** O viewer segue o canal? Null = não deu para saber (sem chave, sem token, fora do ar). */
export async function segueOCanal(twitchId: string): Promise<boolean | null> {
  const guardado = seguidores.get(twitchId)
  const validade = config.supabase.recheckarNaoSeguidorEm * 1000
  if (guardado && (guardado.segue || Date.now() - guardado.em < validade)) return guardado.segue

  if (!ambiente.chaveOverlay) return null
  const resposta = await pedir<{ segue: boolean | null }>(
    `/functions/v1/seguidor?id=${encodeURIComponent(twitchId)}`,
  )
  if (typeof resposta?.segue !== 'boolean') return null
  seguidores.set(twitchId, { segue: resposta.segue, em: Date.now() })
  return resposta.segue
}
