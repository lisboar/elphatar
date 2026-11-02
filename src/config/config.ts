import { GRADE } from '../sprites/molde'

/** Pixels da tela por pixel da arte. Fracionária funciona, mas inteira fica mais nítida. */
const ESCALA_AVATAR = 2

/**
 * Configuração do overlay.
 * Tudo que é personalizável mora aqui, nunca espalhado no código.
 *
 * Estes são os valores padrão. O que o painel ajusta (ver `ajustes.ts`) é
 * gravado por cima destes campos enquanto o overlay roda.
 */
export const config = {
  /** Resolução lógica do canvas. O OBS usa a mesma. */
  tela: { largura: 1920, altura: 1080 },

  escala: ESCALA_AVATAR as number,

  /** Tamanho do avatar desenhado na tela, em pixels (48 x 2 = 96). */
  get avatar(): number {
    return GRADE * this.escala
  },

  /** Mostra o nome embaixo do avatar. */
  mostrarNomes: true,

  /** Faixa de baixo onde os avatares andam. */
  faixa: {
    /** Altura da faixa, contada a partir da base dos pés. */
    altura: 190,
    /** Distância entre o pé do avatar mais à frente e a base da tela.
     *  Precisa caber o nome, que é desenhado logo abaixo dos pés. */
    margemInferior: 40,
    /** Quanto um avatar pode recuar para o fundo da faixa. */
    profundidade: 46,
  },

  /** Como o avatar se move. */
  movimento: {
    /** Pixels por segundo. */
    velocidade: 46,
    /** Quanto tempo, em segundos, ele fica parado antes de decidir de novo. */
    parado: { minimo: 1.6, maximo: 5 },
    /** Quanto tempo, em segundos, ele anda antes de decidir de novo. */
    andando: { minimo: 1.6, maximo: 5 },
    /** Chance de escolher "andar" quando decide. */
    chanceDeAndar: 0.55,
    /** Segundos por quadro da caminhada. */
    segundosPorQuadro: 0.16,
    /** Margem nas laterais da tela. */
    margemLateral: 40,
  },

  /** Balão de fala. */
  balao: {
    /** Quanto tempo o balão fica na tela, em segundos. */
    duracao: 7,
    larguraMaxima: 200,
    maximoDeLinhas: 4,
    respiro: 7,
    raio: 7,
    rabicho: 6,
    fundo: '#fdf2fa',
    borda: '#ff4fb0',
    texto: '#2a1030',
  },

  texto: {
    familia: 'system-ui, -apple-system, Segoe UI, sans-serif',
    tamanhoNome: 15,
    tamanhoBalao: 14,
  },

  /** Quantos avatares cabem na cena antes de o overlay parar de aceitar novos. */
  limiteDeAvatares: 60,

  /** Canal da Twitch lido pelo adaptador de chat. Dá para trocar no teste com ?canal=outro */
  canal: 'donalurdes_inss',

  /** Contas que não ganham avatar (regra 6). Em minúsculas. */
  bots: [
    'nightbot', 'streamelements', 'moobot', 'streamlabs', 'fossabot',
    'wizebot', 'botrixoficial', 'soundalerts', 'sery_bot', 'kofistreambot',
  ],

  /** Lista de quem está na tela, guardada para sobreviver a um recarregamento. */
  sessao: {
    /** Overlay parado por mais que isto = live nova, a tela começa vazia. */
    horasParaNovaLive: 6,
    /** De quanto em quanto tempo a lista é salva mesmo sem mudança, em segundos. */
    salvarACada: 60,
  },

  /** Comando de mod que tira todo mundo da tela (regra 5). */
  comandoLimpar: '!limpar',

  /**
   * Projeto Supabase. Os dois valores são públicos por natureza: vão no JS de
   * qualquer jeito, e quem protege os dados são as regras (RLS) do banco.
   * Segredo de verdade (token da Twitch, service key) fica só no Supabase.
   */
  supabase: {
    url: 'https://hwpgphfrjeovndusvazg.supabase.co',
    chavePublica: 'sb_publishable_nND5Jj2o-Wpbs6Rt_OMvMA_Xxj-hbwi',
  },

  /** App no Twitch Developer Console. O Client ID é público; o secret fica só no Supabase. */
  twitch: {
    clientId: 'rlywmuqxfq1z3uxw75ioo3eb3qtqou',
    /** Pedidos no login do painel. Seguidores: vale para a dona do canal e mods. */
    escopos: ['moderator:read:followers'],
  },

  /** De quanto em quanto tempo o overlay confere os ajustes do painel, em segundos. */
  conferirAjustesACada: 15,

  /** Identidade visual: rosa / neon escuro. */
  cores: {
    rosa: '#ff4fb0',
    rosaClaro: '#ffd6ef',
    escuro: '#140a12',
  },
}
