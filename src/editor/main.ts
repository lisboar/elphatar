import {
  CORPOS,
  aoMudarCatalogo,
  dadosDo,
  definirDados,
  validarCatalogo,
  type TipoCorpo,
} from '../sprites/catalogo'
import {
  CARACTERES,
  GRADE,
  MOVIMENTOS,
  SLOTS,
  vazia,
  type Caixa,
  type DadosCorpo,
  type Movimento,
  type Slot,
  type Vista,
} from '../sprites/molde'
import { paletas } from '../sprites/paletas'
import { MARGEM, corDaTinta, desenharParte, spriteDaSkin } from '../sprites/render'
import { skinAleatoria, type Skin } from '../sprites/skin'
import { QUADROS } from '../sprites/animacao'

/**
 * Editor de partes: desenha e ajusta as matrizes com preview ao vivo.
 *
 * Trabalha numa cópia dos JSON de `sprites/dados/`. Cada pincelada troca o
 * catálogo em memória (o preview usa o mesmo render do overlay) e o botão
 * Salvar grava o JSON pelo servidor do Vite — por isso só funciona no
 * `npm run dev`.
 */

/* ---------- dados editáveis ---------- */

interface ParteEd {
  nome: string
  frente: string[]
  lado: string[]
  atras?: boolean
  fixa?: string
  extra1?: string
  extra2?: string
  passada?: { de: number; cortes?: number[] }
}

interface TipoEd {
  nome: string
  caixa: Caixa
  slot: Slot
  movimento: Movimento
  partes: ParteEd[]
}

interface DadosEd {
  tipos: TipoEd[]
  especiais?: Record<string, ParteEd>
}

/** Partes especiais e o tipo cuja caixa elas usam. */
const ESPECIAIS: Record<string, { tipo: string; rotulo: string }> = {
  bocaAberta: { tipo: 'boca', rotulo: 'aberta (fala)' },
}

const copiar = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const estado = {} as Record<TipoCorpo, DadosEd>
const salvo = {} as Record<TipoCorpo, string>
for (const c of CORPOS) {
  estado[c] = copiar(dadosDo(c)) as unknown as DadosEd
  salvo[c] = JSON.stringify(estado[c])
}

let corpo: TipoCorpo = 'humanoide'
let iTipo = 0
/** Índice da parte no tipo, ou a chave de uma parte especial. */
let sel: number | string = 0
let vista: Vista = 'frente'
type Ferramenta = 'lapis' | 'balde' | 'conta'
let ferramenta: Ferramenta = 'lapis'
let tinta = '1'
let espelho = false
let camadas = true
let zoom = 12
let skinBase: Skin = skinAleatoria(corpo)
let aleatorias: Skin[] = []

const dados = () => estado[corpo]
const tipo = () => dados().tipos[iTipo]!
const parte = (): ParteEd =>
  typeof sel === 'string' ? dados().especiais![sel]! : tipo().partes[sel]!
const sujo = (c: TipoCorpo) => JSON.stringify(estado[c]) !== salvo[c]

/* ---------- desfazer ---------- */

interface Foto {
  corpo: TipoCorpo
  dados: string
  iTipo: number
  sel: number | string
}

const desfeitos: Foto[] = []
const refeitos: Foto[] = []

const foto = (): Foto => ({ corpo, dados: JSON.stringify(dados()), iTipo, sel })

/** Guarda o estado antes de uma mudança. */
function lembrar(): void {
  desfeitos.push(foto())
  if (desfeitos.length > 200) desfeitos.shift()
  refeitos.length = 0
}

function voltarPara(f: Foto): void {
  if (f.corpo !== corpo) {
    corpo = f.corpo
    skinBase = skinAleatoria(corpo)
    sortearAleatorias()
  }
  estado[corpo] = JSON.parse(f.dados) as DadosEd
  iTipo = Math.min(f.iTipo, dados().tipos.length - 1)
  sel = f.sel
  if (typeof sel === 'number') sel = Math.min(sel, tipo().partes.length - 1)
  mudou(true)
}

function desfazer(): void {
  const f = desfeitos.pop()
  if (!f) return
  refeitos.push(foto())
  voltarPara(f)
}

function refazer(): void {
  const f = refeitos.pop()
  if (!f) return
  desfeitos.push(foto())
  voltarPara(f)
}

/* ---------- elementos ---------- */

const raiz = document.getElementById('editor')!

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texto !== undefined) e.textContent = texto
  return e
}

function botao(texto: string, acao: () => void, titulo?: string): HTMLButtonElement {
  const b = el('button', undefined, texto)
  if (titulo) b.title = titulo
  b.addEventListener('click', acao)
  return b
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return ctx
}

const topo = el('div', 'topo')
const status = el('span', 'status')
const bSalvar = botao('Salvar', () => void salvar(), 'Ctrl+S')
bSalvar.id = 'salvar'
const bDesfazer = botao('↶ Desfazer', desfazer, 'Ctrl+Z')
const bRefazer = botao('↷ Refazer', refazer, 'Ctrl+Y')
const abasCorpo = CORPOS.map((c) =>
  botao(c, () => {
    if (c === corpo) return
    corpo = c
    iTipo = 0
    sel = 0
    skinBase = skinAleatoria(corpo)
    sortearAleatorias()
    mudou(true)
  }),
)
const linkLab = el('a', undefined, 'Laboratório')
linkLab.href = '/elphatar/laboratorio.html'
linkLab.target = '_blank'
linkLab.style.color = 'inherit'
topo.append(el('h1', undefined, 'Editor de Partes'), ...abasCorpo, el('div', 'espaco'), status,
  bDesfazer, bRefazer, bSalvar, linkLab)

const erros = el('pre', 'erros')
const area = el('div', 'area')
const colEsq = el('div', 'coluna')
const colMeio = el('div', 'coluna')
const colDir = el('div', 'coluna')
area.append(colEsq, colMeio, colDir)
raiz.append(topo, erros, area)

/* ---------- coluna da esquerda: tipos e partes ---------- */

const listaTipos = el('div', 'lista')
const listaPartes = el('div', 'lista')
const miniaturas = new Map<number | string, HTMLCanvasElement>()

colEsq.append(
  el('h2', undefined, 'Tipos (ordem de desenho)'),
  listaTipos,
  linhaDeBotoes(
    botao('↑', () => moverTipo(-1), 'desenha mais atrás'),
    botao('↓', () => moverTipo(1), 'desenha mais à frente'),
    botao('+ tipo', novoTipo),
  ),
  el('h2', undefined, 'Partes'),
  listaPartes,
  linhaDeBotoes(
    botao('+ nova', novaParte),
    botao('duplicar', duplicarParte),
    botao('excluir', excluirParte),
    botao('↑', () => moverParte(-1)),
    botao('↓', () => moverParte(1)),
  ),
)

function linhaDeBotoes(...bs: HTMLElement[]): HTMLElement {
  const d = el('div', 'botoes')
  d.append(...bs)
  return d
}

function montarListas(): void {
  listaTipos.textContent = ''
  dados().tipos.forEach((t, i) => {
    const b = botao('', () => {
      iTipo = i
      sel = 0
      mudou(true)
    })
    b.append(el('span', undefined, t.nome), el('span', 'dica', `${t.partes.length} · ${t.movimento}`))
    if (i === iTipo) b.classList.add('ativo')
    listaTipos.append(b)
  })

  listaPartes.textContent = ''
  miniaturas.clear()
  const itens: { chave: number | string; rotulo: string }[] = tipo().partes.map((p, i) => ({
    chave: i,
    rotulo: `${i + 1}. ${p.nome}`,
  }))
  for (const [chave, esp] of Object.entries(ESPECIAIS)) {
    if (esp.tipo === tipo().nome && dados().especiais?.[chave]) {
      itens.push({ chave, rotulo: `★ ${esp.rotulo}` })
    }
  }
  for (const { chave, rotulo } of itens) {
    const b = botao('', () => {
      sel = chave
      mudou(true)
    })
    const mini = el('canvas')
    miniaturas.set(chave, mini)
    b.append(mini, el('span', undefined, rotulo))
    if (chave === sel) b.classList.add('ativo')
    listaPartes.append(b)
  }
  for (const chave of miniaturas.keys()) desenharMiniatura(chave)
}

function parteDaChave(chave: number | string): ParteEd | undefined {
  return typeof chave === 'string' ? dados().especiais?.[chave] : tipo().partes[chave]
}

function desenharMiniatura(chave: number | string): void {
  const mini = miniaturas.get(chave)
  const p = parteDaChave(chave)
  if (!mini || !p) return
  const { largura, altura } = tipo().caixa
  mini.width = largura
  mini.height = altura
  const ctx = ctx2d(mini)
  ctx.clearRect(0, 0, largura, altura)
  const m = p.frente.some((l) => /[^.]/.test(l)) ? p.frente : p.lado
  pintarMatriz(ctx, m, p, 1, 0, 0)
}

/* ---------- coluna do meio: o quadro de desenho ---------- */

const ferramentasEl = el('div', 'ferramentas')
const tintasEl = el('div', 'tintas')
const quadro = el('canvas', 'quadro')
const coord = el('div', 'coord')
colMeio.append(ferramentasEl, tintasEl, quadro, coord)

const botoesFerramenta: Record<Ferramenta, HTMLButtonElement> = {
  lapis: botao('✏ Lápis', () => usar('lapis'), 'P'),
  balde: botao('🪣 Balde', () => usar('balde'), 'G'),
  conta: botao('💧 Conta-gotas', () => usar('conta'), 'I (ou Alt+clique)'),
}
const bEspelho = botao('⇋ Espelho', () => {
  espelho = !espelho
  atualizarFerramentas()
}, 'M — desenha simétrico pelo meio do boneco')
const bFrente = botao('Frente', () => trocarVista('frente'), 'V alterna')
const bLado = botao('Lado', () => trocarVista('lado'), 'V alterna')
const bCamadas = botao('Camadas', () => {
  camadas = !camadas
  atualizarFerramentas()
  agendar()
}, 'H — mostra as outras partes do boneco por baixo')
const selZoom = el('select')
for (const z of [8, 10, 12, 14, 16]) selZoom.append(new Option(`${z}×`, String(z), false, z === zoom))
selZoom.addEventListener('change', () => {
  zoom = Number(selZoom.value)
  agendar()
})

ferramentasEl.append(
  ...Object.values(botoesFerramenta),
  bEspelho,
  el('div', 'sep'),
  bFrente,
  bLado,
  bCamadas,
  selZoom,
  el('div', 'sep'),
  botao('←', () => deslocar(-1, 0), 'Setas: move o desenho 1 px'),
  botao('↑', () => deslocar(0, -1)),
  botao('↓', () => deslocar(0, 1)),
  botao('→', () => deslocar(1, 0)),
  botao('⇆ Virar', virar, 'espelha a vista inteira'),
  botao('Frente → Lado', () => copiarVista('frente', 'lado')),
  botao('Lado → Frente', () => copiarVista('lado', 'frente')),
  botao('Limpar', limparVista),
)

const NOMES_TINTA: Record<string, string> = {
  '.': 'vazio',
  k: 'contorno',
  w: 'branco',
  s: 'cinza',
  '1': 'base',
  '2': 'sombra',
  '3': 'luz',
  a: 'extra 1',
  b: 'extra 1 sombra',
  c: 'extra 1 luz',
  d: 'extra 2',
  e: 'extra 2 sombra',
  f: 'extra 2 luz',
}
const botoesTinta = new Map<string, { b: HTMLButtonElement; amostra: HTMLSpanElement }>()
for (const c of CARACTERES) {
  const amostra = el('span', c === '.' ? 'vazio' : undefined)
  const b = botao('', () => {
    tinta = c
    atualizarFerramentas()
  }, `${NOMES_TINTA[c]} — tecla ${c}`)
  b.className = 'tinta'
  b.append(amostra, c)
  botoesTinta.set(c, { b, amostra })
  tintasEl.append(b)
}

colMeio.append(
  el('div', 'atalhos',
    'Clique esquerdo pinta, direito apaga. Teclas das tintas: . k w s 1 2 3 a b c d e f. ' +
      'P lápis · G balde · I conta-gotas · M espelho · V vista · H camadas · setas movem o desenho · ' +
      'Ctrl+Z / Ctrl+Y · Ctrl+S salva.'),
)

function usar(f: Ferramenta): void {
  ferramenta = f
  atualizarFerramentas()
}

function trocarVista(v: Vista): void {
  vista = v
  atualizarFerramentas()
  agendar()
}

function atualizarFerramentas(): void {
  for (const [f, b] of Object.entries(botoesFerramenta)) b.classList.toggle('ativo', f === ferramenta)
  bEspelho.classList.toggle('ativo', espelho)
  bFrente.classList.toggle('ativo', vista === 'frente')
  bLado.classList.toggle('ativo', vista === 'lado')
  bCamadas.classList.toggle('ativo', camadas)
  for (const [c, { b, amostra }] of botoesTinta) {
    b.classList.toggle('ativo', c === tinta)
    if (c !== '.') amostra.style.background = corDaTinta(c, parte(), skinDaPrevia(), tipo().slot) ?? ''
  }
}

/** Pinta uma matriz com as cores da skin da prévia. `ox` `oy` em pixels da tela. */
function pintarMatriz(
  ctx: CanvasRenderingContext2D,
  m: readonly string[],
  p: ParteEd,
  escala: number,
  ox: number,
  oy: number,
): void {
  const skin = skinDaPrevia()
  const slot = tipo().slot
  m.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) {
      const cor = corDaTinta(linha[x]!, p, skin, slot)
      if (!cor) continue
      ctx.fillStyle = cor
      ctx.fillRect(ox + x * escala, oy + y * escala, escala, escala)
    }
  })
}

let mouse: { x: number; y: number } | null = null

function desenharQuadro(): void {
  const lado = GRADE * zoom
  if (quadro.width !== lado) {
    quadro.width = lado
    quadro.height = lado
  }
  const ctx = ctx2d(quadro)
  ctx.clearRect(0, 0, lado, lado)
  const { x: cx, y: cy, largura, altura } = tipo().caixa
  const skin = skinDaPrevia()

  // as outras partes do boneco, apagadas, para ver o encaixe
  if (camadas) {
    ctx.globalAlpha = 0.35
    for (const t of dados().tipos) {
      if (t === tipo()) continue
      desenharParte(ctx, corpo, t.nome, skin.partes[t.nome] ?? 0, skin, vista, zoom)
    }
    ctx.globalAlpha = 1
  }

  // fora da caixa não dá para pintar
  ctx.fillStyle = 'rgba(10, 4, 10, 0.55)'
  ctx.fillRect(0, 0, lado, cy * zoom)
  ctx.fillRect(0, (cy + altura) * zoom, lado, lado)
  ctx.fillRect(0, cy * zoom, cx * zoom, altura * zoom)
  ctx.fillRect((cx + largura) * zoom, cy * zoom, lado, altura * zoom)

  pintarMatriz(ctx, parte()[vista], parte(), zoom, cx * zoom, cy * zoom)

  // grade de pixels
  ctx.strokeStyle = 'rgba(255, 214, 239, 0.07)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= largura; i++) {
    ctx.moveTo((cx + i) * zoom + 0.5, cy * zoom)
    ctx.lineTo((cx + i) * zoom + 0.5, (cy + altura) * zoom)
  }
  for (let i = 0; i <= altura; i++) {
    ctx.moveTo(cx * zoom, (cy + i) * zoom + 0.5)
    ctx.lineTo((cx + largura) * zoom, (cy + i) * zoom + 0.5)
  }
  ctx.stroke()

  // meio do boneco (eixo do espelho)
  ctx.strokeStyle = 'rgba(255, 79, 176, 0.35)'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo((GRADE / 2) * zoom + 0.5, 0)
  ctx.lineTo((GRADE / 2) * zoom + 0.5, lado)
  ctx.stroke()

  // passada: onde começa a perna e onde as patas se separam
  const passada = parte().passada
  if (passada && (vista === 'lado' || tipo().movimento === 'bicho')) {
    ctx.strokeStyle = 'rgba(47, 198, 216, 0.8)'
    ctx.beginPath()
    ctx.moveTo(cx * zoom, (cy + passada.de) * zoom + 0.5)
    ctx.lineTo((cx + largura) * zoom, (cy + passada.de) * zoom + 0.5)
    if (vista === 'lado') {
      for (const c of passada.cortes ?? []) {
        ctx.moveTo((cx + c) * zoom + 0.5, (cy + passada.de) * zoom)
        ctx.lineTo((cx + c) * zoom + 0.5, (cy + altura) * zoom)
      }
    }
    ctx.stroke()
  }
  ctx.setLineDash([])

  // borda da caixa
  ctx.strokeStyle = 'rgba(255, 79, 176, 0.9)'
  ctx.strokeRect(cx * zoom + 0.5, cy * zoom + 0.5, largura * zoom - 1, altura * zoom - 1)

  if (mouse) {
    ctx.strokeStyle = '#fff'
    ctx.strokeRect(mouse.x * zoom + 0.5, mouse.y * zoom + 0.5, zoom - 1, zoom - 1)
  }
}

/* ---------- pintura ---------- */

/** Célula da grade sob o ponteiro, em coordenadas da grade inteira. */
function celula(e: PointerEvent): { x: number; y: number } {
  // offsetX já desconta a borda do canvas
  return { x: Math.floor(e.offsetX / zoom), y: Math.floor(e.offsetY / zoom) }
}

function lerPixel(x: number, y: number): string | null {
  const { x: cx, y: cy } = tipo().caixa
  return parte()[vista][y - cy]?.[x - cx] ?? null
}

function porPixel(x: number, y: number, c: string): void {
  const m = parte()[vista]
  const { x: cx, y: cy } = tipo().caixa
  const col = x - cx
  const linha = m[y - cy]
  if (linha === undefined || col < 0 || col >= linha.length) return
  m[y - cy] = linha.slice(0, col) + c + linha.slice(col + 1)
}

function pintar(x: number, y: number, c: string): void {
  porPixel(x, y, c)
  if (espelho) porPixel(GRADE - 1 - x, y, c)
}

function balde(x: number, y: number, c: string): void {
  const alvo = lerPixel(x, y)
  if (alvo === null || alvo === c) return
  const fila = [[x, y]]
  while (fila.length > 0) {
    const [px, py] = fila.pop()!
    if (lerPixel(px!, py!) !== alvo) continue
    porPixel(px!, py!, c)
    fila.push([px! + 1, py!], [px! - 1, py!], [px!, py! + 1], [px!, py! - 1])
  }
}

let traco: { ultimo: { x: number; y: number }; tinta: string } | null = null

quadro.addEventListener('contextmenu', (e) => e.preventDefault())

quadro.addEventListener('pointerdown', (e) => {
  const p = celula(e)
  if (lerPixel(p.x, p.y) === null) return
  if (ferramenta === 'conta' || e.altKey) {
    tinta = lerPixel(p.x, p.y)!
    atualizarFerramentas()
    return
  }
  const c = e.button === 2 ? '.' : tinta
  lembrar()
  if (ferramenta === 'balde') {
    balde(p.x, p.y, c)
    mudou()
    return
  }
  quadro.setPointerCapture(e.pointerId)
  traco = { ultimo: p, tinta: c }
  pintar(p.x, p.y, c)
  mudou()
})

quadro.addEventListener('pointermove', (e) => {
  const p = celula(e)
  mouse = p
  const valor = lerPixel(p.x, p.y)
  const { x: cx, y: cy } = tipo().caixa
  coord.textContent =
    valor === null ? `grade ${p.x},${p.y}` : `grade ${p.x},${p.y} · na parte ${p.x - cx},${p.y - cy} · "${valor}"`
  if (traco) {
    // liga o ponto anterior ao atual, para o traço rápido não falhar
    const { ultimo } = traco
    const passos = Math.max(Math.abs(p.x - ultimo.x), Math.abs(p.y - ultimo.y))
    for (let i = 1; i <= passos; i++) {
      pintar(
        Math.round(ultimo.x + ((p.x - ultimo.x) * i) / passos),
        Math.round(ultimo.y + ((p.y - ultimo.y) * i) / passos),
        traco.tinta,
      )
    }
    traco.ultimo = p
    mudou()
  } else {
    agendar()
  }
})

quadro.addEventListener('pointerup', () => (traco = null))
quadro.addEventListener('pointerleave', () => {
  mouse = null
  coord.textContent = ''
  agendar()
})

/* ---------- operações na vista ---------- */

function deslocar(dx: number, dy: number): void {
  lembrar()
  const m = parte()[vista]
  const { largura, altura } = tipo().caixa
  const novo = vazia(tipo().caixa).map((l) => l.split(''))
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const ny = y + dy
      const nx = x + dx
      if (ny >= 0 && ny < altura && nx >= 0 && nx < largura) novo[ny]![nx] = m[y]![x]!
    }
  }
  parte()[vista] = novo.map((l) => l.join(''))
  mudou()
}

function virar(): void {
  lembrar()
  parte()[vista] = parte()[vista].map((l) => l.split('').reverse().join(''))
  mudou()
}

function copiarVista(de: Vista, para: Vista): void {
  lembrar()
  parte()[para] = [...parte()[de]]
  vista = para
  atualizarFerramentas()
  mudou()
}

function limparVista(): void {
  lembrar()
  parte()[vista] = [...vazia(tipo().caixa)]
  mudou()
}

/* ---------- operações em partes e tipos ---------- */

function novaParte(): void {
  lembrar()
  const base = typeof sel === 'number' ? parte() : tipo().partes[0]!
  const nova: ParteEd = {
    nome: 'nova',
    frente: [...vazia(tipo().caixa)],
    lado: [...vazia(tipo().caixa)],
  }
  // a nova herda as cores do tipo (chapéu marrom, criatura com extra...)
  for (const k of ['fixa', 'extra1', 'extra2', 'atras'] as const) {
    if (base[k] !== undefined) (nova as unknown as Record<string, unknown>)[k] = base[k]
  }
  tipo().partes.push(nova)
  sel = tipo().partes.length - 1
  mudou(true)
}

function duplicarParte(): void {
  lembrar()
  const copia = copiar(parte())
  copia.nome = `${copia.nome} 2`
  tipo().partes.push(copia)
  sel = tipo().partes.length - 1
  mudou(true)
}

function excluirParte(): void {
  if (typeof sel === 'string') return
  if (tipo().partes.length <= 1) {
    alert('O tipo precisa de pelo menos uma parte.')
    return
  }
  if (!confirm(`Excluir "${parte().nome}"?`)) return
  lembrar()
  tipo().partes.splice(sel, 1)
  sel = Math.max(0, sel - 1)
  mudou(true)
}

function moverParte(passo: number): void {
  if (typeof sel === 'string') return
  const lista = tipo().partes
  const alvo = sel + passo
  if (alvo < 0 || alvo >= lista.length) return
  lembrar()
  ;[lista[sel], lista[alvo]] = [lista[alvo]!, lista[sel]!]
  sel = alvo
  mudou(true)
}

function moverTipo(passo: number): void {
  const lista = dados().tipos
  const alvo = iTipo + passo
  if (alvo < 0 || alvo >= lista.length) return
  lembrar()
  ;[lista[iTipo], lista[alvo]] = [lista[alvo]!, lista[iTipo]!]
  iTipo = alvo
  mudou(true)
}

const NOME_VALIDO = /^[a-z][a-z0-9]*$/

function novoTipo(): void {
  const nome = prompt('Nome do tipo novo (minúsculas, sem espaço — vai ser usado no !parte):', '')
  if (nome === null) return
  if (!NOME_VALIDO.test(nome) || dados().tipos.some((t) => t.nome === nome)) {
    alert('Nome inválido ou já usado.')
    return
  }
  lembrar()
  const caixa: Caixa = { x: 0, y: 0, largura: GRADE, altura: GRADE }
  dados().tipos.push({
    nome,
    caixa,
    slot: 'roupa',
    movimento: 'corpo',
    partes: [{ nome: 'nenhum', frente: [...vazia(caixa)], lado: [...vazia(caixa)] }],
  })
  iTipo = dados().tipos.length - 1
  sel = 0
  mudou(true)
}

function excluirTipo(): void {
  if (dados().tipos.length <= 1) return
  if (!confirm(`Excluir o tipo "${tipo().nome}" e todas as ${tipo().partes.length} partes dele?`)) return
  lembrar()
  dados().tipos.splice(iTipo, 1)
  iTipo = Math.max(0, iTipo - 1)
  sel = 0
  mudou(true)
}

/** Recorta uma matriz para outra caixa, mantendo cada pixel no mesmo lugar da grade. */
function recortar(m: readonly string[], de: Caixa, para: Caixa): string[] {
  return Array.from({ length: para.altura }, (_, y) => {
    let linha = ''
    for (let x = 0; x < para.largura; x++) {
      linha += m[para.y + y - de.y]?.[para.x + x - de.x] ?? '.'
    }
    return linha
  })
}

function aplicarCaixa(nova: Caixa): void {
  const velha = tipo().caixa
  lembrar()
  const partes = [...tipo().partes]
  for (const [chave, esp] of Object.entries(ESPECIAIS)) {
    const p = dados().especiais?.[chave]
    if (esp.tipo === tipo().nome && p) partes.push(p)
  }
  for (const p of partes) {
    p.frente = recortar(p.frente, velha, nova)
    p.lado = recortar(p.lado, velha, nova)
    if (p.passada) {
      p.passada.de += velha.y - nova.y
      if (p.passada.cortes) p.passada.cortes = p.passada.cortes.map((c) => c + velha.x - nova.x)
    }
  }
  tipo().caixa = nova
  mudou(true)
}

/* ---------- coluna da direita: prévia e propriedades ---------- */

const ESCALA_PREVIA = 3
const previaParado = el('div', 'previa')
const previaAndando = el('div', 'previa')
const skinEl = el('div', 'campos')
const aleatoriasEl = el('div', 'aleatorias')
const parteEl = el('div', 'campos')
const tipoEl = el('div', 'campos')

colDir.append(
  el('h2', undefined, 'Parado (3×)'),
  previaParado,
  el('h2', undefined, 'Andando (3×) e no tamanho do overlay (2×)'),
  previaAndando,
  el('h2', undefined, 'Esta parte'),
  parteEl,
  el('h2', undefined, 'Tipo'),
  tipoEl,
  el('h2', undefined, 'Boneco da prévia'),
  skinEl,
  el('h2', undefined, 'Em outros bonecos'),
  linhaDeBotoes(botao('Sortear', () => {
    sortearAleatorias()
    agendar()
  })),
  aleatoriasEl,
)

interface Tela {
  canvas: HTMLCanvasElement
  vista: Vista
  espelhar: boolean
  escala: number
  andando: boolean
  skin?: () => Skin
}

const telas: Tela[] = []

function tela(pai: HTMLElement, rotulo: string, t: Omit<Tela, 'canvas'>): void {
  const canvas = el('canvas')
  canvas.width = canvas.height = Math.round((GRADE + MARGEM * 2) * t.escala)
  const caixa = el('div')
  caixa.append(canvas)
  if (rotulo) caixa.append(el('div', 'rotulo', rotulo))
  pai.append(caixa)
  telas.push({ canvas, ...t })
}

const VISTAS: { rotulo: string; vista: Vista; espelhar: boolean }[] = [
  { rotulo: 'frente', vista: 'frente', espelhar: false },
  { rotulo: 'direita', vista: 'lado', espelhar: false },
  { rotulo: 'esquerda', vista: 'lado', espelhar: true },
]
for (const v of VISTAS) tela(previaParado, v.rotulo, { ...v, escala: ESCALA_PREVIA, andando: false })
for (const v of VISTAS) tela(previaAndando, v.rotulo, { ...v, escala: ESCALA_PREVIA, andando: true })
for (const v of VISTAS.slice(0, 2)) tela(previaAndando, '', { ...v, escala: 2, andando: true })
const TELAS_FIXAS = telas.length

/** A skin da prévia, com a parte que está sendo editada. */
function skinDaPrevia(): Skin {
  if (typeof sel === 'string') return skinBase
  return { ...skinBase, partes: { ...skinBase.partes, [tipo().nome]: sel } }
}

function sortearAleatorias(): void {
  aleatorias = Array.from({ length: 8 }, () => skinAleatoria(corpo))
  aleatoriasEl.textContent = ''
  telas.splice(TELAS_FIXAS)
  aleatorias.forEach((_, i) => {
    const caixa = el('div')
    aleatoriasEl.append(caixa)
    const comParte = (): Skin => {
      const s = aleatorias[i]!
      if (typeof sel === 'string') return s
      return { ...s, partes: { ...s.partes, [tipo().nome]: sel } }
    }
    tela(caixa, '', { vista: 'frente', espelhar: false, escala: 2, andando: true, skin: comParte })
    tela(caixa, '', { vista: 'lado', espelhar: false, escala: 2, andando: true, skin: comParte })
  })
}

function desenharPrevias(agora: number): void {
  const quadroAtual = Math.floor(agora / 160) % QUADROS
  const falando = typeof sel === 'string'
  for (const t of telas) {
    const ctx = ctx2d(t.canvas)
    ctx.clearRect(0, 0, t.canvas.width, t.canvas.height)
    const skin = t.skin ? t.skin() : skinDaPrevia()
    const sprite = spriteDaSkin(skin, t.vista, t.escala, t.andando ? quadroAtual : -1, falando)
    ctx.save()
    if (t.espelhar) {
      ctx.translate(t.canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(sprite, 0, 0)
    ctx.restore()
  }
}

function campo(pai: HTMLElement, rotulo: string, ...filhos: (HTMLElement | string)[]): void {
  const d = el('div')
  d.append(...filhos)
  pai.append(el('span', undefined, rotulo), d)
}

/** Opção de cor que pode ficar desligada (a parte usa a cor do slot). */
function corOpcional(pai: HTMLElement, rotulo: string, chave: 'fixa' | 'extra1' | 'extra2', nota: string): void {
  const p = parte()
  const liga = el('input')
  liga.type = 'checkbox'
  liga.checked = p[chave] !== undefined
  const cor = el('input')
  cor.type = 'color'
  cor.value = p[chave] ?? '#888888'
  cor.disabled = !liga.checked
  const aplicar = () => {
    lembrar()
    if (liga.checked) parte()[chave] = cor.value
    else delete parte()[chave]
    mudou(true)
  }
  liga.addEventListener('change', aplicar)
  cor.addEventListener('change', aplicar)
  campo(pai, rotulo, liga, cor, el('span', 'nota', nota))
}

function montarPropriedades(): void {
  const p = parte()
  parteEl.textContent = ''

  const nome = el('input')
  nome.value = p.nome
  nome.addEventListener('change', () => {
    lembrar()
    parte().nome = nome.value.trim() || 'sem nome'
    mudou(true)
  })
  campo(parteEl, 'nome', nome)
  corOpcional(parteEl, 'cor fixa', 'fixa', `ligada, ignora a cor de ${tipo().slot}`)
  corOpcional(parteEl, 'extra 1', 'extra1', 'tintas a b c')
  corOpcional(parteEl, 'extra 2', 'extra2', 'tintas d e f')

  const atras = el('input')
  atras.type = 'checkbox'
  atras.checked = !!p.atras
  atras.addEventListener('change', () => {
    lembrar()
    if (atras.checked) parte().atras = true
    else delete parte().atras
    mudou(true)
  })
  campo(parteEl, 'atrás', atras, el('span', 'nota', 'desenha atrás do corpo (asa, cauda)'))

  const temPassada = el('input')
  temPassada.type = 'checkbox'
  temPassada.checked = !!p.passada
  const de = el('input')
  de.type = 'number'
  de.min = '0'
  de.value = String(p.passada?.de ?? Math.floor(tipo().caixa.altura * 0.7))
  const cortes = el('input')
  cortes.placeholder = 'ex: 14,20,26'
  cortes.style.width = '100px'
  cortes.value = p.passada?.cortes?.join(',') ?? ''
  const aplicarPassada = () => {
    lembrar()
    if (!temPassada.checked) delete parte().passada
    else {
      const lista = cortes.value.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n))
      parte().passada = { de: Number(de.value) || 0, ...(lista.length ? { cortes: lista } : {}) }
    }
    mudou(true)
  }
  for (const i of [temPassada, de, cortes]) i.addEventListener('change', aplicarPassada)
  campo(parteEl, 'passada', temPassada, 'linha', de, 'cortes', cortes)
  parteEl.append(el('span'), el('p', 'nota',
    'De perfil, da linha em diante a matriz é perna (linha azul no quadro). ' +
    'Sem cortes, a perna de trás é uma cópia escura; com cortes, cada faixa é uma pata.'))

  // tipo
  const t = tipo()
  tipoEl.textContent = ''
  const tNome = el('input')
  tNome.value = t.nome
  tNome.addEventListener('change', () => {
    const novo = tNome.value.trim()
    if (!NOME_VALIDO.test(novo) || dados().tipos.some((o) => o !== t && o.nome === novo)) {
      alert('Nome inválido ou já usado.')
      tNome.value = t.nome
      return
    }
    lembrar()
    const antigo = tipo().nome
    tipo().nome = novo
    for (const esp of Object.values(ESPECIAIS)) if (esp.tipo === antigo) esp.tipo = novo
    mudou(true)
  })
  campo(tipoEl, 'nome', tNome)

  const slot = el('select')
  for (const s of SLOTS) slot.append(new Option(s, s, false, s === t.slot))
  slot.addEventListener('change', () => {
    lembrar()
    tipo().slot = slot.value as Slot
    mudou(true)
  })
  campo(tipoEl, 'cor de', slot, el('span', 'nota', 'tintas 1 2 3, se a parte não tem cor fixa'))

  const mov = el('select')
  for (const m of MOVIMENTOS) mov.append(new Option(m, m, false, m === t.movimento))
  mov.addEventListener('change', () => {
    lembrar()
    tipo().movimento = mov.value as Movimento
    mudou(true)
  })
  campo(tipoEl, 'movimento', mov, el('span', 'nota', 'corpo · perna (sapato) · braco (na mão) · bicho'))

  const numeros = (['x', 'y', 'largura', 'altura'] as const).map((k) => {
    const i = el('input')
    i.type = 'number'
    i.min = k === 'largura' || k === 'altura' ? '1' : '0'
    i.max = String(GRADE)
    i.value = String(t.caixa[k])
    i.title = k
    return i
  })
  const bCaixa = botao('aplicar', () => {
    const [x, y, largura, altura] = numeros.map((i) => Math.round(Number(i.value)))
    const nova = { x: x!, y: y!, largura: largura!, altura: altura! }
    if (nova.x < 0 || nova.y < 0 || nova.largura < 1 || nova.altura < 1 ||
      nova.x + nova.largura > GRADE || nova.y + nova.altura > GRADE) {
      alert(`A caixa precisa caber na grade de ${GRADE}×${GRADE}.`)
      return
    }
    aplicarCaixa(nova)
  })
  campo(tipoEl, 'caixa', 'x', numeros[0]!, 'y', numeros[1]!, 'l', numeros[2]!, 'a', numeros[3]!, bCaixa)
  tipoEl.append(el('span'), el('p', 'nota',
    'Mudar a caixa não move o desenho: corta o que sair e abre espaço vazio. Para mover o desenho, use as setas.'))
  const bExcluir = botao('excluir tipo', excluirTipo)
  bExcluir.disabled = dados().tipos.length <= 1
  campo(tipoEl, '', bExcluir)

  // boneco da prévia
  skinEl.textContent = ''
  for (const tp of dados().tipos) {
    const s = el('select')
    tp.partes.forEach((pt, i) => s.append(new Option(`${i + 1}. ${pt.nome}`, String(i))))
    s.value = String((skinBase.partes[tp.nome] ?? 0) % tp.partes.length)
    if (tp === t && typeof sel === 'number') {
      s.disabled = true
      s.value = String(sel)
    }
    s.addEventListener('change', () => {
      skinBase = { ...skinBase, partes: { ...skinBase.partes, [tp.nome]: Number(s.value) } }
      mudou(true)
    })
    campo(skinEl, tp.nome, s)
  }
  const slotsEmUso = new Set(dados().tipos.filter((tp) => !tp.partes.every((pt) => pt.fixa)).map((tp) => tp.slot))
  for (const sl of slotsEmUso) {
    const s = el('select')
    paletas[sl].forEach((c, i) => s.append(new Option(c.nome, String(i))))
    s.value = String(skinBase.cores[sl])
    s.addEventListener('change', () => {
      skinBase = { ...skinBase, cores: { ...skinBase.cores, [sl]: Number(s.value) } }
      mudou(true)
    })
    campo(skinEl, `cor ${sl}`, s)
  }
  campo(skinEl, '', botao('Sortear boneco', () => {
    skinBase = skinAleatoria(corpo)
    mudou(true)
  }))
}

/* ---------- ciclo ---------- */

let agendado = false

function agendar(): void {
  agendado = true
}

/**
 * Depois de qualquer mudança: o catálogo em memória passa a ser o do editor
 * (a prévia usa o render de verdade) e a tela é redesenhada.
 */
function mudou(estrutura = false): void {
  definirDados(corpo, dados() as unknown as DadosCorpo)
  if (estrutura) {
    montarListas()
    montarPropriedades()
  } else {
    desenharMiniatura(sel)
  }
  atualizarFerramentas()
  atualizarTopo()
  agendar()
}

// o JSON salvo volta pelo HMR: o catálogo continua sendo o do editor
aoMudarCatalogo(() => {
  for (const c of CORPOS) {
    if (dadosDo(c) !== (estado[c] as unknown as DadosCorpo)) definirDados(c, estado[c] as unknown as DadosCorpo)
  }
})

function atualizarTopo(): void {
  CORPOS.forEach((c, i) => {
    abasCorpo[i]!.classList.toggle('ativo', c === corpo)
    abasCorpo[i]!.classList.toggle('sujo', sujo(c))
  })
  bDesfazer.disabled = desfeitos.length === 0
  bRefazer.disabled = refeitos.length === 0
  bSalvar.classList.toggle('sujo', CORPOS.some(sujo))
  const lista = validarCatalogo()
  erros.textContent = lista.length ? `Catálogo com problema:\n${lista.join('\n')}` : ''
}

function quadroDeAnimacao(agora: number): void {
  if (agendado) {
    agendado = false
    desenharQuadro()
  }
  desenharPrevias(agora)
  requestAnimationFrame(quadroDeAnimacao)
}

/* ---------- salvar ---------- */

function avisar(texto: string, erro = false): void {
  status.textContent = texto
  status.classList.toggle('erro', erro)
}

async function salvar(): Promise<void> {
  const problemas = validarCatalogo()
  if (problemas.length > 0) {
    avisar('Não salvei: o catálogo tem problema (veja acima).', true)
    return
  }
  const pendentes = CORPOS.filter(sujo)
  if (pendentes.length === 0) {
    avisar('Nada para salvar.')
    return
  }
  try {
    for (const c of pendentes) {
      const texto = JSON.stringify(estado[c])
      const r = await fetch(`/__editor/salvar/${c}`, { method: 'POST', body: texto })
      if (!r.ok) throw new Error(`${c}: ${await r.text()}`)
      salvo[c] = texto
    }
    avisar(`Salvo às ${new Date().toLocaleTimeString('pt-BR')}. Falta só o commit.`)
  } catch (e) {
    avisar(`Erro ao salvar (o editor só salva no npm run dev): ${e instanceof Error ? e.message : e}`, true)
  }
  atualizarTopo()
}

window.addEventListener('beforeunload', (e) => {
  if (CORPOS.some(sujo)) e.preventDefault()
})

/* ---------- teclado ---------- */

const TINTAS = new Set<string>(CARACTERES)

window.addEventListener('keydown', (e) => {
  const tecla = e.key.toLowerCase()
  if ((e.ctrlKey || e.metaKey) && tecla === 's') {
    e.preventDefault()
    void salvar()
    return
  }
  const alvo = e.target as HTMLElement
  if (alvo.tagName === 'INPUT' || alvo.tagName === 'SELECT') return

  if (e.ctrlKey || e.metaKey) {
    if (tecla === 'z' && !e.shiftKey) desfazer()
    else if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) refazer()
    else return
    e.preventDefault()
    return
  }
  if (e.altKey) return

  const setas: Record<string, [number, number]> = {
    arrowleft: [-1, 0],
    arrowright: [1, 0],
    arrowup: [0, -1],
    arrowdown: [0, 1],
  }
  if (setas[tecla]) {
    e.preventDefault()
    deslocar(...setas[tecla]!)
  } else if (TINTAS.has(tecla)) {
    tinta = tecla
    atualizarFerramentas()
  } else if (tecla === 'p') usar('lapis')
  else if (tecla === 'g') usar('balde')
  else if (tecla === 'i') usar('conta')
  else if (tecla === 'm') {
    espelho = !espelho
    atualizarFerramentas()
  } else if (tecla === 'v') trocarVista(vista === 'frente' ? 'lado' : 'frente')
  else if (tecla === 'h') {
    camadas = !camadas
    atualizarFerramentas()
    agendar()
  }
})

/* ---------- início ---------- */

sortearAleatorias()
mudou(true)
requestAnimationFrame(quadroDeAnimacao)
