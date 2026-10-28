import { catalogo, validarCatalogo, type TipoCorpo } from '../sprites/catalogo'
import { GRADE, slotDaParte, type Slot } from '../sprites/molde'
import { paletas } from '../sprites/paletas'
import { desenharParte, desenharSkin } from '../sprites/render'
import {
  comCor,
  comParte,
  skinAleatoria,
  type Skin,
} from '../sprites/skin'

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

/* ---------- avatar grande + controles ---------- */

const palcoCanvas = canvas(12)
const palco = elemento('div', 'palco')
palco.append(palcoCanvas)

const controles = elemento('div', 'controles')
const json = elemento('pre', 'json')

const topo = elemento('div', 'topo')
topo.append(palco, controles)

const erros = validarCatalogo()
if (erros.length > 0) {
  const aviso = elemento('div', 'erros', `Catálogo com problema:\n${erros.join('\n')}`)
  raiz.append(aviso)
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

  // tipo de corpo
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

  // uma linha por tipo de parte
  for (const tipo of Object.keys(catalogo[skin.tipo])) {
    const lista = catalogo[skin.tipo][tipo as keyof (typeof catalogo)[typeof skin.tipo]] as
      readonly { nome: string }[]
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

  // uma linha por cor em uso neste tipo de corpo
  const slotsEmUso = new Set<Slot>(
    Object.keys(catalogo[skin.tipo]).map((t) => slotDaParte[t as keyof typeof slotDaParte]),
  )
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
  const ctx = contexto(palcoCanvas)
  ctx.clearRect(0, 0, palcoCanvas.width, palcoCanvas.height)
  desenharSkin(ctx, skin, 12)
  for (const a of atualizadores) a()
  json.textContent = JSON.stringify(skin, null, 2)
}

/* ---------- todas as partes, isoladas ---------- */

function montarCatalogoVisual(): void {
  for (const tipoCorpo of ['humanoide', 'criatura'] as TipoCorpo[]) {
    raiz!.append(elemento('h2', undefined, `partes — ${tipoCorpo}`))
    const grade = elemento('div', 'grade')

    for (const tipo of Object.keys(catalogo[tipoCorpo])) {
      const lista = catalogo[tipoCorpo][tipo as keyof (typeof catalogo)[typeof tipoCorpo]] as
        readonly { nome: string }[]
      const slot = slotDaParte[tipo as keyof typeof slotDaParte]
      const hex = paletas[slot][0]!.hex

      lista.forEach((parte, i) => {
        const item = elemento('div', 'item')
        const c = canvas(4)
        desenharParte(contexto(c), tipoCorpo, tipo, i, hex, 4)
        item.append(c, elemento('div', 'rotulo', `${tipo} ${i + 1}\n${parte.nome}`))
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
  for (let i = 0; i < 24; i++) {
    const aleatoria = skinAleatoria()
    const item = elemento('div', 'item')
    const c = canvas(4)
    desenharSkin(contexto(c), aleatoria, 4)

    const usar = elemento('button', undefined, 'usar')
    usar.style.marginTop = '6px'
    usar.addEventListener('click', () => {
      skin = aleatoria
      montarControles()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })

    item.append(c, elemento('div', 'rotulo', aleatoria.tipo), usar)
    gradeAleatorios.append(item)
  }
}

montarControles()
montarCatalogoVisual()
raiz.append(elemento('h2', undefined, 'aleatórios'), gradeAleatorios)
montarAleatorios()
