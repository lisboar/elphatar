import { ESCALA, GRADE } from '../sprites/molde'

/**
 * Configuração do overlay.
 * Tudo que é personalizável mora aqui, nunca espalhado no código.
 */
export const config = {
  /** Resolução lógica do canvas. O OBS usa a mesma. */
  tela: { largura: 1920, altura: 1080 },

  /** Tamanho do avatar desenhado na tela, em pixels. */
  avatar: GRADE * ESCALA,

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
    /** Quanto tempo, em segundos, ele fica parado ou andando antes de decidir de novo. */
    minimoNoEstado: 1.6,
    maximoNoEstado: 5,
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
    larguraMaxima: 300,
    maximoDeLinhas: 4,
    respiro: 12,
    raio: 10,
    rabicho: 9,
    fundo: '#fdf2fa',
    borda: '#ff4fb0',
    texto: '#2a1030',
  },

  texto: {
    familia: 'system-ui, -apple-system, Segoe UI, sans-serif',
    tamanhoNome: 19,
    tamanhoBalao: 19,
  },

  /** Quantos avatares cabem na cena antes de o overlay parar de aceitar novos. */
  limiteDeAvatares: 60,

  /** Canal da Twitch lido pelo adaptador de chat (Etapa 3). */
  canal: 'renataingrataaa',

  /** Contas que não ganham avatar (regra 6). */
  bots: ['nightbot', 'streamelements', 'moobot', 'streamlabs', 'fossabot'],

  /** Identidade visual: rosa / neon escuro. */
  cores: {
    rosa: '#ff4fb0',
    rosaClaro: '#ffd6ef',
    escuro: '#140a12',
  },
} as const
