import { config } from '../config/config'
import {
  comandosPadrao, listaDeComandos, validarComandos, type Acao, type ConfigComandos,
} from '../config/comandos'
import { partesDo } from '../sprites/catalogo'
import { comCor, comParte, skinAleatoria, skinDeSemente, type Skin } from '../sprites/skin'
import type { MensagemDeChat } from '../chat/fonte'
import type { Avatar } from './avatar'
import type { Cena } from './cena'
import { falarNoChat, salvarSkin, segueOCanal } from './servicos'

/**
 * Comandos do chat. Só quem segue o canal usa (mods e a dona sempre podem).
 * Os gatilhos vêm do painel de controle e chegam junto com os ajustes.
 */

let ativos: ConfigComandos = comandosPadrao
const indice = new Map<string, { tipo: 'acao'; acao: Acao } | { tipo: 'texto'; resposta: string }>()

export function aplicarComandos(dados: unknown): void {
  ativos = validarComandos(dados)
  indice.clear()
  for (const [acao, gatilhos] of Object.entries(ativos.gatilhos) as [Acao, string[]][]) {
    for (const g of gatilhos) indice.set(g, { tipo: 'acao', acao })
  }
  for (const t of ativos.textos) indice.set(t.gatilho, { tipo: 'texto', resposta: t.resposta })
}
aplicarComandos(comandosPadrao)

// ---------- skin ----------

/** Índices do `corpo` da criatura que pertencem a cada grupo. */
function corposDoGrupo(grupo: 'animal' | 'monstro'): number[] {
  const animais = new Set<string>(config.grupos.animal)
  return partesDo('criatura', 'corpo')
    .map((p, i) => ({ animal: animais.has(p.nome), i }))
    .filter((p) => p.animal === (grupo === 'animal'))
    .map((p) => p.i)
}

/** Próximo bicho do grupo: se já é um deles, anda um; senão, começa pelo primeiro. */
function virarBicho(skin: Skin, login: string, grupo: 'animal' | 'monstro'): Skin {
  const lista = corposDoGrupo(grupo)
  if (lista.length === 0) return skin
  const base = skin.tipo === 'criatura' ? skin : skinDeSemente(login, 'criatura')
  const atual = lista.indexOf(base.partes['corpo'] ?? -1)
  return comParte(base, 'corpo', lista[(atual + 1) % lista.length]!)
}

function proxima(skin: Skin, tipo: string): Skin {
  return comParte(skin, tipo, (skin.partes[tipo] ?? 0) + 1)
}

/** Skin nova depois da ação. A mesma skin = a ação não vale para este corpo. */
function aplicarAcao(acao: Acao, avatar: Avatar): Skin {
  const s = avatar.skin
  const humano = s.tipo === 'humanoide'
  switch (acao) {
    case 'aleatorio': return skinAleatoria()
    case 'humano': return humano ? s : skinDeSemente(avatar.login, 'humanoide')
    case 'animal': return virarBicho(s, avatar.login, 'animal')
    case 'monstro': return virarBicho(s, avatar.login, 'monstro')
    case 'pele': return humano ? comCor(s, 'pele', s.cores.pele + 1) : s
    case 'cabelo': return humano ? proxima(s, 'cabelo') : s
    case 'corCabelo': return humano ? comCor(s, 'cabelo', s.cores.cabelo + 1) : s
    case 'roupa': return humano ? proxima(s, 'roupa') : s
    case 'corRoupa': return humano ? comCor(s, 'roupa', s.cores.roupa + 1) : comCor(s, 'criatura', s.cores.criatura + 1)
    case 'acessorio': return humano ? proxima(s, 'acessorio') : s
    default: return s
  }
}

// ---------- chat ----------

const ultimoDoViewer = new Map<string, number>()
const ultimaRespostaDoBot = new Map<string, number>()

function responderNoChat(chave: string, texto: string): void {
  const agora = Date.now()
  if (agora - (ultimaRespostaDoBot.get(chave) ?? 0) < config.comandos.esperaDoBot * 1000) return
  ultimaRespostaDoBot.set(chave, agora)
  void falarNoChat(texto)
}

/**
 * Trata a mensagem se for um comando conhecido. Devolve true quando era
 * comando (aí ela não vira balão).
 */
export function tratarComando(mensagem: MensagemDeChat, cena: Cena): boolean {
  if (!mensagem.texto.startsWith('!')) return false
  const gatilho = mensagem.texto.split(/\s+/)[0]!.toLowerCase()
  const comando = indice.get(gatilho)
  if (!comando) return true // comando de outro bot: não vira balão, e só

  if (comando.tipo === 'acao' && comando.acao === 'limpar') {
    if (mensagem.mod) cena.limpar()
    return true
  }

  const agora = Date.now()
  if (agora - (ultimoDoViewer.get(mensagem.login) ?? 0) < config.comandos.esperaPorViewer * 1000) return true
  ultimoDoViewer.set(mensagem.login, agora)

  void (async () => {
    // null = não deu para saber (Supabase fora, Renata não autorizou): libera
    const pode = mensagem.mod || (await segueOCanal(mensagem.id)) !== false
    if (!pode) return

    if (comando.tipo === 'texto') return responderNoChat(gatilho, comando.resposta)
    if (comando.acao === 'comandos') return responderNoChat('comandos', listaDeComandos(ativos))

    const avatar = cena.obter(mensagem.login)
    if (!avatar) return
    await avatar.pronto
    const nova = aplicarAcao(comando.acao, avatar)
    if (nova === avatar.skin) return
    avatar.trocarSkin(nova)
    cena.aoMudar?.()
    if (avatar.twitchId) void salvarSkin(avatar.twitchId, avatar.login, nova)
  })()
  return true
}
