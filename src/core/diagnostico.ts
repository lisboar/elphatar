import { config } from '../config/config'

/**
 * Diagnóstico de tela (?debug=1): moldura, faixa dos avatares e FPS.
 * Serve para confirmar que o overlay carregou dentro do OBS — sem isso,
 * uma página transparente é indistinguível de um erro de carregamento.
 */
export function criarDiagnostico() {
  let quadros = 0
  let acumulado = 0
  let fps = 0

  return function desenhar(ctx: CanvasRenderingContext2D, delta: number) {
    quadros++
    acumulado += delta
    if (acumulado >= 500) {
      fps = Math.round((quadros * 1000) / acumulado)
      quadros = 0
      acumulado = 0
    }

    const { largura, altura } = config.tela
    const baseFaixa = altura - config.faixa.margemInferior

    ctx.save()
    ctx.strokeStyle = config.cores.rosa
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, largura - 4, altura - 4)

    // Faixa de baixo onde os avatares vão andar.
    ctx.setLineDash([12, 12])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, baseFaixa - config.faixa.altura)
    ctx.lineTo(largura, baseFaixa - config.faixa.altura)
    ctx.moveTo(0, baseFaixa)
    ctx.lineTo(largura, baseFaixa)
    ctx.stroke()

    ctx.setLineDash([])
    ctx.fillStyle = config.cores.rosaClaro
    ctx.font = '28px monospace'
    ctx.fillText(`elphatar — ${largura}x${altura} — ${fps} fps`, 24, 48)
    ctx.restore()
  }
}
