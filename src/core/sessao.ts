import { config } from '../config/config'
import type { Cena } from './cena'
import type { Skin } from '../sprites/skin'

/**
 * Regra 2 do projeto: quem está na tela volta se o browser source recarregar.
 *
 * A lista fica no localStorage do OBS. Uma live nova começa quando o overlay
 * passa `config.sessao.horasParaNovaLive` sem rodar, ou quando um mod usa
 * `!limpar`.
 */

interface Guardado {
  salvoEm: number
  avatares: { login: string; nome: string; skin: Skin }[]
}

const chave = (canal: string) => `elphatar:sessao:${canal}`

function ler(canal: string): Guardado | null {
  try {
    const bruto = localStorage.getItem(chave(canal))
    return bruto ? (JSON.parse(bruto) as Guardado) : null
  } catch {
    return null
  }
}

function gravar(canal: string, cena: Cena): void {
  const guardado: Guardado = {
    salvoEm: Date.now(),
    avatares: cena.lista.map((a) => ({ login: a.login, nome: a.nome, skin: a.skin })),
  }
  try {
    localStorage.setItem(chave(canal), JSON.stringify(guardado))
  } catch {
    // sem storage (modo privado, cota cheia): o overlay segue, só não lembra
  }
}

/** Devolve quem estava na tela e passa a salvar a cena sozinho. */
export function manterSessao(canal: string, cena: Cena): void {
  const guardado = ler(canal)
  const limite = config.sessao.horasParaNovaLive * 60 * 60 * 1000

  if (guardado && Date.now() - guardado.salvoEm < limite) {
    for (const a of guardado.avatares) cena.entrar(a.login, a.nome, a.skin)
    console.info(`[sessão] ${guardado.avatares.length} avatares de volta`)
  }

  // salva logo depois de cada mudança, juntando as que vêm em rajada
  let pendente: ReturnType<typeof setTimeout> | null = null
  cena.aoMudar = () => {
    if (pendente) return
    pendente = setTimeout(() => {
      pendente = null
      gravar(canal, cena)
    }, 1000)
  }

  // e de tempos em tempos, para o relógio da sessão andar mesmo sem chat
  gravar(canal, cena)
  setInterval(() => gravar(canal, cena), config.sessao.salvarACada * 1000)
}
