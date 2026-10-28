import { config } from '../config/config'
import { spriteDaSkin, type Direcao } from '../sprites/render'
import { skinDeSemente, type Skin } from '../sprites/skin'
import { desenharBalao, desenharNome } from './rotulo'

/** Um viewer na tela. */
export class Avatar {
  readonly login: string
  nome: string
  skin: Skin

  /** Posição do pé, em pixels da grade de 1920x1080. */
  x: number
  /** 0 = na frente da faixa, 1 = no fundo. */
  readonly profundidade: number

  private direcao: Direcao = 'direita'
  private andando = false
  private tempoNoEstado = 0
  private duracaoDoEstado = 0
  private tempoDeQuadro = 0
  private quadro = 0

  private readonly desvioDoBalao = Math.floor(Math.random() * 4) * 22
  private rotulo: HTMLCanvasElement
  private balao: HTMLCanvasElement | null = null
  private tempoDeBalao = 0

  constructor(login: string, nome?: string, skin?: Skin) {
    this.login = login
    this.nome = nome ?? login
    this.skin = skin ?? skinDeSemente(login)
    this.rotulo = desenharNome(this.nome)

    const margem = config.movimento.margemLateral
    this.x = margem + Math.random() * (config.tela.largura - margem * 2)
    this.profundidade = Math.random()
    this.decidir()
  }

  /** Base do avatar: quanto mais ao fundo da faixa, mais alto na tela. */
  get baseY(): number {
    const { margemInferior, profundidade } = config.faixa
    return config.tela.altura - margemInferior - this.profundidade * profundidade
  }

  trocarSkin(skin: Skin): void {
    this.skin = skin
  }

  falar(texto: string): void {
    this.balao = desenharBalao(texto)
    this.tempoDeBalao = config.balao.duracao
  }

  private decidir(): void {
    const m = config.movimento
    this.andando = Math.random() < m.chanceDeAndar
    if (this.andando && Math.random() < 0.5) {
      this.direcao = this.direcao === 'direita' ? 'esquerda' : 'direita'
    }
    this.tempoNoEstado = 0
    this.duracaoDoEstado =
      m.minimoNoEstado + Math.random() * (m.maximoNoEstado - m.minimoNoEstado)
  }

  atualizar(delta: number): void {
    const s = delta / 1000
    const m = config.movimento

    this.tempoNoEstado += s
    if (this.tempoNoEstado >= this.duracaoDoEstado) this.decidir()

    if (this.andando) {
      const passo = m.velocidade * s * (this.direcao === 'direita' ? 1 : -1)
      this.x += passo

      const limite = m.margemLateral
      if (this.x < limite) {
        this.x = limite
        this.direcao = 'direita'
      } else if (this.x > config.tela.largura - limite) {
        this.x = config.tela.largura - limite
        this.direcao = 'esquerda'
      }

      this.tempoDeQuadro += s
      if (this.tempoDeQuadro >= m.segundosPorQuadro) {
        this.tempoDeQuadro -= m.segundosPorQuadro
        this.quadro++
      }
    }

    if (this.tempoDeBalao > 0) {
      this.tempoDeBalao -= s
      if (this.tempoDeBalao <= 0) this.balao = null
    }
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    const tamanho = config.avatar
    const esquerda = Math.round(this.x - tamanho / 2)
    const topo = Math.round(this.baseY - tamanho)

    const sprite = spriteDaSkin(
      this.skin,
      this.andando ? 'lado' : 'frente',
      undefined,
      this.andando ? this.quadro : -1,
    )

    // andando para a esquerda, o mesmo sprite é espelhado na hora. Guardar os
    // dois lados no cache dobraria o numero de canvas por avatar.
    if (this.andando && this.direcao === 'esquerda') {
      ctx.save()
      ctx.translate(esquerda + tamanho, topo)
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, 0, 0)
      ctx.restore()
    } else {
      ctx.drawImage(sprite, esquerda, topo)
    }

    ctx.drawImage(
      this.rotulo,
      Math.round(this.x - this.rotulo.width / 2),
      Math.round(this.baseY - 2),
    )

    if (this.balao) {
      // escalona a altura por avatar: dois vizinhos falando ao mesmo tempo
      // nao empilham o balao exatamente no mesmo lugar
      ctx.drawImage(
        this.balao,
        Math.round(this.x - this.balao.width / 2),
        Math.round(topo - this.balao.height - 2 - this.desvioDoBalao),
      )
    }
  }
}
