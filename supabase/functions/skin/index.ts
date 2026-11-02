import { banco, chaveValida, preflight, responder } from '../_shared/comum.ts'

/**
 * POST /skin  { id, login, skin }  (header x-chave-overlay)
 * Grava a skin de um viewer. A leitura é direta pela API REST (pública).
 */

const TIPOS = ['humanoide', 'criatura']

function indices(valor: unknown): boolean {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false
  const pares = Object.entries(valor)
  return pares.length <= 40 && pares.every(([k, v]) =>
    /^[a-z0-9_-]{1,30}$/i.test(k) && Number.isInteger(v) && (v as number) >= 0 && (v as number) < 100)
}

function skinValida(skin: unknown): boolean {
  if (!skin || typeof skin !== 'object') return false
  const s = skin as Record<string, unknown>
  return TIPOS.includes(s.tipo as string) && indices(s.partes) && indices(s.cores)
}

Deno.serve(async (req) => {
  const opcoes = preflight(req)
  if (opcoes) return opcoes
  if (!chaveValida(req)) return responder({ erro: 'chave do overlay inválida' }, 401)
  if (req.method !== 'POST') return responder({ erro: 'use POST' }, 405)

  const texto = await req.text()
  if (texto.length > 4000) return responder({ erro: 'grande demais' }, 413)

  let corpo: { id?: unknown; login?: unknown; skin?: unknown }
  try {
    corpo = JSON.parse(texto)
  } catch {
    return responder({ erro: 'JSON inválido' }, 400)
  }

  const { id, login, skin } = corpo
  if (typeof id !== 'string' || !/^\d{1,20}$/.test(id)) return responder({ erro: 'id inválido' }, 400)
  if (typeof login !== 'string' || !/^[a-z0-9_]{1,25}$/.test(login)) return responder({ erro: 'login inválido' }, 400)
  if (!skinValida(skin)) return responder({ erro: 'skin inválida' }, 400)

  const { error } = await banco.from('skins').upsert({
    twitch_id: id, login, skin, atualizado_em: new Date().toISOString(),
  })
  if (error) {
    console.error(error)
    return responder({ erro: 'falha ao gravar' }, 500)
  }
  return responder({ ok: true })
})
