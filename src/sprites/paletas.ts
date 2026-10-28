import type { Slot } from './molde'

/**
 * Paletas: as cores que um avatar pode escolher, por slot.
 * O comando `!cor <n>` do chat (Etapa 5) vai mexer nesses índices.
 *
 * Acessórios e criaturas não estão aqui: a cor deles é fixa na própria parte.
 */
export const paletas: Record<Slot, readonly { nome: string; hex: string }[]> = {
  pele: [
    { nome: 'clara', hex: '#f0c3a0' },
    { nome: 'media', hex: '#b97f55' },
    { nome: 'escura', hex: '#6b4030' },
  ],
  cabelo: [
    { nome: 'castanho', hex: '#4a2f1e' },
    { nome: 'loiro', hex: '#e0bc63' },
    { nome: 'ruivo', hex: '#c2552a' },
  ],
  olhos: [
    { nome: 'castanho', hex: '#6b3f22' },
    { nome: 'azul', hex: '#3f7fd4' },
    { nome: 'verde', hex: '#3fa85f' },
    { nome: 'rosa', hex: '#ff4fb0' },
  ],
  roupa: [
    { nome: 'rosa', hex: '#ff4fb0' },
    { nome: 'roxo', hex: '#7b3fd4' },
    { nome: 'ciano', hex: '#2fc6d8' },
    { nome: 'verde', hex: '#3fc46a' },
    { nome: 'amarelo', hex: '#e8c23f' },
    { nome: 'preto', hex: '#39283c' },
  ],
}
