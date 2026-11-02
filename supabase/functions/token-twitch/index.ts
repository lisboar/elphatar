import { banco, CANAL_ID, preflight, renovarNaTwitch, responder, TOKEN_BOT, TOKEN_CANAL } from '../_shared/comum.ts'

/**
 * Tokens da Twitch guardados no Supabase. Chamada pelo painel de controle,
 * com a sessão de quem está logado (Authorization: Bearer <jwt>).
 *
 * GET → { canal: {ativo, login}, bot: {ativo, login} }
 *
 * POST { papel: 'canal', provider_refresh_token }
 *   Token que lê seguidores. Só a conta da Renata serve: para quem não é dono
 *   nem mod, a Twitch não dá erro, só responde "não segue" para todo mundo.
 *
 * POST { papel: 'bot', provider_refresh_token }
 *   Token da conta-bot, que escreve no chat. Quem chama é alguém da equipe
 *   (o painel guarda a sessão da equipe enquanto o bot autoriza).
 */

const ESCOPOS = { canal: 'moderator:read:followers', bot: 'user:write:chat' }

async function quemChamou(req: Request) {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  if (!jwt) return null
  const { data } = await banco.auth.getUser(jwt)
  const identidade = data.user?.identities?.find((i) => i.provider === 'twitch')
  if (!identidade) return null
  const dados = identidade.identity_data ?? {}
  return { twitchId: String(dados.provider_id ?? dados.sub ?? identidade.id) }
}

async function daEquipe(twitchId: string): Promise<boolean> {
  if (twitchId === CANAL_ID) return true
  const { data } = await banco.from('equipe').select('twitch_id').eq('twitch_id', twitchId).maybeSingle()
  return !!data
}

async function estado() {
  const { data } = await banco.from('token_twitch').select('id, login')
  const linha = (id: number) => data?.find((l) => l.id === id)
  return {
    canal: { ativo: !!linha(TOKEN_CANAL), login: linha(TOKEN_CANAL)?.login ?? null },
    bot: { ativo: !!linha(TOKEN_BOT), login: linha(TOKEN_BOT)?.login ?? null },
  }
}

Deno.serve(async (req) => {
  const opcoes = preflight(req)
  if (opcoes) return opcoes

  const quem = await quemChamou(req)
  if (!quem || !(await daEquipe(quem.twitchId))) return responder({ erro: 'só a equipe' }, 403)

  if (req.method === 'GET') return responder(await estado())
  if (req.method !== 'POST') return responder({ erro: 'use GET ou POST' }, 405)

  const corpo = (await req.json().catch(() => ({}))) as { papel?: string; provider_refresh_token?: string }
  const papel = corpo.papel === 'bot' ? 'bot' : 'canal'
  if (!corpo.provider_refresh_token) return responder({ erro: 'sem token da Twitch' }, 400)
  if (papel === 'canal' && quem.twitchId !== CANAL_ID) {
    return responder({ ...(await estado()), motivo: 'só a conta do canal autoriza os seguidores' })
  }

  try {
    const novo = await renovarNaTwitch(corpo.provider_refresh_token)
    const validacao = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${novo.access_token}` },
    })
    const info = (await validacao.json()) as { user_id?: string; login?: string; scopes?: string[] }
    if (!info.user_id || !info.scopes?.includes(ESCOPOS[papel])) {
      return responder({ ...(await estado()), motivo: `a Twitch não deu a permissão ${ESCOPOS[papel]}` })
    }
    if (papel === 'canal' && info.user_id !== CANAL_ID) {
      return responder({ ...(await estado()), motivo: 'o token não é da conta do canal' })
    }

    await banco.from('token_twitch').upsert({
      id: papel === 'bot' ? TOKEN_BOT : TOKEN_CANAL,
      twitch_id: info.user_id,
      login: info.login ?? '',
      refresh_token: novo.refresh_token,
      access_token: novo.access_token,
      expira_em: new Date(Date.now() + novo.expires_in * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    return responder(await estado())
  } catch (erro) {
    console.error(erro)
    return responder({ erro: 'a Twitch recusou o token' }, 502)
  }
})
