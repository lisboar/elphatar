import { config } from '../config/config'
import { MARGEM, spriteDaSkin, type Direcao } from '../sprites/render'
import { skinDeSemente, type Skin } from '../sprites/skin'
import { desenharBalao, desenharNome } from './rotulo'
import { Chegada, type TipoDeChegada } from './chegada'

/** Um viewer na tela. */
export class Avatar {
  readonly login: string
  /** ID da Twitch: chave da skin salva no Supabase. Vazio nos viewers falsos. */
  twitchId = ''
  /** Resolve quando a skin salva já foi buscada. Comandos esperam por isto. */
  pronto: Promise<void> = Promise.resolve()
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

  private rotulo: HTMLCanvasElement
  private balao: HTMLCanvasElement | null = null
  private tempoDeBalao = 0

  /** Animação de chegada em curso. Null = já está na cena normalmente. */
  private chegada: Chegada | null = null

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

  /** Começa a animação de chegada (avatar novo na live). */
  chegar(tipo?: TipoDeChegada): void {
    this.chegada = new Chegada(this.x, tipo)
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
    const faixa = this.andando ? m.andando : m.parado
    this.tempoNoEstado = 0
    this.duracaoDoEstado = faixa.minimo + Math.random() * Math.max(0, faixa.maximo - faixa.minimo)
  }

  atualizar(delta: number): void {
    const s = delta / 1000
    const m = config.movimento

    // chegando: a animação manda; o balão espera para contar depois
    if (this.chegada) {
      this.chegada.atualizar(s)
      if (this.chegada.acabou) {
        this.chegada = null
        this.decidir()
      }
      return
    }

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

  /** Sprite e nome com o pé em (x, base). */
  private desenharCorpo(
    ctx: CanvasRenderingContext2D,
    x: number,
    base: number,
    andando: boolean,
    direcao: Direcao,
    quadro: number,
  ): void {
    const tamanho = config.avatar
    const esquerda = Math.round(x - tamanho / 2)
    const topo = Math.round(base - tamanho)

    const sprite = spriteDaSkin(
      this.skin,
      andando ? 'lado' : 'frente',
      config.escala,
      andando ? quadro : -1,
      this.balao !== null && !this.chegada,
    )
    // o sprite tem folga em volta do desenho, para a caminhada não cortar nada
    const folga = Math.round(MARGEM * config.escala)

    // andando para a esquerda, o mesmo sprite é espelhado na hora. Guardar os
    // dois lados no cache dobraria o numero de canvas por avatar.
    if (andando && direcao === 'esquerda') {
      ctx.save()
      ctx.translate(esquerda + tamanho, topo)
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, -folga, -folga)
      ctx.restore()
    } else {
      ctx.drawImage(sprite, esquerda - folga, topo - folga)
    }

    if (config.mostrarNomes) {
      ctx.drawImage(this.rotulo, Math.round(x - this.rotulo.width / 2), Math.round(base - 2))
    }
  }

  private desenharChegando(ctx: CanvasRenderingContext2D, chegada: Chegada): void {
    const tamanho = config.avatar
    const base = this.baseY
    const pose = chegada.pose(base, tamanho)

    chegada.desenharAtras(ctx, this.x, base, tamanho)

    ctx.save()
    ctx.globalAlpha = pose.alpha
    if (pose.recorte) {
      // o portal esconde o avatar enquanto ele ainda está "do lado de lá"
      const linha = this.x + pose.recorte.x
      const largura = config.tela.largura
      ctx.beginPath()
      if (pose.recorte.lado === 1) ctx.rect(linha, 0, largura - linha, config.tela.altura)
      else ctx.rect(0, 0, linha, config.tela.altura)
      ctx.clip()
    }
    if (pose.alpha > 0) {
      this.desenharCorpo(ctx, this.x + pose.dx, base + pose.dy, pose.andando, pose.direcao, pose.quadro)
    }
    ctx.restore()

    chegada.desenharFrente(ctx, this.x, base, tamanho)
  }

  desenhar(ctx: CanvasRenderingContext2D): void {
    if (this.chegada) {
      this.desenharChegando(ctx, this.chegada)
      return
    }

    this.desenharCorpo(ctx, this.x, this.baseY, this.andando, this.direcao, this.quadro)

    if (this.balao) {
      const topo = Math.round(this.baseY - config.avatar)
      ctx.drawImage(
        this.balao,
        Math.round(this.x - this.balao.width / 2),
        Math.round(topo - this.balao.height - 2),
      )
    }
  }
}
