import { catalogo, validarCatalogo, type TipoCorpo } from '../sprites/catalogo'
import { GRADE, slotDaParte, type Slot, type Vista } from '../sprites/molde'
import { paletas } from '../sprites/paletas'
import { desenharParte, desenharSkin, spriteDaSkin } from '../sprites/render'
import { comCor, comParte, skinAleatoria, type Skin } from '../sprites/skin'

/**
 * Laboratório: combina as partes, mostra cada uma isolada e gera aleatórios.
 * É a página onde o estilo da arte é aprovado antes de ir pro overlay.
 */

const raiz = document.getElementById('laboratorio')
if (!raiz) throw new Error('Elemento #laboratorio não encontrado.')

let skin: Skin = skinAleatoria('humanoide')

function canvas(escala: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = GRADE * escala
  c.height = GRADE * escala
  const ctx = c.getContext('2d')
  if (ctx) ctx.imageSmoothingEnabled = false
  return c
}

function contexto(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível.')
  return ctx
}

function elemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (classe) el.className = classe
  if (texto !== undefined) el.textContent = texto
  return el
}

/* ---------- avatar grande nas três vistas ---------- */

const ESCALA_PALCO = 8
const vistas: { rotulo: string; vista: Vista; espelhar: boolean }[] = [
  { rotulo: 'frente', vista: 'frente', espelhar: false },
  { rotulo: 'lado direito', vista: 'lado', espelhar: false },
  { rotulo: 'lado esquerdo', vista: 'lado', espelhar: true },
]

const palco = elemento('div', 'palco')
const palcoCanvas = vistas.map(() => canvas(ESCALA_PALCO))
vistas.forEach((v, i) => {
  const caixa = elemento('div', 'vista')
  caixa.append(palcoCanvas[i]!, elemento('div', 'rotulo', v.rotulo))
  palco.append(caixa)
})

const controles = elemento('div', 'controles')
const json = elemento('pre', 'json')

const topo = elemento('div', 'topo')
topo.append(palco, controles)

const erros = validarCatalogo()
if (erros.length > 0) {
  raiz.append(elemento('div', 'erros', `Catálogo com problema:\n${erros.join('\n')}`))
}
raiz.append(topo)

/** Seletor ◀ nome ▶ reaproveitado por partes e por cores. */
function seletor(
  rotulo: string,
  valor: () => string,
  amostra: (() => string) | null,
  mover: (passo: number) => void,
): { linha: HTMLElement; atualizar: () => void } {
  const linha = elemento('div', 'linha')
  linha.append(elemento('span', undefined, rotulo))

  const caixa = elemento('div', 'seletor')
  const anterior = elemento('button', undefined, '◀')
  const proximo = elemento('button', undefined, '▶')
  const texto = elemento('div', 'valor')

  anterior.addEventListener('click', () => {
    mover(-1)
    redesenhar()
  })
  proximo.addEventListener('click', () => {
    mover(1)
    redesenhar()
  })

  caixa.append(anterior, texto, proximo)
  linha.append(caixa)

  const atualizar = () => {
    texto.textContent = ''
    if (amostra) {
      const bolinha = elemento('span', 'amostra')
      bolinha.style.background = amostra()
      texto.append(bolinha, ` ${valor()}`)
    } else {
      texto.textContent = valor()
    }
  }

  return { linha, atualizar }
}

const atualizadores: (() => void)[] = []

function montarControles(): void {
  controles.textContent = ''
  atualizadores.length = 0

  const tipos: TipoCorpo[] = ['humanoide', 'criatura']
  const corpoSel = seletor(
    'corpo',
    () => skin.tipo,
    null,
    (passo) => {
      const i = tipos.indexOf(skin.tipo)
      const novo = tipos[(i + passo + tipos.length) % tipos.length]!
      skin = { ...skinAleatoria(novo), cores: skin.cores }
      montarControles()
    },
  )
  controles.append(corpoSel.linha)
  atualizadores.push(corpoSel.atualizar)

  for (const tipo of Object.keys(catalogo[skin.tipo])) {
    const lista = catalogo[skin.tipo][
      tipo as keyof (typeof catalogo)[typeof skin.tipo]
    ] as readonly { nome: string }[]
    const s = seletor(
      tipo,
      () => {
        const i = skin.partes[tipo as keyof typeof skin.partes] ?? 0
        return `${i + 1}/${lista.length} ${lista[i]!.nome}`
      },
      null,
      (passo) => {
        const i = skin.partes[tipo as keyof typeof skin.partes] ?? 0
        skin = comParte(skin, tipo, i + passo)
      },
    )
    controles.append(s.linha)
    atualizadores.push(s.atualizar)
  }

  // Só as cores que este tipo de corpo usa. Criatura e acessório têm cor fixa.
  const slotsEmUso = new Set<Slot>()
  for (const tipo of Object.keys(catalogo[skin.tipo])) {
    const lista = catalogo[skin.tipo][
      tipo as keyof (typeof catalogo)[typeof skin.tipo]
    ] as readonly { fixa?: string }[]
    if (lista.every((p) => p.fixa)) continue
    slotsEmUso.add(slotDaParte[tipo as keyof typeof slotDaParte])
  }

  for (const slot of slotsEmUso) {
    const paleta = paletas[slot]
    const s = seletor(
      `cor ${slot}`,
      () => `${skin.cores[slot] + 1}/${paleta.length} ${paleta[skin.cores[slot]]!.nome}`,
      () => paleta[skin.cores[slot]]!.hex,
      (passo) => {
        skin = comCor(skin, slot, skin.cores[slot] + passo)
      },
    )
    controles.append(s.linha)
    atualizadores.push(s.atualizar)
  }

  const acoes = elemento('div', 'acoes')

  const bAleatorio = elemento('button', undefined, 'Aleatório')
  bAleatorio.addEventListener('click', () => {
    skin = skinAleatoria()
    montarControles()
  })

  const bMesmoTipo = elemento('button', undefined, 'Aleatório (mesmo corpo)')
  bMesmoTipo.addEventListener('click', () => {
    skin = skinAleatoria(skin.tipo)
    montarControles()
  })

  const bNovaGrade = elemento('button', undefined, 'Sortear a grade de baixo')
  bNovaGrade.addEventListener('click', montarAleatorios)

  const bCopiar = elemento('button', undefined, 'Copiar skin (JSON)')
  bCopiar.addEventListener('click', () => {
    void navigator.clipboard.writeText(JSON.stringify(skin))
    bCopiar.textContent = 'Copiado'
    setTimeout(() => (bCopiar.textContent = 'Copiar skin (JSON)'), 1200)
  })

  acoes.append(bAleatorio, bMesmoTipo, bNovaGrade, bCopiar)
  controles.append(acoes, json)

  redesenhar()
}

function redesenhar(): void {
  vistas.forEach((v, i) => {
    const c = palcoCanvas[i]!
    const ctx = contexto(c)
    ctx.clearRect(0, 0, c.width, c.height)
    // Passa pelo mesmo caminho do overlay: sprite em cache, depois drawImage.
    // O lado esquerdo e o mesmo sprite espelhado na hora.
    const sprite = spriteDaSkin(skin, v.vista, ESCALA_PALCO)
    if (v.espelhar) {
      ctx.save()
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, 0, 0)
      ctx.restore()
    } else {
      ctx.drawImage(sprite, 0, 0)
    }
  })
  for (const a of atualizadores) a()
  json.textContent = JSON.stringify(skin, null, 2)
}

/* ---------- todas as partes, isoladas ---------- */

function montarCatalogoVisual(): void {
  for (const tipoCorpo of ['humanoide', 'criatura'] as TipoCorpo[]) {
    raiz!.append(elemento('h2', undefined, `partes — ${tipoCorpo}`))
    const grade = elemento('div', 'grade')
    const base = skinAleatoria(tipoCorpo)

    for (const tipo of Object.keys(catalogo[tipoCorpo])) {
      const lista = catalogo[tipoCorpo][
        tipo as keyof (typeof catalogo)[typeof tipoCorpo]
      ] as readonly { nome: string }[]

      lista.forEach((parte, i) => {
        const item = elemento('div', 'item')
        const par = elemento('div', 'par')
        for (const vista of ['frente', 'lado'] as Vista[]) {
          const c = canvas(3)
          desenharParte(contexto(c), tipoCorpo, tipo, i, base, vista, 3)
          par.append(c)
        }
        item.append(par, elemento('div', 'rotulo', `${tipo} ${i + 1}\n${parte.nome}`))
        grade.append(item)
      })
    }

    raiz!.append(grade)
  }
}

/* ---------- aleatórios ---------- */

const gradeAleatorios = elemento('div', 'grade')

function montarAleatorios(): void {
  gradeAleatorios.textContent = ''
  for (let i = 0; i < 18; i++) {
    const aleatoria = skinAleatoria()
    const item = elemento('div', 'item')
    const par = elemento('div', 'par')
    for (const vista of ['frente', 'lado'] as Vista[]) {
      const c = canvas(3)
      desenharSkin(contexto(c), aleatoria, vista, 3)
      par.append(c)
    }

    const usar = elemento('button', undefined, 'usar')
    usar.style.marginTop = '6px'
    usar.addEventListener('click', () => {
      skin = aleatoria
      montarControles()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })

    item.append(par, elemento('div', 'rotulo', aleatoria.tipo), usar)
    gradeAleatorios.append(item)
  }
}

montarControles()
montarCatalogoVisual()
raiz.append(elemento('h2', undefined, 'aleatórios'), gradeAleatorios)
montarAleatorios()
