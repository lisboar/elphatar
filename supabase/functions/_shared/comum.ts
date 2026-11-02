import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Código comum das Edge Functions. Fica aqui no repositório e vai junto em
 * cada deploy. Segredos (CHAVE_OVERLAY, TWITCH_CLIENT_SECRET) só nas
 * variáveis do Supabase.
 */

/** App da Twitch (público) e o canal da Renata (ID não muda quando o login muda). */
export const TWITCH_CLIENT_ID = 'rlywmuqxfq1z3uxw75ioo3eb3qtqou'
export const CANAL_ID = '631364773'

/** Cliente com service role: passa por cima do RLS. Nunca sai daqui. */
export const banco = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-chave-overlay',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function responder(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { headers: CORS }) : null
}

/** A chave do overlay vai na URL do OBS e só o overlay da live conhece. */
export function chaveValida(req: Request): boolean {
  // trim: ao colar o segredo no painel do Supabase é fácil levar um espaço junto
  const esperada = Deno.env.get('CHAVE_OVERLAY')?.trim()
  if (!esperada) {
    console.error('CHAVE_OVERLAY não configurada')
    return false
  }
  return req.headers.get('x-chave-overlay')?.trim() === esperada
}

interface RespostaToken {
  access_token: string
  refresh_token: string
  expires_in: number
}

/** Troca um refresh token da Twitch por um access token novo. */
export async function renovarNaTwitch(refreshToken: string): Promise<RespostaToken> {
  const resposta = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: TWITCH_CLIENT_ID,
      client_secret: Deno.env.get('TWITCH_CLIENT_SECRET') ?? '',
    }),
  })
  if (!resposta.ok) throw new Error(`twitch recusou o refresh: ${resposta.status} ${await resposta.text()}`)
  return (await resposta.json()) as RespostaToken
}

/** Pergunta à Twitch se `usuarioId` segue o canal. Null = o token não serve. */
export async function perguntarSeSegue(accessToken: string, usuarioId: string): Promise<boolean | null> {
  const url = new URL('https://api.twitch.tv/helix/channels/followers')
  url.searchParams.set('broadcaster_id', CANAL_ID)
  url.searchParams.set('user_id', usuarioId)
  const resposta = await fetch(url, {
    headers: { 'Client-Id': TWITCH_CLIENT_ID, Authorization: `Bearer ${accessToken}` },
  })
  if (resposta.status === 401 || resposta.status === 403) return null
  if (!resposta.ok) throw new Error(`helix ${resposta.status} ${await resposta.text()}`)
  const corpo = (await resposta.json()) as { data: unknown[] }
  return corpo.data.length > 0
}

/** Linhas da tabela token_twitch. */
export const TOKEN_CANAL = 1
export const TOKEN_BOT = 2

/**
 * Access token guardado, renovado se estiver vencendo.
 * Null = ninguém autorizou ainda.
 */
export async function tokenGuardado(
  id: number,
  forcarRenovacao = false,
): Promise<{ token: string; twitchId: string } | null> {
  const { data: linha } = await banco.from('token_twitch').select('*').eq('id', id).maybeSingle()
  if (!linha) return null

  const valeAte = linha.expira_em ? new Date(linha.expira_em).getTime() : 0
  if (!forcarRenovacao && linha.access_token && valeAte - 60_000 > Date.now()) {
    return { token: linha.access_token, twitchId: linha.twitch_id }
  }

  const novo = await renovarNaTwitch(linha.refresh_token)
  await banco.from('token_twitch').update({
    access_token: novo.access_token,
    refresh_token: novo.refresh_token,
    expira_em: new Date(Date.now() + novo.expires_in * 1000).toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('id', id)
  return { token: novo.access_token, twitchId: linha.twitch_id }
}

export async function tokenDoCanal(forcarRenovacao = false): Promise<string | null> {
  return (await tokenGuardado(TOKEN_CANAL, forcarRenovacao))?.token ?? null
}
