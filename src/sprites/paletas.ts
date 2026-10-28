import type { Slot } from './molde'

/**
 * Paletas: as cores que um avatar pode escolher, por slot.
 * O comando `!cor <n>` do chat (Etapa 5) vai mexer nesses índices.
 * Identidade da live: rosa / neon escuro.
 */
export const paletas: Record<Slot, readonly { nome: string; hex: string }[]> = {
  pele: [
    { nome: 'clara', hex: '#f2c9a8' },
    { nome: 'rosada', hex: '#e8ad94' },
    { nome: 'media', hex: '#c88a63' },
    { nome: 'morena', hex: '#9b6243' },
    { nome: 'escura', hex: '#6b4030' },
    { nome: 'retinta', hex: '#4a2a21' },
  ],
  cabelo: [
    { nome: 'rosa', hex: '#ff4fb0' },
    { nome: 'preto', hex: '#2a2230' },
    { nome: 'castanho', hex: '#6b4226' },
    { nome: 'loiro', hex: '#e8c56a' },
    { nome: 'ruivo', hex: '#c9552c' },
    { nome: 'ciano', hex: '#3fd8e0' },
    { nome: 'roxo', hex: '#9b4ddb' },
    { nome: 'branco', hex: '#e6dfe8' },
  ],
  roupa: [
    { nome: 'rosa', hex: '#ff4fb0' },
    { nome: 'magenta', hex: '#c62a7e' },
    { nome: 'roxo', hex: '#7b3fd4' },
    { nome: 'ciano', hex: '#2fc6d8' },
    { nome: 'verde', hex: '#3fc46a' },
    { nome: 'amarelo', hex: '#e8c23f' },
    { nome: 'laranja', hex: '#e8713f' },
    { nome: 'escuro', hex: '#39283c' },
  ],
  olhos: [
    { nome: 'preto', hex: '#2a1f2c' },
    { nome: 'castanho', hex: '#7a4a2a' },
    { nome: 'verde', hex: '#3fa85f' },
    { nome: 'azul', hex: '#3f7fd4' },
    { nome: 'rosa', hex: '#ff4fb0' },
    { nome: 'ciano', hex: '#3fd8e0' },
  ],
  acessorio: [
    { nome: 'rosa', hex: '#ff4fb0' },
    { nome: 'ciano', hex: '#3fd8e0' },
    { nome: 'amarelo', hex: '#f0cf52' },
    { nome: 'roxo', hex: '#8b4ad4' },
    { nome: 'branco', hex: '#ece2ea' },
    { nome: 'escuro', hex: '#39283c' },
  ],
  corpo: [
    { nome: 'rosa', hex: '#ff6cc0' },
    { nome: 'magenta', hex: '#d12d8a' },
    { nome: 'roxo', hex: '#8a4ae0' },
    { nome: 'ciano', hex: '#3fd8e0' },
    { nome: 'verde', hex: '#4ad17a' },
    { nome: 'amarelo', hex: '#eccf55' },
    { nome: 'laranja', hex: '#ef7d45' },
    { nome: 'cinza', hex: '#8a7e92' },
  ],
}
