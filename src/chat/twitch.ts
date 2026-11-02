import type { FonteDeChat, MensagemDeChat } from './fonte'

/**
 * Chat da Twitch lido anonimamente pelo IRC (WebSocket), sem token e sem
 * dependência. O login `justinfan<número>` é o modo só-leitura da Twitch:
 * recebe tudo do chat, mas não pode mandar mensagem.
 */

const ENDERECO = 'wss://irc-ws.chat.twitch.tv:443'

/** A Twitch manda PING a cada ~5 min. Sem nada por mais tempo, a conexão morreu calada. */
const SILENCIO_MAXIMO = 6 * 60 * 1000
const ESPERA_MINIMA = 1000
const ESPERA_MAXIMA = 30 * 1000

interface LinhaIrc {
  tags: Record<string, string>
  prefixo: string
  comando: string
  parametros: string[]
}

/** Valores de tag vêm com escape: `\s` é espaço, `\:` é ponto e vírgula. */
function desescapar(valor: string): string {
  return valor.replace(/\\(.)/g, (_, c: string) =>
    c === 's' ? ' ' : c === ':' ? ';' : c === 'r' ? '\r' : c === 'n' ? '\n' : c,
  )
}

/** `@tags :prefixo COMANDO param1 param2 :texto final` */
function lerLinha(linha: string): LinhaIrc {
  let resto = linha
  const tags: Record<string, string> = {}

  if (resto.startsWith('@')) {
    const fim = resto.indexOf(' ')
    for (const par of resto.slice(1, fim).split(';')) {
      const igual = par.indexOf('=')
      if (igual > 0) tags[par.slice(0, igual)] = desescapar(par.slice(igual + 1))
    }
    resto = resto.slice(fim + 1)
  }

  let prefixo = ''
  if (resto.startsWith(':')) {
    const fim = resto.indexOf(' ')
    prefixo = resto.slice(1, fim)
    resto = resto.slice(fim + 1)
  }

  const doisPontos = resto.indexOf(' :')
  const final = doisPontos >= 0 ? resto.slice(doisPontos + 2) : null
  const partes = (doisPontos >= 0 ? resto.slice(0, doisPontos) : resto).split(' ').filter(Boolean)
  const comando = partes.shift() ?? ''
  if (final !== null) partes.push(final)

  return { tags, prefixo, comando, parametros: partes }
}

/** `/me texto` chega embrulhado em \x01ACTION ...\x01. */
function limparTexto(texto: string): string {
  const acao = /^\x01ACTION (.*)\x01$/.exec(texto)
  return (acao ? acao[1]! : texto).trim()
}

export class ChatTwitch implements FonteDeChat {
  private readonly canal: string
  private socket: WebSocket | null = null
  private aoReceber: ((mensagem: MensagemDeChat) => void) | null = null
  private espera = ESPERA_MINIMA
  private religar: ReturnType<typeof setTimeout> | null = null
  private vigia: ReturnType<typeof setTimeout> | null = null
  private ligado = false

  constructor(canal: string) {
    this.canal = canal.toLowerCase().replace(/^#/, '')
  }

  conectar(aoReceber: (mensagem: MensagemDeChat) => void): void {
    this.aoReceber = aoReceber
    this.ligado = true
    this.abrir()
  }

  desconectar(): void {
    this.ligado = false
    if (this.religar) clearTimeout(this.religar)
    if (this.vigia) clearTimeout(this.vigia)
    this.socket?.close()
    this.socket = null
  }

  private abrir(): void {
    const socket = new WebSocket(ENDERECO)
    this.socket = socket

    socket.addEventListener('open', () => {
      socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands')
      socket.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`)
      socket.send(`JOIN #${this.canal}`)
      this.vigiar()
    })

    socket.addEventListener('message', (evento) => {
      this.vigiar()
      for (const linha of String(evento.data).split('\r\n')) {
        if (linha) this.tratar(lerLinha(linha))
      }
    })

    // 'error' sempre vem seguido de 'close'; a reconexão fica num lugar só
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return
      this.socket = null
      this.agendarReconexao()
    })
  }

  private tratar(linha: LinhaIrc): void {
    switch (linha.comando) {
      case 'PING':
        this.socket?.send(`PONG :${linha.parametros[0] ?? 'tmi.twitch.tv'}`)
        break

      case 'ROOMSTATE':
        // entrou no canal: a conexão está boa, a próxima queda volta a esperar pouco
        this.espera = ESPERA_MINIMA
        console.info(`[chat] conectado a #${this.canal}`)
        break

      case 'RECONNECT':
        // a Twitch avisa antes de reiniciar o servidor
        this.derrubar()
        break

      case 'PRIVMSG': {
        const login = linha.prefixo.split('!')[0]?.toLowerCase()
        const texto = limparTexto(linha.parametros[1] ?? '')
        if (!login || !texto) return

        const badges = linha.tags['badges'] ?? ''
        this.aoReceber?.({
          id: linha.tags['user-id'] ?? '',
          login,
          nome: linha.tags['display-name'] || login,
          texto,
          mod:
            linha.tags['mod'] === '1' ||
            badges.includes('broadcaster/') ||
            badges.includes('moderator/'),
          origem: 'twitch',
        })
        break
      }
    }
  }

  private vigiar(): void {
    if (this.vigia) clearTimeout(this.vigia)
    this.vigia = setTimeout(() => {
      console.warn('[chat] sem sinal da Twitch, reconectando')
      this.derrubar()
    }, SILENCIO_MAXIMO)
  }

  /** Larga o socket na hora e agenda outro. Numa conexão morta o `close` pode demorar. */
  private derrubar(): void {
    const socket = this.socket
    this.socket = null
    socket?.close()
    this.agendarReconexao()
  }

  private agendarReconexao(): void {
    if (!this.ligado) return
    if (this.vigia) clearTimeout(this.vigia)
    console.warn(`[chat] conexão caiu, tentando de novo em ${this.espera / 1000}s`)
    this.religar = setTimeout(() => this.abrir(), this.espera)
    this.espera = Math.min(this.espera * 2, ESPERA_MAXIMA)
  }
}
