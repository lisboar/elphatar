# Brief: arte dos avatares (overlay de chat da Twitch)

## O que é
Avatares pequenos que andam na parte de baixo da tela de uma live (overlay do
OBS, fundo transparente). Cada pessoa do chat vira um personagem. O código
monta o personagem juntando **camadas separadas** (cabeça, cabelo, roupa…),
pinta com as cores que o viewer escolheu e anima andando. Por isso cada parte
precisa ser um arquivo separado, sempre no mesmo molde.

Estilo: fofo, chibi (cabeça grande), traço limpo, **vetor com cantos
arredondados**, contorno fino. Nada de pixel art. Identidade da live: rosa
neon sobre fundo escuro, mas os personagens são coloridos e legíveis sobre
qualquer fundo (o jogo Valorant passa atrás).

Na tela o personagem aparece com uns **100 px de altura**: os detalhes
precisam ler nesse tamanho (olhos e boca grandes, poucos detalhes finos).

---

## Regras técnicas (valem para TODOS os arquivos)

1. Formato **SVG**, um arquivo por camada.
2. Todo arquivo com `viewBox="0 0 256 256"`, `width="256"` e `height="256"`.
   Sempre o quadro inteiro, mesmo que a parte ocupe um canto: **a posição da
   parte dentro do quadro é o que faz as camadas se encaixarem**. Não recorte.
3. Fundo transparente. Nada de `<image>`, `<text>`, fontes, `<filter>`,
   `<mask>`, `<style>` nem classes CSS. Cores sempre em atributo direto
   (`fill="#FF00A1"`, `stroke="#2B1B2E"`).
4. Gradiente pode, desde que as cores dos `stop` sigam a regra de cores abaixo.
5. **Contorno:** cor `#2B1B2E`, `stroke-width="4"`, `stroke-linejoin="round"`
   e `stroke-linecap="round"`. Igual em todas as partes.
6. Vista **de frente: simétrica** (espelhe uma metade para fazer a outra),
   exceto detalhes de propósito (franja de lado, laço de um lado).
7. Vista **de lado: virada para a DIREITA**. O código espelha para andar para
   a esquerda; não desenhe a versão esquerda.

## Cores: o que muda com o viewer

Partes que o viewer pinta usam **cores-código exatas**. O código troca cada
cor-código pela cor escolhida (e calcula sombra e luz a partir dela). Toda
cor que NÃO for uma destas fica fixa como foi desenhada (ex.: dentes brancos,
lente de óculos, sangue do zumbi).

| Grupo | Base | Sombra | Luz |
|---|---|---|---|
| Pele | `#FF00A1` | `#FF00A2` | `#FF00A3` |
| Cabelo | `#FF00B1` | `#FF00B2` | `#FF00B3` |
| Roupa | `#FF00C1` | `#FF00C2` | `#FF00C3` |
| Olhos (íris) | `#FF00D1` | `#FF00D2` | `#FF00D3` |
| Criatura (corpo do bicho) | `#FF00E1` | `#FF00E2` | `#FF00E3` |

Use sombra e luz com moderação (1 sombra e no máximo 1 brilho por parte).
A parte de baixo da roupa (calça, short) pode ter cor fixa, como jeans.

---

## Molde do HUMANO

Coordenadas no quadro 256×256. "Esquerda" = lado esquerdo da imagem.

### De frente
| Ponto | Coordenada |
|---|---|
| Chão (sola dos pés) | y = 240 |
| Centro do corpo | x = 128 |
| Cabeça | círculo de referência com centro (128, 88), raio 52 |
| Pescoço | (128, 140) |
| Ombro esquerdo / direito | (100, 150) / (156, 150) |
| Quadril esquerdo / direito | (114, 196) / (142, 196) |
| Mãos (braço solto) | perto de y = 200 |

Tronco entre y 140 e 200. Pernas entre y 196 e 240. Chapéu e cabelo alto
podem subir até y = 8. Nada passa de x 24 a 232.

### De lado (virado para a direita)
| Ponto | Coordenada |
|---|---|
| Chão | y = 240 |
| Cabeça | centro (132, 88), raio 52 |
| Ombro | (128, 150) |
| Quadril | (128, 196) |

**Pivôs:** o código gira a perna em volta do quadril e o braço em volta do
ombro para andar. Desenhe perna e braço **retos, parados**, começando
exatamente no ponto do quadril/ombro, com a junta arredondada (para não abrir
fresta ao girar).

### Camadas e pastas do humano

O número na frente do nome define a ordem (ela é salva na skin de cada
viewer). Nunca renumere; variante nova ganha o próximo número.

```
arte/humanoide/
  corpo/
    frente/  cabeca.svg  tronco.svg  perna_esq.svg  perna_dir.svg  braco_esq.svg  braco_dir.svg
    lado/    cabeca.svg  tronco.svg  perna.svg  braco.svg
  olhos/      01-normais/  02-…/          → frente.svg  lado.svg
  boca/       01-sorriso/  02-neutra/     → frente.svg  lado.svg
  boca-falando/                           → frente.svg  lado.svg   (boca aberta, usada enquanto o balão aparece)
  cabelo/     01-careca/  02-curto/  03-medio/  04-longo/ …
                → frente/frente.svg  frente/atras.svg  lado/frente.svg  lado/atras.svg
  roupa/      01-blusa-e-calca/  02-…/
                → frente/  cima.svg  perna_esq.svg  perna_dir.svg  braco_esq.svg  braco_dir.svg
                → lado/    cima.svg  perna.svg  braco.svg
  acessorio/  01-nenhum/  02-chapeu/  03-laco/  04-oculos/  05-aureola/ …   → frente.svg  lado.svg
```

- **Pele** em cabeça, tronco, pernas e braços (cor-código de pele).
- **Cabelo** tem duas camadas: `frente` (por cima da cabeça) e `atras`
  (atrás do corpo, ex.: cabelo longo caindo nas costas). Sem parte de trás,
  deixe `atras.svg` vazio (só o `<svg>`). `01-careca`: as duas vazias.
- **Roupa** é cortada em pedaços que acompanham o corpo: `cima` (no tronco;
  saia e vestido também vão aqui), `perna_*` (calça/short em cada perna) e
  `braco_*` (manga em cada braço). Pedaço que não existe (regata sem manga,
  vestido sem calça): não mande o arquivo.
- **Olhos**: só os olhos (branco, íris com a cor-código, brilho). Sem
  sobrancelha, a menos que ela faça parte do desenho.
- **Acessório** `01-nenhum`: arquivos vazios.
- Cada boca, olho, cabelo e acessório precisa **encaixar em todas as cabeças**.

### Ordem de desenho (de trás para a frente), para você conferir o encaixe
De frente: cabelo/atras → pernas → roupa/perna_* → tronco → roupa/cima →
braços → roupa/braco_* → cabeça → olhos → boca → cabelo/frente → acessório.

De lado: cabelo/atras → perna → roupa/perna → tronco → roupa/cima → cabeça →
olhos → boca → cabelo/frente → acessório → braço → roupa/braco.
(A perna e o braço "de trás" o código faz sozinho: copia e escurece.)

---

## Molde das CRIATURAS

Cada criatura é um desenho inteiro, mais as patas separadas para andar.
Mesmo quadro 256×256, chão em y = 240, centralizada em x = 128.
Tamanho parecido com o do humano (bicho pode ser mais baixo, até ~140 de altura).

```
arte/criatura/
  animal/   01-gato/  02-cachorro/  03-capivara/  04-galinha/ …
  monstro/  01-fantasma/  02-zumbi/  03-et/  04-boneco-assassino/  05-ghost-face/ …
    cada uma → frente/  corpo.svg  pata_a.svg  pata_b.svg
             → lado/    corpo.svg  pata_a.svg  pata_b.svg
```

- `pata_a` e `pata_b` são os dois grupos de patas que se alternam ao andar
  (bicho de 4 patas: pata_a = dianteira esquerda + traseira direita, pata_b =
  as outras duas). Bípede (galinha, zumbi): uma perna em cada.
- Sem patas (fantasma): mande só `corpo.svg`; o código faz ele flutuar.
- A cor-código de **criatura** pinta o corpo do bicho. Em monstro com pele
  fixa (zumbi, boneco), use a cor-código na **roupa** do monstro e a pele com
  cor fixa. ET pode ser todo fixo (verde).
- **A vista de frente é de frente de verdade** (rosto olhando para a câmera),
  não o perfil.

---

## O que entregar
1. A pasta `arte/` inteira, exatamente na estrutura acima.
2. `arte/molde.svg`: o quadro 256×256 com as linhas-guia e os pontos da
   tabela (chão, centro, cabeça, ombros, quadris).
3. `arte/previa.png`: uma folha com alguns personagens montados (frente e
   lado), para eu comparar depois que montar no código.
