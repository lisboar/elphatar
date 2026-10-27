/**
 * Configuração do overlay.
 * Tudo que é personalizável mora aqui, nunca espalhado no código.
 */
export const config = {
  /** Resolução lógica do canvas. O OBS usa a mesma. */
  tela: { largura: 1920, altura: 1080 },

  /** Faixa de baixo onde os avatares andam (em px, a partir da base). */
  faixa: { altura: 180, margemInferior: 24 },

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
