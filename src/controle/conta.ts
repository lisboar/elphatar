import { config } from '../config/config'

/**
 * Login da equipe com a conta da Twitch, pelo Supabase Auth, direto pela API
 * (sem o supabase-js). A sessão fica no localStorage deste navegador.
 *
 * Fluxo: o botão manda para a Twitch, a Twitch volta para o Supabase, e o
 * Supabase volta para esta página com os tokens depois do `#` da URL.
 */

export interface Sessao {
  access_token: string
  refresh_token: string
  /** Segundos desde 1970. */
  expires_at: number
  user: { id: string; nome: string }
}

const GUARDADA = 'elphatar:controle:sessao'

function guardar(sessao: Sessao): Sessao {
  try {
    localStorage.setItem(GUARDADA, JSON.stringify(sessao))
  } catch {
    // sem storage: vai pedir o login de novo ao recarregar
  }
  return sessao
}

function nomeDoUsuario(usuario: { user_metadata?: Record<string, unknown> }): string {
  const meta = usuario.user_metadata ?? {}
  return String(meta['nickname'] ?? meta['name'] ?? meta['full_name'] ?? 'sem nome')
}

export function entrarComTwitch(): void {
  const { url } = config.supabase
  const volta = location.origin + location.pathname
  const parametros = new URLSearchParams({
    provider: 'twitch',
    redirect_to: volta,
    // seguidores: só funciona para a dona do canal ou mods; para os outros é inofensivo
    scopes: config.twitch.escopos.join(' '),
  })
  location.href = `${url}/auth/v1/authorize?${parametros}`
}

/** Lê os tokens que o Supabase deixou na URL ao voltar do login. */
async function lerVoltaDoLogin(): Promise<Sessao | null> {
  if (!location.hash.includes('access_token') && !location.hash.includes('error')) return null
  const dados = new URLSearchParams(location.hash.slice(1))
  history.replaceState(null, '', location.pathname + location.search)

  const erro = dados.get('error_description')
  if (erro) throw new Error(`A Twitch não autorizou: ${erro}`)

  const access_token = dados.get('access_token')!
  const { url, chavePublica } = config.supabase
  const resposta = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: chavePublica, Authorization: `Bearer ${access_token}` },
  })
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao ler a conta.`)
  const usuario = (await resposta.json()) as { id: string; user_metadata?: Record<string, unknown> }

  return guardar({
    access_token,
    refresh_token: dados.get('refresh_token')!,
    expires_at: Number(dados.get('expires_at')),
    user: { id: usuario.id, nome: nomeDoUsuario(usuario) },
  })
}

async function renovar(sessao: Sessao): Promise<Sessao> {
  const { url, chavePublica } = config.supabase
  const resposta = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: chavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sessao.refresh_token }),
  })
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao renovar a sessão.`)
  const nova = (await resposta.json()) as Omit<Sessao, 'user'>
  return guardar({ ...nova, user: sessao.user })
}

export function sair(): void {
  try {
    localStorage.removeItem(GUARDADA)
  } catch {
    // nada guardado
  }
}

/** Sessão atual (da volta do login ou guardada), renovada se perto de vencer. Null = precisa entrar. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const voltando = await lerVoltaDoLogin()
  if (voltando) return voltando

  let sessao: Sessao | null = null
  try {
    const bruto = localStorage.getItem(GUARDADA)
    sessao = bruto ? (JSON.parse(bruto) as Sessao) : null
  } catch {
    return null
  }
  if (!sessao) return null
  if (sessao.expires_at - 60 > Date.now() / 1000) return sessao

  try {
    return await renovar(sessao)
  } catch {
    sair()
    return null
  }
}
