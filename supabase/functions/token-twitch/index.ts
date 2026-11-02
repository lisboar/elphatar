import { banco, CANAL_ID, preflight, renovarNaTwitch, responder } from '../_shared/comum.ts'

/**
 * Token que lê os seguidores do canal. Chamada pelo painel de controle, com
 * a sessão de quem entrou com a Twitch (Authorization: Bearer <jwt>).
 *
 * GET  → { ativo, login }  como está a leitura de seguidores
 * POST { provider_refresh_token } → guarda o token, se for da conta do canal.
 *
 * Só a conta da Renata serve: para quem não é dono nem mod, a Twitch não dá
 * erro, só responde "não segue" para todo mundo, e não dá para notar.
 */

const ESCOPO = 'moderator:read:followers'

async function quemChamou(req: Request) {
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  if (!jwt) return null
  const { data } = await banco.auth.getUser(jwt)
  const identidade = data.user?.identities?.find((i) => i.provider === 'twitch')
  if (!identidade) return null
  const dados = identidade.identity_data ?? {}
  return {
    twitchId: String(dados.provider_id ?? dados.sub ?? identidade.id),
    login: String(dados.nickname ?? dados.name ?? '').toLowerCase(),
  }
}

async function daEquipe(twitchId: string): Promise<boolean> {
  if (twitchId === CANAL_ID) return true
  const { data } = await banco.from('equipe').select('twitch_id').eq('twitch_id', twitchId).maybeSingle()
  return !!data
}

Deno.serve(async (req) => {
  const opcoes = preflight(req)
  if (opcoes) return opcoes

  const quem = await quemChamou(req)
  if (!quem || !(await daEquipe(quem.twitchId))) return responder({ erro: 'só a equipe' }, 403)

  const { data: atual } = await banco.from('token_twitch').select('login').eq('id', 1).maybeSingle()
  if (req.method === 'GET') return responder({ ativo: !!atual, login: atual?.login ?? null })
  if (req.method !== 'POST') return responder({ erro: 'use GET ou POST' }, 405)

  if (quem.twitchId !== CANAL_ID) {
    return responder({ ativo: !!atual, login: atual?.login ?? null, motivo: 'só a conta do canal autoriza' })
  }

  const { provider_refresh_token } = (await req.json().catch(() => ({}))) as { provider_refresh_token?: string }
  if (!provider_refresh_token) return responder({ erro: 'sem token da Twitch' }, 400)

  try {
    const novo = await renovarNaTwitch(provider_refresh_token)

    const validacao = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: { Authorization: `OAuth ${novo.access_token}` },
    })
    const info = (await validacao.json()) as { user_id?: string; scopes?: string[] }
    if (info.user_id !== CANAL_ID || !info.scopes?.includes(ESCOPO)) {
      return responder({ ativo: !!atual, login: atual?.login ?? null, motivo: 'a Twitch não deu a permissão de seguidores' })
    }

    await banco.from('token_twitch').upsert({
      id: 1,
      twitch_id: quem.twitchId,
      login: quem.login,
      refresh_token: novo.refresh_token,
      access_token: novo.access_token,
      expira_em: new Date(Date.now() + novo.expires_in * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    return responder({ ativo: true, login: quem.login })
  } catch (erro) {
    console.error(erro)
    return responder({ erro: 'a Twitch recusou o token' }, 502)
  }
})
