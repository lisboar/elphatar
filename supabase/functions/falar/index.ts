import { CANAL_ID, chaveValida, preflight, responder, tokenGuardado, TOKEN_BOT, TWITCH_CLIENT_ID } from '../_shared/comum.ts'

/**
 * POST /falar  { mensagem }  (header x-chave-overlay)
 * A conta-bot escreve no chat do canal. Usado pelo overlay para responder
 * comandos (`!comandos` e as respostas de texto do painel).
 */

const MAXIMO = 450

async function enviar(token: string, botId: string, mensagem: string): Promise<Response> {
  return fetch('https://api.twitch.tv/helix/chat/messages', {
    method: 'POST',
    headers: {
      'Client-Id': TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ broadcaster_id: CANAL_ID, sender_id: botId, message: mensagem }),
  })
}

Deno.serve(async (req) => {
  const opcoes = preflight(req)
  if (opcoes) return opcoes
  if (!chaveValida(req)) return responder({ erro: 'chave do overlay inválida' }, 401)
  if (req.method !== 'POST') return responder({ erro: 'use POST' }, 405)

  const { mensagem } = (await req.json().catch(() => ({}))) as { mensagem?: unknown }
  if (typeof mensagem !== 'string' || !mensagem.trim()) return responder({ erro: 'mensagem vazia' }, 400)
  const texto = mensagem.trim().slice(0, MAXIMO)

  try {
    let bot = await tokenGuardado(TOKEN_BOT)
    if (!bot) return responder({ ok: false, motivo: 'a conta-bot ainda não foi conectada' }, 503)

    let resposta = await enviar(bot.token, bot.twitchId, texto)
    if (resposta.status === 401) {
      bot = await tokenGuardado(TOKEN_BOT, true)
      if (bot) resposta = await enviar(bot.token, bot.twitchId, texto)
    }
    if (!resposta.ok) {
      console.error('helix chat', resposta.status, await resposta.text())
      return responder({ ok: false, motivo: `a Twitch recusou (${resposta.status})` }, 502)
    }
    const corpo = (await resposta.json()) as { data?: { is_sent?: boolean; drop_reason?: { message?: string } }[] }
    const enviada = corpo.data?.[0]
    if (!enviada?.is_sent) return responder({ ok: false, motivo: enviada?.drop_reason?.message ?? 'não enviada' })
    return responder({ ok: true })
  } catch (erro) {
    console.error(erro)
    return responder({ ok: false, motivo: 'erro ao falar com a Twitch' }, 502)
  }
})
