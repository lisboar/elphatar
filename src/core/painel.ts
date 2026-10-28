import { config } from '../config/config'
import type { Cena } from './cena'
import { skinAleatoria } from '../sprites/skin'

/**
 * Painel de teste: um chat falso, para ver a cena funcionando sem depender da
 * Twitch. Só aparece com `?teste=1` e nunca entra no OBS.
 */

const NOMES = [
  'renata', 'thaina', 'jujuba', 'pedrinho', 'lulu', 'zed', 'mari', 'tatu',
  'kiko', 'bibi', 'nono', 'vivi', 'duda', 'gui', 'rafa', 'nina', 'tom',
  'bia', 'leo', 'cacau', 'pipoca', 'manu', 'juca', 'lia', 'bento', 'sol',
  'theo', 'ana', 'caio', 'malu',
]

const FRASES = [
  'oi gente',
  'vamo que vamo',
  'essa jogada foi insana',
  'kkkkkkk',
  'boa noite pessoal',
  'alguem viu esse clutch',
  'eu to no bronze ainda',
  'renata joga muito',
  'to adorando o overlay novo',
  'posso jogar com voces depois',
  'esse ace foi limpo demais',
  'chat ta voando hoje',
]

function sortear<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]!
}

function botao(texto: string, aoClicar: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.textContent = texto
  b.addEventListener('click', aoClicar)
  return b
}

export function montarPainel(
  cena: Cena,
  fps: () => number,
  falsos = 0,
  custo: () => number = () => 0,
): void {
  const painel = document.createElement('div')
  painel.className = 'painel'

  const contador = document.createElement('div')
  contador.className = 'contador'

  const entrar = (quantos: number) => {
    for (let i = 0; i < quantos; i++) {
      const nome = `${sortear(NOMES)}${Math.floor(Math.random() * 90) + 10}`
      cena.entrar(nome)?.falar(sortear(FRASES))
    }
  }

  const falar = () => {
    const lista = cena.lista
    if (lista.length === 0) return
    sortear(lista).falar(sortear(FRASES))
  }

  painel.append(
    botao('+1 viewer', () => entrar(1)),
    botao('+10', () => entrar(10)),
    botao('+30', () => entrar(30)),
    botao('alguém fala', falar),
    botao('todo mundo fala', () => {
      for (const a of cena.lista) a.falar(sortear(FRASES))
    }),
    botao('trocar skins', () => {
      for (const a of cena.lista) a.trocarSkin(skinAleatoria())
    }),
    botao('!limpar', () => cena.limpar()),
    contador,
  )
  document.body.append(painel)
  if (falsos > 0) entrar(falsos)

  // um viewer novo de vez em quando, para a cena nao ficar parada
  const automatico = setInterval(() => {
    if (cena.quantidade < 12) entrar(1)
    else falar()
  }, 2500)
  window.addEventListener('beforeunload', () => clearInterval(automatico))

  setInterval(() => {
    contador.textContent =
      `${cena.quantidade}/${config.limiteDeAvatares} avatares · ${fps()} fps · ` +
      `${custo()} ms por quadro`
  }, 250)
}
