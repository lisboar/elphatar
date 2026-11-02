import { banco, CANAL_ID, chaveValida, perguntarSeSegue, preflight, responder, tokenDoCanal } from '../_shared/comum.ts'

/**
 * GET /seguidor?id=<ID da Twitch>  (header x-chave-overlay)
 * → { segue: true | false | null }   null = não deu para saber
 *
 * Cache no banco: quem segue fica 7 dias sem perguntar de novo; quem não
 * segue, 10 minutos (pode seguir no meio da live).
 */

const CACHE_SEGUE = 7 * 24 * 60 * 60 * 1000
const CACHE_NAO_SEGUE = 10 * 60 * 1000

Deno.serve(async (req) => {
  const opcoes = preflight(req)
  if (opcoes) return opcoes
  if (!chaveValida(req)) return responder({ erro: 'chave do overlay inválida' }, 401)

  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!/^\d{1,20}$/.test(id)) return responder({ erro: 'id inválido' }, 400)

  // a dona do canal não tem como seguir a si mesma
  if (id === CANAL_ID) return responder({ segue: true })

  const { data: guardado } = await banco
    .from('seguidores').select('segue, conferido_em').eq('twitch_id', id).maybeSingle()
  if (guardado) {
    const idade = Date.now() - new Date(guardado.conferido_em).getTime()
    if (idade < (guardado.segue ? CACHE_SEGUE : CACHE_NAO_SEGUE)) {
      return responder({ segue: guardado.segue, cache: true })
    }
  }

  try {
    let token = await tokenDoCanal()
    if (!token) return responder({ segue: null, motivo: 'a Renata ainda não autorizou' }, 503)

    let segue = await perguntarSeSegue(token, id)
    if (segue === null) {
      // token recusado: tenta uma vez com um novo
      token = await tokenDoCanal(true)
      segue = token ? await perguntarSeSegue(token, id) : null
    }
    if (segue === null) return responder({ segue: null, motivo: 'token sem permissão' }, 503)

    await banco.from('seguidores').upsert({ twitch_id: id, segue, conferido_em: new Date().toISOString() })
    return responder({ segue })
  } catch (erro) {
    console.error(erro)
    return responder({ segue: null, motivo: 'erro ao falar com a Twitch' }, 502)
  }
})
