import { config } from '../config/config'

/**
 * Login da equipe no Supabase Auth, direto pela API, sem o supabase-js.
 * A sessão fica no localStorage deste navegador.
 */

export interface Sessao {
  access_token: string
  refresh_token: string
  /** Segundos desde 1970. */
  expires_at: number
  user: { id: string; email?: string }
}

const GUARDADA = 'elphatar:controle:sessao'

async function pedirToken(tipo: 'password' | 'refresh_token', corpo: object): Promise<Sessao> {
  const { url, chavePublica } = config.supabase
  const resposta = await fetch(`${url}/auth/v1/token?grant_type=${tipo}`, {
    method: 'POST',
    headers: { apikey: chavePublica, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) {
    const erro = (await resposta.json().catch(() => ({}))) as { error_code?: string }
    throw new Error(erro.error_code === 'invalid_credentials' ? 'E-mail ou senha errados.' : `Erro ${resposta.status} ao entrar.`)
  }
  const sessao = (await resposta.json()) as Sessao
  try {
    localStorage.setItem(GUARDADA, JSON.stringify(sessao))
  } catch {
    // sem storage: vai pedir a senha de novo ao recarregar
  }
  return sessao
}

export function entrar(email: string, senha: string): Promise<Sessao> {
  return pedirToken('password', { email, password: senha })
}

export function sair(): void {
  try {
    localStorage.removeItem(GUARDADA)
  } catch {
    // nada guardado
  }
}

/** Sessão guardada, renovada se estiver perto de vencer. Null = precisa entrar. */
export async function sessaoAtual(): Promise<Sessao | null> {
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
    return await pedirToken('refresh_token', { refresh_token: sessao.refresh_token })
  } catch {
    sair()
    return null
  }
}
