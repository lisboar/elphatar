# Overlay de Avatares do Chat — Plano do Projeto

## Objetivo
Um overlay para OBS no estilo do **Stream Village**: cada pessoa que fala no chat vira um personagem em pixel art andando na parte de baixo da tela. As mensagens aparecem em balões sobre o personagem. Cada viewer personaliza o seu avatar por comandos.

Fase 2 (depois): os avatares reagem às kills e mortes da Renata no Valorant.

## Contexto
- Canal: twitch.tv/renataingrataaa. Live pequena, conteúdo de Valorant.
- Identidade visual: rosa / neon escuro.
- O PC da Renata está no limite com live e Valorant ao mesmo tempo. **Leveza é obrigatória.**
- Desenvolvimento e testes no PC do Thainã. Só vai para o OBS da Renata depois de pronto.

## Regras do overlay
1. **Os avatares não somem por inatividade.** A live é pequena: quem falou uma vez fica na tela até o fim da live.
2. Os avatares sobrevivem a um recarregamento do browser source durante a live (lista da sessão guardada localmente).
3. Todo mundo que fala no chat ganha um avatar.
4. **Comandos só para seguidores.** Quem segue pode usar todos os comandos.
5. Comando de mod: `!limpar` (limpa a tela).
6. Bots (Nightbot, StreamElements etc.) não ganham avatar. A lista fica na configuração.
7. Comandos em português.
8. Tela: 1920×1080, fundo transparente, avatares numa faixa na parte de baixo.

## Arte: partes combináveis em código
- As partes são **matrizes de pixels no código**, desenhadas no Canvas. Não há arquivos de imagem.
- Todas as partes usam o mesmo **molde fixo**, com posição definida para cada parte, e por isso sempre se encaixam.
  - Proposta: 32×32 px desenhado em escala 3×. Confirmar na Etapa 1.
- As cores vêm de **paletas**: trocar a cor é trocar o índice, sem redesenhar a parte.
- Dois tipos de corpo:
  - **Humanoide:** cabeça, olhos, cabelo, peito, braços, pernas, roupa, acessório
  - **Criatura** (pet, monstro ou fantasma): corpo, olhos, acessório
- Uma página **"Laboratório"** (que não entra no OBS) mostra todas as partes, combina e gera aleatórios.

## Stack e ferramentas
| Item | Uso |
|---|---|
| VS Code + Claude Code | Desenvolvimento |
| Git + GitHub | Versionamento e sincronia entre os 2 PCs |
| GitHub Pages + Actions | Hospedagem do overlay (deploy automático) |
| Node LTS, Vite, TypeScript | Build |
| Canvas 2D | Renderização |
| tmi.js | Leitura do chat da Twitch (anônimo) |
| Supabase (Postgres + Edge Functions) | Skins salvas e verificação de seguidor |
| Twitch Developer Console | App + token para checar seguidores |
| obs-websocket (já vem no OBS) | Receber eventos (humores, Fase 2) |
| Advanced Scene Switcher (plugin do OBS) | Detecção do Valorant (Fase 2) |

## Arquitetura (resumo)
```
Fontes de chat (adaptador) ──┐
  Twitch agora; Kick/YouTube depois
                             ├──> Motor do overlay (Canvas) ──> OBS browser source
OBS WebSocket (humores) ─────┘
                 │
                 └──> Supabase Edge Functions ──> skins + seguidor (cache)
```
- **Adaptador de chat:** toda fonte de chat implementa a mesma interface, para que a multistream entre depois sem reescrever o motor.
- **Segurança:** o token da Twitch fica só no Supabase. O overlay chama as Edge Functions com uma chave do overlay passada na URL do OBS, que nunca vai para o repositório.

## Supabase: regras para não estourar o plano gratuito
- A skin é buscada uma vez por viewer por live e guardada em cache local.
- O status de seguidor fica em cache (sessão + tempo configurável).
- Limite de requisições por minuto no próprio overlay, contra loops de bug.
- Nada de Storage nem Realtime. Os sprites ficam no código.
- Se o Supabase estiver fora do ar ou pausado, o overlay continua funcionando com o cache e skins aleatórias.

---

## Etapas (Fase 1)
Cada etapa termina com o "ok" do Thainã.

### Etapa 0: Base do projeto
- Repositório, Vite + TS, estrutura de pastas, `.env.example`, deploy automático no GitHub Pages.
- **Pronto quando:** a URL do Pages abre uma página transparente que carrega no OBS sem erro.

### Etapa 1: Motor de sprites + Laboratório
- Formato das matrizes, molde, paletas, os 2 tipos de corpo, 3 opções iniciais por parte.
- Página Laboratório para combinar as partes e gerar aleatórios.
- **Pronto quando:** o Laboratório mostra combinações bem encaixadas e o Thainã aprova o estilo.

### Etapa 2: Avatares em cena
- Canvas 1920×1080, faixa inferior, animação parada e andando, nome embaixo, balão de fala.
- Painel de teste com chat falso.
- **Pronto quando:** 30 avatares falsos andam lisos e falam, sem travar.

### Etapa 3: Chat real da Twitch
- tmi.js atrás do adaptador de chat; avatar aparece na primeira mensagem; mensagens nos balões.
- Persistência da sessão (as regras 1 e 2 do overlay) e filtro de bots.
- **Pronto quando:** o chat do canal aparece como avatares no OBS do Thainã.

### Etapa 4: Supabase
- Tabela de skins e Edge Functions (`skin`, `seguidor`), token da Twitch, cache e limite de requisições.
- **Pronto quando:** a skin de um viewer persiste entre lives e a verificação de seguidor responde certo.

### Etapa 5: Comandos
- `!pular`, `!cor`, `!aleatorio`, `!parte <parte> <n>`, `!corpo humano|criatura`, `!comandos`, além de `!limpar` para mods. A lista final é confirmada no início da etapa.
- Só para seguidores.
- **Pronto quando:** todos os comandos funcionam no chat real e quem não segue é ignorado.

### Etapa 6: Humores + OBS WebSocket
- Estados de humor (feliz, triste, festa) com animações, ouvindo eventos do OBS WebSocket.
- Botões de teste para disparar cada humor.
- **Pronto quando:** um evento enviado pelo OBS muda o humor de todos os avatares.

### Etapa 7: Entrega no PC da Renata
- Teste de desempenho com o Valorant rodando e guia curto de instalação no OBS dela.
- **Pronto quando:** roda na live dela sem perda de quadros perceptível.

---

## Onde estamos (atualizado em 28/10/2026)

**Etapas 0, 1 e 2 concluídas.** Próxima: Etapa 3 (chat real da Twitch).

### Decisões tomadas no caminho (mudam o que está escrito acima)
- **Molde:** 48×48 em escala 3× (144 px na tela), não 32×32. Chegamos a testar
  64×64 e voltamos: os corpos simples ficaram melhores.
- **Vistas:** cada parte tem duas matrizes, `frente` e `lado`. O lado esquerdo
  é o `lado` espelhado na rasterização — não existe desenho separado.
- **Criaturas:** são 8 e cada uma é um desenho inteiro, não um conjunto de
  partes: gato, cachorro, capivara, galinha, fantasma, zumbi, et e boneco
  assassino. Não têm acessório; só a cor muda.
- **Cor da criatura:** o slot `criatura` pinta o corpo do bicho e do fantasma,
  mas a *roupa* do zumbi e do boneco (a pele deles é fixa). O et é sempre verde.
- **Humanoide:** 2 cabeças, 4 cabelos, 1 tronco, 2 braços, 2 pernas, 6 roupas
  (conjunto com a parte de baixo em jeans), 2 olhos, 3 sobrancelhas, 3 bocas,
  5 acessórios. Cores: 3 de pele, 3 de cabelo, 4 de olhos, 6 de roupa.
- **Ordem das camadas muda por vista:** de frente a roupa cobre o braço (manga
  curta); de perfil o braço fica por cima, porque é o braço mais perto.

### Problemas que apareceram e como foram resolvidos
- Partes viravam um bloco só, sem separar cabeça de corpo → cada camada é
  contornada antes de ser colada nas outras.
- Formas feitas de retângulos empilhados não liam como bicho → passaram a ser
  desenhadas com elipses e polígonos, com contorno gerado automaticamente.
- Olhos com contorno fechado pareciam óculos → viraram esclera, íris, pupila
  e um cílio só em cima.
- Blusa e calça da mesma cor pareciam macacão → a parte de baixo ganhou cor
  própria.
- Acessório preto encostando no contorno abria buraco na silhueta → os
  detalhes escuros ficam afastados da borda.

### Como a caminhada foi resolvida (Etapa 2)
Nenhum desenho novo: a animação desloca as camadas que já existem.
- **Humanoide:** perna, braço e cabeça são partes separadas, então basta
  movê-las. De frente cada perna sobe na sua vez; de perfil a perna vai à
  frente e atrás, e o braço faz o contrário.
- **Criatura:** é um desenho só, então as últimas 10 linhas da matriz (patas,
  pés da galinha, barra do fantasma) são cortadas ao meio e as duas metades
  andam em contrafase.
- Ciclo de 4 quadros, 0,16 s por quadro. `quadro = -1` é o avatar parado.

### Desempenho medido (Etapa 2)
Chrome headless, 1920x1080, medido pelo CDP depois do cache aquecer:
- 30 avatares: 60 fps, ~2,6 ms de CPU por quadro
- 60 avatares (o limite): 60 fps, ~3 a 5 ms por quadro
O primeiro segundo custa mais (até 17 ms) porque é quando os sprites são
rasterizados. Guardar os dois lados no cache estourava o limite e fazia o
overlay re-rasterizar a cada quadro: agora o lado esquerdo é o mesmo sprite
espelhado na hora do `drawImage`.

### Ajustes depois da revisão da Etapa 2 (29/10/2026)
- Na tela o avatar usa escala 2 (96 px). O Laboratório continua em 3×.
- De perfil, a perna de trás é uma cópia mais escura da perna da frente
  (`eco`). As patas das criaturas são cortadas em faixas, uma por pata
  (`passada` em cada criatura). Com as patas na passada, o corpo do bicho
  não balança, porque senão abre uma fresta entre o corpo e a pata.
- A calça tem perna própria de perfil, que acompanha a perna.
- O sprite tem 2 px de folga (`MARGEM`), para a caminhada não cortar o chapéu.
- A boca aberta não é mais opção de skin: só aparece enquanto há balão.
- Nome menor, sem negrito. Balão menor e sempre na mesma altura.

### Editor de partes (volta à Etapa 1, 29/10/2026)
- As partes saíram do código: agora ficam em `src/sprites/dados/humanoide.json`
  e `criatura.json`, com os tipos, as caixas, o slot de cor e o movimento de
  cada tipo. A ordem dos tipos no JSON é a ordem de desenho.
- `editor.html` (só no `npm run dev`, fora do build) desenha e ajusta as
  partes com prévia ao vivo, parado e andando. Também cria partes e tipos
  novos (sapato, objeto na mão...). O botão Salvar grava o JSON pelo
  servidor do Vite; o commit continua manual.
- Cada tipo tem um `movimento`: `corpo`, `perna`, `braco` ou `bicho`. A
  animação segue o movimento, não o nome do tipo. De perfil, tudo que é
  `braco` fica por cima da roupa.
- Skin que não tem um tipo novo usa a parte 0 dele. Por isso tipo novo nasce
  com a parte "nenhum".
- Conferido na migração: 160 bonecos em 20 poses cada saem com os pixels
  idênticos aos de antes.

### O que falta saber antes da Etapa 3
Nada bloqueando. O adaptador de chat entra em `src/main.ts`, chamando
`cena.entrar()` e `avatar.falar()` — a cena já está pronta para receber.

## Fase 2 (não começar antes da Fase 1 terminar)
- Advanced Scene Switcher detectando, em recortes pequenos da tela:
  - o indicador de kill no centro
  - a tela de morte
  - o banner de vitória ou derrota
- As macros disparam só na mudança de estado, enviando eventos ao overlay pelo WebSocket.
- A Renata grava um trecho de partida em 1080p para servir de referência.
- Plano B: HenrikDev API (pós-partida) se a detecção ficar instável.
