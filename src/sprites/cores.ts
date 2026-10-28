/**
 * Cores das partes.
 *
 * Uma parte não guarda cor: ela usa os índices 1, 2 e 3 da sua rampa.
 * A rampa (base, sombra, luz) é derivada de uma única cor da paleta, então
 * trocar a cor de um avatar é trocar um índice — nunca redesenhar a parte.
 *
 * Sombra e luz são misturas com duas cores fixas, não ajuste de HSL: mexer em
 * luminosidade estoura a saturação das cores claras (pele clara virava
 * laranja). Misturar mantém a rampa coerente e dentro da identidade da live.
 */

/** Contorno comum a todas as partes. */
export const CONTORNO = '#1b0f19'

/** Branco levemente rosado, para brilho de olho. */
export const BRANCO = '#fdf2fa'

/** Para onde a sombra puxa: o roxo escuro do fundo da live. */
const SOMBRA = '#2a1030'

/** Para onde a luz puxa: um rosa quase branco. */
const LUZ = '#fff2fb'

const PESO_SOMBRA = 0.38
const PESO_LUZ = 0.26

export interface Rampa {
  readonly base: string
  readonly sombra: string
  readonly luz: string
}

function paraRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function misturar(a: string, b: string, peso: number): string {
  const [ar, ag, ab] = paraRgb(a)
  const [br, bg, bb] = paraRgb(b)
  const canal = (x: number, y: number) =>
    Math.round(x * (1 - peso) + y * peso)
      .toString(16)
      .padStart(2, '0')
  return `#${canal(ar, br)}${canal(ag, bg)}${canal(ab, bb)}`
}

const cacheRampa = new Map<string, Rampa>()

/** Rampa de 3 tons a partir de uma cor base. */
export function rampa(hex: string): Rampa {
  const pronta = cacheRampa.get(hex)
  if (pronta) return pronta

  const nova: Rampa = {
    base: hex,
    sombra: misturar(hex, SOMBRA, PESO_SOMBRA),
    luz: misturar(hex, LUZ, PESO_LUZ),
  }
  cacheRampa.set(hex, nova)
  return nova
}
