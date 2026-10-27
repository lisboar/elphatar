/**
 * Valores que mudam por máquina ou são secretos.
 * Vêm do .env (fora do Git) ou da query string da URL do browser source do OBS.
 */
const query = new URLSearchParams(location.search)

export const ambiente = {
  /** Chave do overlay usada para chamar as Edge Functions (Etapa 4). Só pela URL. */
  chaveOverlay: query.get('chave') ?? '',

  /** URL do projeto Supabase (Etapa 4). */
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',

  /** Mostra diagnóstico na tela: ?debug=1 */
  debug: query.get('debug') === '1',
}
