import { config } from '../config/config'
import { Avatar } from './avatar'
import type { Skin } from '../sprites/skin'

/**
 * A cena: a lista de avatares na tela.
 *
 * Regra 1 do projeto: ninguém some por inatividade. Quem falou uma vez fica
 * até o fim da live — só `limpar()` (o comando de mod) tira todo mundo.
 */
export class Cena {
  private readonly avatares = new Map<string, Avatar>()
  /** Ordem de desenho, refeita só quando alguém entra ou sai. */
  private ordem: Avatar[] = []

  get quantidade(): number {
    return this.avatares.size
  }

  get lista(): readonly Avatar[] {
    return this.ordem
  }

  obter(login: string): Avatar | undefined {
    return this.avatares.get(login.toLowerCase())
  }

  /** Entra na cena, ou devolve quem já estava. Ignora bots e a lotação. */
  entrar(login: string, nome?: string, skin?: Skin): Avatar | null {
    const chave = login.toLowerCase()
    const existente = this.avatares.get(chave)
    if (existente) return existente

    if ((config.bots as readonly string[]).includes(chave)) return null
    if (this.avatares.size >= config.limiteDeAvatares) return null

    const avatar = new Avatar(chave, nome ?? login, skin)
    this.avatares.set(chave, avatar)
    this.reordenar()
    return avatar
  }

  sair(login: string): void {
    if (this.avatares.delete(login.toLowerCase())) this.reordenar()
  }

  limpar(): void {
    this.avatares.clear()
    this.ordem = []
  }

  /** Quem está mais à frente da faixa é desenhado por último. */
  private reordenar(): void {
    this.ordem = [...this.avatares.values()].sort((a, b) => a.profundidade - b.profundidade)
    this.ordem.reverse()
  }

  atualizar(delta: number): void {
    for (const avatar of this.ordem) avatar.atualizar(delta)
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    for (const avatar of this.ordem) avatar.desenhar(ctx)
  }
}
