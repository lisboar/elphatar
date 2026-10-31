/**
 * Adaptador de chat: toda fonte (Twitch agora; Kick e YouTube depois) entrega
 * as mensagens neste mesmo formato. O motor do overlay só conhece isto.
 */

export interface MensagemDeChat {
  /** Identificador estável do viewer, em minúsculas. É a chave do avatar. */
  readonly login: string
  /** Nome como o viewer escreve (com maiúsculas e acentos). */
  readonly nome: string
  readonly texto: string
  /** Moderador ou dono do canal. */
  readonly mod: boolean
  readonly origem: string
}

export interface FonteDeChat {
  conectar(aoReceber: (mensagem: MensagemDeChat) => void): void
  desconectar(): void
}
