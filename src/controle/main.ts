import { config } from '../config/config'
import { aplicarAjustes, campos, padroes, type Ajustes, type Campo } from '../config/ajustes'
import { comandosPadrao, validarComandos, type ConfigComandos } from '../config/comandos'
import { conectarBot, entrarComTwitch, sair, sessaoAtual, tokenDaTwitchNaVolta, voltouDoBot, type Sessao } from './conta'
import { comandosDoRascunho, montarComandos, mostrarComandos } from './comandos'

/**
 * Painel de controle: a equipe (Thainã e Renata) muda os ajustes do overlay
 * com a live no ar. Grava no Supabase; o overlay confere a cada 15 s.
 * A prévia é o próprio overlay num iframe, com viewers falsos.
 */

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const telaDeEntrar = $('entrar')
const painel = $('painel')
const listaDeCampos = $('campos')
const botaoSalvar = $<HTMLButtonElement>('salvar')
const botaoDesfazer = $<HTMLButtonElement>('desfazer')
const mensagem = $('mensagem')
const NAO_SALVO = 'Mudanças ainda não salvas.'

let salvo: Ajustes = { ...padroes }
let rascunho: Ajustes = { ...padroes }
let comandosSalvos: ConfigComandos = comandosPadrao
let iframe: HTMLIFrameElement | null = null
const atualizarControle = new Map<string, (v: Ajustes[string]) => void>()

function avisar(alvo: HTMLElement, texto: string, erro = false): void {
  alvo.textContent = texto
  alvo.classList.toggle('erro', erro)
}

async function api(caminho: string, opcoes: RequestInit = {}): Promise<Response> {
  const sessao = await sessaoAtual()
  if (!sessao) {
    location.reload()
    throw new Error('sessão vencida')
  }
  const { url, chavePublica } = config.supabase
  return fetch(`${url}${caminho}`, {
    ...opcoes,
    headers: {
      apikey: chavePublica,
      Authorization: `Bearer ${sessao.access_token}`,
      'Content-Type': 'application/json',
      ...opcoes.headers,
    },
  })
}

function hora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatar(campo: Campo, valor: Ajustes[string]): string {
  if (campo.tipo !== 'numero') return String(valor)
  const numero = (valor as number).toLocaleString('pt-BR')
  return campo.unidade === 'x' || campo.unidade === '%' ? `${numero}${campo.unidade}` : `${numero} ${campo.unidade}`.trim()
}

// ---------- prévia ----------

function enviarPrevia(): void {
  iframe?.contentWindow?.postMessage({ tipo: 'elphatar:ajustes', ajustes: rascunho }, location.origin)
}

function montarPrevia(): void {
  const caixa = $('previa')
  iframe = document.createElement('iframe')
  iframe.title = 'Prévia do overlay'
  iframe.src = `${import.meta.env.BASE_URL}?teste=1&falsos=12&previa=1&chat=0`
  iframe.addEventListener('load', enviarPrevia)
  caixa.append(iframe)

  new ResizeObserver(() => {
    if (iframe) iframe.style.transform = `scale(${caixa.clientWidth / config.tela.largura})`
  }).observe(caixa)
}

// ---------- campos ----------

function comandosParaSalvar(): ConfigComandos {
  return validarComandos(comandosDoRascunho())
}

function mudou(): void {
  const diferente =
    campos.some((c) => rascunho[c.chave] !== salvo[c.chave]) ||
    JSON.stringify(comandosParaSalvar()) !== JSON.stringify(comandosSalvos)
  botaoSalvar.disabled = !diferente
  botaoDesfazer.disabled = !diferente
  if (diferente) avisar(mensagem, NAO_SALVO)
  else if (mensagem.textContent === NAO_SALVO) avisar(mensagem, '')
  enviarPrevia()
}

function controle(campo: Campo): HTMLElement {
  const caixa = document.createElement('label')
  caixa.className = `campo ${campo.tipo}`
  const nome = document.createElement('span')
  nome.textContent = campo.rotulo

  if (campo.tipo === 'numero') {
    const linha = document.createElement('span')
    linha.className = 'linha'
    const saida = document.createElement('output')
    linha.append(nome, saida)

    const entrada = document.createElement('input')
    entrada.type = 'range'
    entrada.min = String(campo.min)
    entrada.max = String(campo.max)
    entrada.step = String(campo.passo)
    entrada.addEventListener('input', () => {
      rascunho[campo.chave] = Number(entrada.value)
      saida.textContent = formatar(campo, rascunho[campo.chave]!)
      mudou()
    })
    atualizarControle.set(campo.chave, (v) => {
      entrada.value = String(v)
      saida.textContent = formatar(campo, v)
    })
    caixa.append(linha, entrada)
  } else {
    const entrada = document.createElement('input')
    entrada.type = campo.tipo === 'cor' ? 'color' : 'checkbox'
    entrada.addEventListener('input', () => {
      rascunho[campo.chave] = campo.tipo === 'cor' ? entrada.value : entrada.checked
      mudou()
    })
    atualizarControle.set(campo.chave, (v) => {
      if (campo.tipo === 'cor') entrada.value = String(v)
      else entrada.checked = Boolean(v)
    })
    caixa.append(nome, entrada)
  }

  if (campo.ajuda) {
    const ajuda = document.createElement('span')
    ajuda.className = 'ajuda'
    ajuda.textContent = campo.ajuda
    caixa.append(ajuda)
  }
  return caixa
}

function montarCampos(): void {
  const grupos = new Map<string, HTMLFieldSetElement>()
  for (const campo of campos) {
    let grupo = grupos.get(campo.grupo)
    if (!grupo) {
      grupo = document.createElement('fieldset')
      const legenda = document.createElement('legend')
      legenda.textContent = campo.grupo
      grupo.append(legenda)
      grupos.set(campo.grupo, grupo)
      listaDeCampos.append(grupo)
    }
    grupo.append(controle(campo))
  }
}

function mostrar(valores: Ajustes, comandos: ConfigComandos): void {
  rascunho = { ...valores }
  for (const campo of campos) atualizarControle.get(campo.chave)?.(rascunho[campo.chave]!)
  mostrarComandos(comandos)
  mudou()
}

// ---------- banco ----------

async function carregar(): Promise<void> {
  const resposta = await api('/rest/v1/ajustes?id=eq.1&select=dados,atualizado_em,atualizado_por')
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao carregar os ajustes.`)
  const [linha] = (await resposta.json()) as { dados: unknown; atualizado_em: string; atualizado_por: string | null }[]

  salvo = aplicarAjustes(linha?.dados)
  comandosSalvos = validarComandos((linha?.dados as { comandos?: unknown } | undefined)?.comandos)
  mostrar(salvo, comandosSalvos)
  if (linha?.atualizado_por) {
    avisar(mensagem, `Última mudança: ${hora(linha.atualizado_em)}, por ${linha.atualizado_por}.`)
  }
}

async function salvar(): Promise<void> {
  botaoSalvar.disabled = true
  avisar(mensagem, 'Salvando…')
  const comandos = comandosParaSalvar()
  try {
    const resposta = await api('/rest/v1/ajustes?id=eq.1', {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ dados: { ...rascunho, comandos } }),
    })
    if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao salvar.`)
    const linhas = (await resposta.json()) as { atualizado_em: string }[]
    // o banco devolve vazio quando a conta não é da equipe
    if (linhas.length === 0) throw new Error('Esta conta não tem permissão para mudar o overlay.')

    salvo = { ...rascunho }
    comandosSalvos = comandos
    // mostra como ficou valendo (gatilho inválido ou repetido some aqui)
    mostrarComandos(comandos)
    avisar(mensagem, `Salvo às ${hora(linhas[0]!.atualizado_em)}. O overlay muda em até ${config.conferirAjustesACada} s.`)
  } catch (erro) {
    botaoSalvar.disabled = false
    avisar(mensagem, erro instanceof Error ? erro.message : String(erro), true)
  }
}

interface EstadoDosTokens {
  canal?: { ativo: boolean; login: string | null }
  bot?: { ativo: boolean; login: string | null }
  motivo?: string
}

/**
 * Tokens da Twitch: se acabou de voltar do login com um token novo (da Renata
 * ou da conta-bot), ele vai para o Supabase. Senão, só mostra como está.
 */
async function conferirTokens(): Promise<void> {
  const seguidores = $('seguidores')
  const bot = $('bot')
  const opcoes: RequestInit = tokenDaTwitchNaVolta
    ? {
        method: 'POST',
        body: JSON.stringify({
          papel: voltouDoBot ? 'bot' : 'canal',
          provider_refresh_token: tokenDaTwitchNaVolta,
        }),
      }
    : {}
  try {
    const resposta = await api('/functions/v1/token-twitch', opcoes)
    const estado = (await resposta.json()) as EstadoDosTokens
    seguidores.textContent = estado.canal?.ativo
      ? `Seguidores: ativo (${estado.canal.login})`
      : 'Seguidores: a Renata precisa entrar aqui uma vez'
    bot.textContent = estado.bot?.ativo ? `Bot: ${estado.bot.login}` : 'Bot: não conectado'
    if (estado.motivo && (voltouDoBot || tokenDaTwitchNaVolta)) avisar(mensagem, estado.motivo, true)
  } catch {
    seguidores.textContent = 'Seguidores: não deu para conferir'
  }
}

// ---------- início ----------

async function abrirPainel(sessao: Sessao): Promise<void> {
  telaDeEntrar.hidden = true
  painel.hidden = false
  $('quem').textContent = sessao.user.nome

  const resposta = await api('/rest/v1/rpc/e_da_equipe', { method: 'POST', body: '{}' })
  const daEquipe = resposta.ok && (await resposta.json()) === true

  montarCampos()
  montarComandos($('comandos'), mudou)
  montarPrevia()
  try {
    await carregar()
  } catch (erro) {
    avisar(mensagem, erro instanceof Error ? erro.message : String(erro), true)
  }
  // depois do carregar: o aviso do token (se houver) não pode ser apagado por ele
  if (daEquipe || tokenDaTwitchNaVolta) await conferirTokens()
  if (!daEquipe) {
    avisar(mensagem, 'Esta conta da Twitch ainda não está na equipe: dá para ver, não para salvar.', true)
  }
}

$('botao-twitch').addEventListener('click', entrarComTwitch)
$('conectar-bot').addEventListener('click', (evento) => {
  evento.preventDefault()
  conectarBot()
})

$('sair').addEventListener('click', (evento) => {
  evento.preventDefault()
  sair()
  location.reload()
})

botaoSalvar.addEventListener('click', () => void salvar())
botaoDesfazer.addEventListener('click', () => mostrar(salvo, comandosSalvos))
$('padrao').addEventListener('click', () => mostrar(padroes, comandosPadrao))

window.addEventListener('beforeunload', (evento) => {
  if (!botaoSalvar.disabled) evento.preventDefault()
})

try {
  const sessao = await sessaoAtual()
  if (sessao) await abrirPainel(sessao)
  else telaDeEntrar.hidden = false
} catch (erro) {
  telaDeEntrar.hidden = false
  avisar($('mensagem-entrar'), erro instanceof Error ? erro.message : String(erro), true)
}
