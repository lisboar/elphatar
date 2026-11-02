/**
 * Valores que mudam por máquina ou são secretos.
 * Vêm do .env (fora do Git) ou da query string da URL do browser source do OBS.
 */
const query = new URLSearchParams(location.search)

export const ambiente = {
  /** Chave do overlay usada para chamar as Edge Functions (Etapa 4). Só pela URL. */
  chaveOverlay: query.get('chave') ?? '',

  /** Prévia dentro do painel de controle: recebe os ajustes por mensagem, não do banco. */
  previa: query.get('previa') === '1',

  /** Mostra diagnóstico na tela: ?debug=1 */
  debug: query.get('debug') === '1',

  /** Painel de teste com chat falso: ?teste=1 */
  teste: query.get('teste') === '1',

  /** Enche a cena com N viewers falsos de uma vez: ?falsos=30 */
  falsos: Number(query.get('falsos') ?? '0') || 0,

  /** Lê outro canal, para testar com um chat movimentado: ?canal=outro */
  canal: query.get('canal') ?? '',

  /** Liga o chat real junto com o painel de teste: ?chat=1. Desliga sempre: ?chat=0 */
  chat: query.get('chat'),
}
