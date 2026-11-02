import {
  ACOES, descricoes, gatilhoValido, limitesDosComandos, listaDeComandos, validarComandos,
  type Acao, type ConfigComandos, type RespostaDeTexto,
} from '../config/comandos'

/**
 * Seção "Comandos" do painel: renomear os gatilhos de cada ação e manter as
 * respostas de texto do bot. Trabalha num rascunho; quem salva é o main.
 */

let rascunho: ConfigComandos = validarComandos(null)
let aoMudar: () => void = () => {}

let caixaDasAcoes: HTMLElement
let caixaDosTextos: HTMLElement
let previa: HTMLElement
let botaoAdicionar: HTMLButtonElement
const entradasDasAcoes = new Map<Acao, HTMLInputElement>()

export function comandosDoRascunho(): ConfigComandos {
  return rascunho
}

function mudou(): void {
  previa.textContent = listaDeComandos(validarComandos(rascunho))
  botaoAdicionar.disabled = rascunho.textos.length >= limitesDosComandos.respostasDeTexto
  aoMudar()
}

/** "!a !b" → lista; marca a entrada se algum gatilho não vale. */
function lerGatilhos(entrada: HTMLInputElement): string[] {
  const partes = entrada.value.split(/[\s,]+/).filter(Boolean)
  const validos = partes.map(gatilhoValido)
  entrada.classList.toggle('invalido', validos.some((g) => !g))
  return validos.filter((g): g is string => !!g)
}

function linhaDeTexto(texto: RespostaDeTexto): HTMLElement {
  const linha = document.createElement('div')
  linha.className = 'resposta'

  const gatilho = document.createElement('input')
  gatilho.placeholder = '!discord'
  gatilho.value = texto.gatilho
  gatilho.addEventListener('input', () => {
    texto.gatilho = gatilho.value.trim().toLowerCase()
    gatilho.classList.toggle('invalido', !!texto.gatilho && !gatilhoValido(texto.gatilho))
    mudou()
  })

  const resposta = document.createElement('input')
  resposta.placeholder = 'O que o bot responde'
  resposta.maxLength = limitesDosComandos.tamanhoDaResposta
  resposta.value = texto.resposta
  resposta.addEventListener('input', () => {
    texto.resposta = resposta.value
    mudou()
  })

  const remover = document.createElement('button')
  remover.type = 'button'
  remover.textContent = 'remover'
  remover.addEventListener('click', () => {
    rascunho.textos = rascunho.textos.filter((t) => t !== texto)
    linha.remove()
    mudou()
  })

  linha.append(gatilho, resposta, remover)
  return linha
}

export function montarComandos(destino: HTMLElement, callback: () => void): void {
  aoMudar = callback

  const grupo = document.createElement('fieldset')
  grupo.innerHTML = '<legend>Comandos</legend>'
  const ajuda = document.createElement('span')
  ajuda.className = 'ajuda'
  ajuda.textContent = `Até ${limitesDosComandos.gatilhosPorAcao} nomes por ação, separados por espaço. Sempre começando com !`
  caixaDasAcoes = document.createElement('div')
  caixaDasAcoes.className = 'acoes-de-comando'

  for (const acao of ACOES) {
    const rotulo = document.createElement('label')
    rotulo.className = 'campo comando'
    const nome = document.createElement('span')
    nome.textContent = descricoes[acao]
    const entrada = document.createElement('input')
    entrada.addEventListener('input', () => {
      rascunho.gatilhos[acao] = lerGatilhos(entrada)
      mudou()
    })
    entradasDasAcoes.set(acao, entrada)
    rotulo.append(nome, entrada)
    caixaDasAcoes.append(rotulo)
  }
  grupo.append(ajuda, caixaDasAcoes)

  const textos = document.createElement('fieldset')
  textos.innerHTML = '<legend>Respostas de texto do bot</legend>'
  caixaDosTextos = document.createElement('div')
  caixaDosTextos.className = 'respostas'
  botaoAdicionar = document.createElement('button')
  botaoAdicionar.type = 'button'
  botaoAdicionar.textContent = '+ resposta'
  botaoAdicionar.addEventListener('click', () => {
    const nova = { gatilho: '', resposta: '' }
    rascunho.textos.push(nova)
    const linha = linhaDeTexto(nova)
    caixaDosTextos.append(linha)
    linha.querySelector('input')?.focus()
    mudou()
  })
  const tituloPrevia = document.createElement('span')
  tituloPrevia.className = 'ajuda'
  tituloPrevia.textContent = 'O bot responde ao !comandos com:'
  previa = document.createElement('div')
  previa.className = 'previa-texto'
  textos.append(caixaDosTextos, botaoAdicionar, tituloPrevia, previa)

  destino.append(grupo, textos)
}

/** Mostra uma configuração (a salva ou a padrão) e passa a editar uma cópia dela. */
export function mostrarComandos(c: ConfigComandos): void {
  rascunho = {
    gatilhos: Object.fromEntries(ACOES.map((a) => [a, [...c.gatilhos[a]]])) as Record<Acao, string[]>,
    textos: c.textos.map((t) => ({ ...t })),
  }
  for (const [acao, entrada] of entradasDasAcoes) {
    entrada.value = rascunho.gatilhos[acao].join(' ')
    entrada.classList.remove('invalido')
  }
  caixaDosTextos.replaceChildren(...rascunho.textos.map(linhaDeTexto))
  mudou()
}
