/**
 * Adaptador de chat: toda fonte (Twitch agora; Kick e YouTube depois) entrega
 * as mensagens neste mesmo formato. O motor do overlay só conhece isto.
 */

export interface MensagemDeChat {
  /** ID da conta na fonte. Não muda quando o viewer troca de nome: é a chave da skin salva. */
  readonly id: string
  /** Nome de usuário em minúsculas. É a chave do avatar na cena. */
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
