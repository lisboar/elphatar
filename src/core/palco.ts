import { config } from '../config/config'

/**
 * Prepara o canvas na resolução lógica da config e devolve o contexto 2D.
 * O canvas fica com tamanho fixo de 1920x1080 e o CSS o estica: assim o
 * desenho não depende do tamanho do browser source do OBS.
 */
export function criarPalco(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = config.tela.largura
  canvas.height = config.tela.altura

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Canvas 2D não disponível neste navegador.')

  // Pixel art: nada de suavização ao escalar.
  ctx.imageSmoothingEnabled = false
  return ctx
}

/** Laço de animação. Devolve uma função que para o laço. */
export function iniciarLaco(desenhar: (delta: number) => void): () => void {
  let anterior = performance.now()
  let id = 0

  const quadro = (agora: number) => {
    const delta = Math.min(agora - anterior, 100) // trava saltos após reload/lag
    anterior = agora
    desenhar(delta)
    id = requestAnimationFrame(quadro)
  }

  id = requestAnimationFrame(quadro)
  return () => cancelAnimationFrame(id)
}
